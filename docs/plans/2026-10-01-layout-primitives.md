# Layout Primitives Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A lean WordPress plugin that adds a "▦ Layouts" pattern category with 10 very simple layouts. They preview as SVG wireframes and insert as empty blocks in their placeholder state. It uses the Canvas block when active and core blocks otherwise.

**Architecture:** PHP registers one pattern category and one of two pattern sets (Canvas or core) depending on whether `tabor/canvas` is registered. Patterns are plain `.html` block markup files. An `editor.BlockEdit` filter swaps empty leaf blocks for SVG wireframe components when the editor is in preview mode and the block sits inside a root marked `layout-primitive`. Each wireframe calls `useBlockProps()` so Canvas/Columns placement survives.

**Tech Stack:** WordPress 7.1.2, PHP 8.3, `@wordpress/scripts` (build + Jest), `@wp-playground/cli` (local env, no Docker), Playwright (validity check script), Canvas plugin zip from `getdave/wordpress-user-testing`.

**Design doc:** `docs/plans/2026-10-01-layout-primitives-design.md`

---

## Background the implementer needs

- **Canvas** (`tabor/canvas`, [automattic/canvas](https://github.com/Automattic/canvas)) is a grid container. Children store placement in a `canvas` attribute: `{"canvas":{"desktop":{"column":1,"row":1,"columnSpan":9,"rowSpan":2,"gridColumns":18}}}`. Wide sections use `gridColumns: 18`. The container saves `desktopRows`. Tablet/mobile layouts are automatic. Children allowed: heading, paragraph, image, video, buttons, group. Read `AUTHORING.md` in that repo if a placement looks wrong.
- Canvas sets `canvas.fill: true` on newly inserted headings, which scales text to the frame. We set `"fill": false` on our headings so placeholder text uses normal sizing.
- Canvas image shapes are set with `canvas.shape` (for example `"circle"`).
- Canvas applies placement in an `editor.BlockListBlock` filter through `wrapperProps`. Those reach the DOM only through `useBlockProps()` inside the block's edit component. That's why every wireframe must call `useBlockProps()`.
- Canvas's own pattern modal (`src/canvas-patterns.jsx`) lists any pattern whose only root block is `tabor/canvas`, with tabs built from the patterns' categories sorted by label.
- `BlockPreview` (used by every pattern thumbnail) sets the block editor setting `isPreviewMode: true`. Read it with `select( blockEditorStore ).getSettings().isPreviewMode`.
- Core and Canvas sort pattern categories with `label.localeCompare()`. The label `▦ Layouts` sorts first (verified in en, fr, de, ja).
- This repo is **private**, so Playground can't install the plugin from GitHub. Local work uses `@wp-playground/cli` with the plugin directory mounted.

## Canvas layout coordinates (gridColumns 18)

Use these as starting points. Task 9 tunes them visually.

| Layout | Rows | Children (column, row, columnSpan, rowSpan) |
|---|---|---|
| hero | 7 | heading 4,2,12,2 · paragraph 5,4,10,2 · buttons 7,6,6,1 |
| image-text | 8 | image 1,1,9,8 · heading 11,2,8,2 · paragraph 11,4,8,2 · buttons 11,6,5,1 |
| text-image | 8 | heading 1,2,8,2 · paragraph 1,4,8,2 · buttons 1,6,5,1 · image 10,1,9,8 |
| three-columns | 9 | per column at c = 1, 7, 13: image c,1,6,5 · heading c,6,6,1 · paragraph c,7,6,2 |
| three-features | 4 | per column at c = 1, 7, 13: heading c,1,6,1 · paragraph c,2,6,3 |
| quote | 8 | paragraph 3,1,14,3 · image 9,5,2,2 (circle) · paragraph 6,7,8,1 |
| image-overlay | 10 | image 1,1,18,10 · heading 3,4,14,2 · buttons 7,6,6,1 |
| image-grid | 8 | images at c = 1, 7, 13 and r = 1, 5: c,r,6,4 |
| call-to-action | 3 | heading 1,1,12,1 · paragraph 1,2,12,2 · buttons 15,2,4,1 |
| intro | 4 | heading 1,1,7,2 · paragraph 9,1,10,4 |

## Placeholder copy (both sets)

| Slot | `placeholder` |
|---|---|
| Hero heading | Add a headline |
| Hero paragraph | Add a short introduction |
| Section heading | Add a heading |
| Section paragraph | Describe what you offer |
| Column/feature heading | Add a title |
| Column/feature paragraph | Add a short description |
| Quote paragraph | Add a quote |
| Quote name | Add a name and role |
| Button | Add button text |

---

### Task 1: Scaffold the plugin and build

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `layout-primitives.php`
- Create: `src/index.js`
- Create: `src/style.scss`

**Step 1: Create `.gitignore`**

```
node_modules/
build/
.playground/
test-results/
```

**Step 2: Create `package.json`**

```json
{
	"name": "layout-primitives",
	"version": "0.1.0",
	"private": true,
	"description": "Simple wireframe layouts for the block editor.",
	"license": "GPL-2.0-or-later",
	"scripts": {
		"build": "wp-scripts build",
		"start": "wp-scripts start",
		"test": "wp-scripts test-unit-js",
		"lint:js": "wp-scripts lint-js src",
		"env": "node scripts/env.mjs canvas",
		"env:core": "node scripts/env.mjs core",
		"check": "node scripts/check-layouts.mjs"
	}
}
```

Then install exact dev dependencies:

Run: `npm install --save-dev --save-exact @wordpress/scripts@35.0.0 @wp-playground/cli@3.1.34 playwright`
Then: `npx playwright install chromium`

**Step 3: Create placeholder `src/index.js` and `src/style.scss`**

`src/index.js`:

```js
import './style.scss';
```

`src/style.scss`:

```scss
// Wireframe styles. Loaded in the editor and in pattern preview iframes.
```

**Step 4: Create `layout-primitives.php`**

```php
<?php
/**
 * Plugin Name:       Layout Primitives
 * Description:       Simple wireframe layouts in a Layouts pattern category. Uses Canvas when it's active and core blocks otherwise.
 * Version:           0.1.0
 * Requires at least: 7.1
 * Requires PHP:      8.3
 * Author:            Dave Smith
 * License:           GPL-2.0-or-later
 * Text Domain:       layout-primitives
 *
 * @package LayoutPrimitives
 */

namespace LayoutPrimitives;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue the editor script that renders wireframes in pattern previews.
 */
function enqueue_editor_assets() {
	$asset_file = __DIR__ . '/build/index.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}
	$asset = require $asset_file;
	wp_enqueue_script(
		'layout-primitives-editor',
		plugins_url( 'build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		true
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_editor_assets' );

/**
 * Enqueue wireframe styles. Using enqueue_block_assets gets them into
 * the editor canvas iframe and the pattern preview iframes.
 */
function enqueue_block_assets() {
	if ( ! is_admin() || ! file_exists( __DIR__ . '/build/style-index.css' ) ) {
		return;
	}
	wp_enqueue_style(
		'layout-primitives',
		plugins_url( 'build/style-index.css', __FILE__ ),
		array(),
		filemtime( __DIR__ . '/build/style-index.css' )
	);
}
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\enqueue_block_assets' );
```

**Step 5: Build**

Run: `npm run build`
Expected: `build/index.js`, `build/index.asset.php` and `build/style-index.css` exist. Check with `ls build`. If the SCSS import outputs `build/index.css` instead of `style-index.css`, rename `src/style.scss` to match the `@wordpress/scripts` convention (`style.scss` imported from the entry produces `style-index.css`).

**Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json layout-primitives.php src/
git commit -m "Scaffold Layout Primitives plugin"
```

---

### Task 2: Local Playground environments (with and without Canvas)

**Files:**
- Create: `dev/blueprint-canvas.json`
- Create: `dev/blueprint-core.json`
- Create: `scripts/env.mjs`

**Step 1: Create `dev/blueprint-canvas.json`**

```json
{
	"$schema": "https://playground.wordpress.net/blueprint-schema.json",
	"landingPage": "/wp-admin/post-new.php?post_type=page",
	"preferredVersions": { "php": "8.3", "wp": "7.1.2" },
	"features": { "networking": true },
	"login": true,
	"steps": [
		{
			"step": "installTheme",
			"themeData": { "resource": "wordpress.org/themes", "slug": "twentytwentyfive" },
			"options": { "activate": true }
		},
		{
			"step": "installPlugin",
			"pluginData": {
				"resource": "url",
				"url": "https://raw.githubusercontent.com/getdave/wordpress-user-testing/trunk/canvas-block/canvas.zip"
			},
			"options": { "activate": true }
		},
		{ "step": "activatePlugin", "pluginPath": "layout-primitives/layout-primitives.php" }
	]
}
```

**Step 2: Create `dev/blueprint-core.json`**

Same file with the `installPlugin` step for Canvas removed.

**Step 3: Create `scripts/env.mjs`**

```js
// Starts a local Playground with this plugin mounted.
// Usage: node scripts/env.mjs canvas|core
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath( new URL( '../', import.meta.url ) );
const mode = process.argv[ 2 ] === 'core' ? 'core' : 'canvas';
const port = mode === 'core' ? 9401 : 9400;

const server = spawn(
	process.execPath,
	[
		path.join( root, 'node_modules/@wp-playground/cli/cli.js' ),
		'server',
		`--port=${ port }`,
		'--login',
		`--blueprint=${ path.join( root, `dev/blueprint-${ mode }.json` ) }`,
		`--mount=${ root }:/wordpress/wp-content/plugins/layout-primitives`,
	],
	{ cwd: root, stdio: 'inherit' }
);
server.on( 'exit', ( code ) => process.exit( code ?? 0 ) );
```

**Step 4: Start both environments and check them**

Run (background): `npm run env` and `npm run env:core`
Expected: servers on `http://127.0.0.1:9400` and `http://127.0.0.1:9401`.

Open `http://127.0.0.1:9400/wp-admin/plugins.php`. Expected: Canvas and Layout Primitives both active.
Open `http://127.0.0.1:9401/wp-admin/plugins.php`. Expected: Layout Primitives active, no Canvas.

If `--mount` puts the plugin in place after the blueprint's `activatePlugin` step runs, switch to `--mount-before-install`.

**Step 5: Commit**

```bash
git add dev/ scripts/env.mjs
git commit -m "Add local Playground environments with and without Canvas"
```

---

### Task 3: Register the category and the Hero pattern in both sets

**Files:**
- Modify: `layout-primitives.php` (append)
- Create: `patterns/canvas/hero.html`
- Create: `patterns/core/hero.html`

**Step 1: Create `patterns/canvas/hero.html`**

```html
<!-- wp:tabor/canvas {"align":"wide","desktopRows":7,"className":"layout-primitive"} -->
<!-- wp:heading {"textAlign":"center","placeholder":"Add a headline","level":1,"canvas":{"fill":false,"desktop":{"column":4,"row":2,"columnSpan":12,"rowSpan":2,"gridColumns":18}}} -->
<h1 class="wp-block-heading has-text-align-center"></h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center","placeholder":"Add a short introduction","canvas":{"desktop":{"column":5,"row":4,"columnSpan":10,"rowSpan":2,"gridColumns":18}}} -->
<p class="has-text-align-center"></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"},"canvas":{"desktop":{"column":7,"row":6,"columnSpan":6,"rowSpan":1,"gridColumns":18}}} -->
<div class="wp-block-buttons"><!-- wp:button {"placeholder":"Add button text"} -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button"></a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
<!-- /wp:tabor/canvas -->
```

**Text alignment note.** WordPress 7.1 may store alignment as `style.typography.textAlign` instead of `textAlign`/`align`. The validity check in Task 4 decides. If blocks come back invalid, insert the same block in the editor, set it up by hand, and copy the markup from the Code editor.

**Step 2: Create `patterns/core/hero.html`**

```html
<!-- wp:group {"align":"wide","className":"layout-primitive","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide layout-primitive"><!-- wp:heading {"textAlign":"center","placeholder":"Add a headline","level":1} -->
<h1 class="wp-block-heading has-text-align-center"></h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center","placeholder":"Add a short introduction"} -->
<p class="has-text-align-center"></p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"placeholder":"Add button text"} -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button"></a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->
```

**Step 3: Append registration to `layout-primitives.php`**

```php
/**
 * Layout slugs and titles, in display order.
 *
 * @return array<string, string>
 */
function layouts() {
	return array(
		'hero'           => __( 'Hero', 'layout-primitives' ),
		'image-text'     => __( 'Image left, text right', 'layout-primitives' ),
		'text-image'     => __( 'Text left, image right', 'layout-primitives' ),
		'three-columns'  => __( 'Three columns with images', 'layout-primitives' ),
		'three-features' => __( 'Three features', 'layout-primitives' ),
		'quote'          => __( 'Quote', 'layout-primitives' ),
		'image-overlay'  => __( 'Image with heading over it', 'layout-primitives' ),
		'image-grid'     => __( 'Image grid', 'layout-primitives' ),
		'call-to-action' => __( 'Call to action banner', 'layout-primitives' ),
		'intro'          => __( 'Intro', 'layout-primitives' ),
	);
}

/**
 * Which pattern set to register: Canvas when its block exists, core otherwise.
 *
 * @return string 'canvas' or 'core'.
 */
function pattern_set() {
	return \WP_Block_Type_Registry::get_instance()->is_registered( 'tabor/canvas' ) ? 'canvas' : 'core';
}

/**
 * Register the Layouts category and the active pattern set.
 * Runs after Canvas registers its block on init (priority 10).
 */
function register_patterns() {
	// The leading symbol sorts the category first in label-sorted pickers.
	register_block_pattern_category(
		'layout-primitives',
		array(
			'label'       => __( '▦ Layouts', 'layout-primitives' ),
			'description' => __( 'Simple starting layouts to fill with your own content.', 'layout-primitives' ),
		)
	);

	$set = pattern_set();
	foreach ( layouts() as $slug => $title ) {
		$file = __DIR__ . "/patterns/{$set}/{$slug}.html";
		if ( ! file_exists( $file ) ) {
			continue;
		}
		register_block_pattern(
			"layout-primitives/{$slug}",
			array(
				'title'         => $title,
				'categories'    => array( 'layout-primitives' ),
				'keywords'      => array( 'layout', 'wireframe' ),
				'viewportWidth' => 1200,
				'content'       => file_get_contents( $file ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			)
		);
	}
}
add_action( 'init', __NAMESPACE__ . '\\register_patterns', 20 );
```

The `file_exists` guard lets us ship layouts one at a time.

**Step 4: Check in the browser**

Reload `http://127.0.0.1:9400/wp-admin/post-new.php?post_type=page`. Open the inserter, then Patterns. Expected: `▦ Layouts` straight after "All", containing "Hero". Add an empty Canvas block, click "Add pattern". Expected: a `▦ Layouts` tab with "Hero".

Repeat on port 9401. Expected: `▦ Layouts` with "Hero", the Group version.

Previews still show real editor UI at this point. Wireframes come in Task 6.

**Step 5: Commit**

```bash
git add layout-primitives.php patterns/
git commit -m "Register Layouts category and Hero pattern for Canvas and core"
```

---

### Task 4: Validity check script

**Files:**
- Create: `scripts/check-layouts.mjs`

**Step 1: Write the script**

```js
// Inserts every Layouts pattern into a new page, saves, reloads and checks
// that each block is valid and that the expected set is registered.
// Usage: node scripts/check-layouts.mjs [canvas|core]
import { chromium } from 'playwright';

const mode = process.argv[ 2 ] === 'core' ? 'core' : 'canvas';
const base = `http://127.0.0.1:${ mode === 'core' ? 9401 : 9400 }`;
const EXPECTED_COUNT = Number( process.env.EXPECTED_COUNT ?? 10 );

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on( 'console', ( msg ) => msg.type() === 'error' && errors.push( msg.text() ) );

await page.goto( `${ base }/wp-admin/post-new.php?post_type=page` );
await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' ) );

const result = await page.evaluate( async ( expectedRoot ) => {
	const { select, dispatch } = window.wp.data;
	dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false );
	const patterns = select( 'core/block-editor' )
		.__experimentalGetAllowedPatterns()
		.filter( ( p ) => p.categories?.includes( 'layout-primitives' ) );
	const roots = patterns.map( ( p ) => ( { name: p.name, root: p.blocks[ 0 ]?.name } ) );
	const wrongRoot = roots.filter( ( r ) => r.root !== expectedRoot );
	for ( const p of patterns ) {
		dispatch( 'core/block-editor' ).insertBlocks(
			p.blocks.map( ( b ) => window.wp.blocks.cloneBlock( b ) )
		);
	}
	dispatch( 'core/editor' ).editPost( { title: 'Layouts check' } );
	await dispatch( 'core/editor' ).savePost();
	return { count: patterns.length, wrongRoot, id: select( 'core/editor' ).getCurrentPostId() };
}, mode === 'core' ? null : 'tabor/canvas' );

// Core set roots vary (group, columns, cover); only check for Canvas leakage.
if ( mode === 'core' ) {
	result.wrongRoot = result.wrongRoot.filter( ( r ) => r.root === 'tabor/canvas' );
}

await page.goto( `${ base }/wp-admin/post.php?post=${ result.id }&action=edit` );
await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' )?.getBlocks().length > 0 );

const invalid = await page.evaluate( () => {
	const out = [];
	const walk = ( blocks ) =>
		blocks.forEach( ( b ) => {
			if ( ! b.isValid ) out.push( b.name );
			walk( b.innerBlocks );
		} );
	walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
	return out;
} );

await browser.close();

const problems = [];
if ( result.count !== EXPECTED_COUNT ) problems.push( `Expected ${ EXPECTED_COUNT } layouts, found ${ result.count }` );
if ( result.wrongRoot.length ) problems.push( `Wrong root block: ${ JSON.stringify( result.wrongRoot ) }` );
if ( invalid.length ) problems.push( `Invalid blocks after reload: ${ invalid.join( ', ' ) }` );
if ( errors.length ) problems.push( `Console errors:\n  ${ errors.join( '\n  ' ) }` );

if ( problems.length ) {
	console.error( `✗ ${ mode }\n${ problems.join( '\n' ) }` );
	process.exit( 1 );
}
console.log( `✓ ${ mode }: ${ result.count } layouts, all blocks valid` );
```

**Step 2: Run it against the full count to see it fail**

Run: `npm run check -- canvas`
Expected: FAIL with `Expected 10 layouts, found 1`.

**Step 3: Run it against the current count**

Run: `EXPECTED_COUNT=1 npm run check -- canvas && EXPECTED_COUNT=1 npm run check -- core`
Expected: `✓ canvas: 1 layouts, all blocks valid` and `✓ core: 1 layouts, all blocks valid`.

If either reports invalid blocks, fix the Hero markup (see the alignment note in Task 3) and run again until both pass.

**Step 4: Commit**

```bash
git add scripts/check-layouts.mjs patterns/
git commit -m "Add pattern validity check script"
```

---

### Task 5: Wireframe decision logic (TDD)

**Files:**
- Create: `src/should-wireframe.js`
- Test: `src/test/should-wireframe.test.js`

**Step 1: Write the failing tests**

```js
import { shouldWireframe, isEmptyBlock, MARKER } from '../should-wireframe';

const inLayout = [ 'something-else', `foo ${ MARKER }` ];

describe( 'isEmptyBlock', () => {
	it( 'treats text blocks with no content as empty', () => {
		expect( isEmptyBlock( 'core/heading', {} ) ).toBe( true );
		expect( isEmptyBlock( 'core/paragraph', { content: '' } ) ).toBe( true );
		expect( isEmptyBlock( 'core/button', { content: '  ' } ) ).toBe( true );
	} );
	it( 'treats text blocks with content as filled', () => {
		expect( isEmptyBlock( 'core/heading', { content: 'Hi' } ) ).toBe( false );
	} );
	it( 'handles RichTextData-like content objects', () => {
		expect( isEmptyBlock( 'core/paragraph', { content: { toString: () => '' } } ) ).toBe( true );
		expect( isEmptyBlock( 'core/paragraph', { content: { toString: () => 'x' } } ) ).toBe( false );
	} );
	it( 'treats media blocks without a url as empty', () => {
		expect( isEmptyBlock( 'core/image', {} ) ).toBe( true );
		expect( isEmptyBlock( 'core/cover', { url: 'a.jpg' } ) ).toBe( false );
	} );
	it( 'returns false for unsupported blocks', () => {
		expect( isEmptyBlock( 'core/list', {} ) ).toBe( false );
	} );
} );

describe( 'shouldWireframe', () => {
	const base = {
		name: 'core/heading',
		attributes: {},
		isPreviewMode: true,
		ancestorClassNames: inLayout,
	};
	it( 'is true for an empty supported block in a layout preview', () => {
		expect( shouldWireframe( base ) ).toBe( true );
	} );
	it( 'is false outside preview mode', () => {
		expect( shouldWireframe( { ...base, isPreviewMode: false } ) ).toBe( false );
	} );
	it( 'is false when the block has content', () => {
		expect( shouldWireframe( { ...base, attributes: { content: 'Hi' } } ) ).toBe( false );
	} );
	it( 'is false when no ancestor has the marker class', () => {
		expect( shouldWireframe( { ...base, ancestorClassNames: [ 'x', undefined ] } ) ).toBe( false );
	} );
	it( 'does not match marker substrings', () => {
		expect( shouldWireframe( { ...base, ancestorClassNames: [ `${ MARKER }-x` ] } ) ).toBe( false );
	} );
} );
```

**Step 2: Run to verify failure**

Run: `npm test -- src/test/should-wireframe.test.js`
Expected: FAIL, `Cannot find module '../should-wireframe'`.

**Step 3: Implement `src/should-wireframe.js`**

```js
export const MARKER = 'layout-primitive';

const TEXT_BLOCKS = [ 'core/heading', 'core/paragraph', 'core/button' ];
const MEDIA_BLOCKS = [ 'core/image', 'core/cover' ];

export const WIREFRAME_BLOCKS = [ ...TEXT_BLOCKS, ...MEDIA_BLOCKS ];

export function isEmptyBlock( name, attributes = {} ) {
	if ( TEXT_BLOCKS.includes( name ) ) {
		return ! String( attributes.content ?? '' ).trim();
	}
	if ( MEDIA_BLOCKS.includes( name ) ) {
		return ! attributes.url;
	}
	return false;
}

export function shouldWireframe( {
	name,
	attributes,
	isPreviewMode,
	ancestorClassNames,
} ) {
	if ( ! isPreviewMode || ! isEmptyBlock( name, attributes ) ) {
		return false;
	}
	return ancestorClassNames.some( ( className ) =>
		( className ?? '' ).split( /\s+/ ).includes( MARKER )
	);
}
```

**Step 4: Run to verify pass**

Run: `npm test -- src/test/should-wireframe.test.js`
Expected: PASS, 10 tests.

**Step 5: Commit**

```bash
git add src/should-wireframe.js src/test/
git commit -m "Add wireframe decision logic"
```

---

### Task 6: Spike, text wireframes in the Hero preview

This is the risk gate from the design. **If Canvas loses positions or collapses rows with wireframes in place, stop and report back before Task 7.**

**Files:**
- Create: `src/wireframes/heading.js`
- Create: `src/wireframes/paragraph.js`
- Create: `src/wireframes/button.js`
- Create: `src/wireframes/index.js`
- Modify: `src/index.js`
- Modify: `src/style.scss`

**Step 1: `src/wireframes/heading.js`**

```js
import { useBlockProps } from '@wordpress/block-editor';

const HEIGHTS = { 1: 40, 2: 32, 3: 24 };

export default function HeadingWireframe( { attributes } ) {
	const height = HEIGHTS[ attributes.level ] ?? 18;
	const centred = textAlign( attributes ) === 'center';
	const blockProps = useBlockProps( {
		className: 'lp-wireframe lp-wireframe--heading',
		'aria-hidden': true,
	} );
	return (
		<div { ...blockProps }>
			<svg width="100%" height={ height }>
				<rect x={ centred ? '15%' : 0 } width="70%" height={ height } rx={ height / 4 } />
			</svg>
		</div>
	);
}

export function textAlign( attributes ) {
	return (
		attributes.style?.typography?.textAlign ??
		attributes.textAlign ??
		attributes.align
	);
}
```

**Step 2: `src/wireframes/paragraph.js`**

```js
import { useBlockProps } from '@wordpress/block-editor';
import { textAlign } from './heading';

const LINE = 10;
const GAP = 10;
const WIDTHS = [ 100, 100, 60 ];

export default function ParagraphWireframe( { attributes } ) {
	const centred = textAlign( attributes ) === 'center';
	const blockProps = useBlockProps( {
		className: 'lp-wireframe lp-wireframe--paragraph',
		'aria-hidden': true,
	} );
	return (
		<div { ...blockProps }>
			<svg width="100%" height={ WIDTHS.length * ( LINE + GAP ) - GAP }>
				{ WIDTHS.map( ( width, i ) => (
					<rect
						key={ i }
						x={ centred ? `${ ( 100 - width ) / 2 }%` : 0 }
						y={ i * ( LINE + GAP ) }
						width={ `${ width }%` }
						height={ LINE }
						rx={ LINE / 2 }
					/>
				) ) }
			</svg>
		</div>
	);
}
```

**Step 3: `src/wireframes/button.js`**

```js
import { useBlockProps } from '@wordpress/block-editor';

export default function ButtonWireframe() {
	const blockProps = useBlockProps( {
		className: 'lp-wireframe lp-wireframe--button',
		'aria-hidden': true,
	} );
	return (
		<div { ...blockProps }>
			<svg width="120" height="40" viewBox="0 0 120 40">
				<rect className="lp-wireframe__outline" x="1" y="1" width="118" height="38" rx="19" />
				<rect x="35" y="16" width="50" height="8" rx="4" />
			</svg>
		</div>
	);
}
```

**Step 4: `src/wireframes/index.js`**

```js
import HeadingWireframe from './heading';
import ParagraphWireframe from './paragraph';
import ButtonWireframe from './button';

export default {
	'core/heading': HeadingWireframe,
	'core/paragraph': ParagraphWireframe,
	'core/button': ButtonWireframe,
};
```

**Step 5: Replace `src/index.js`**

```js
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

import { shouldWireframe } from './should-wireframe';
import WIREFRAMES from './wireframes';
import './style.scss';

const withWireframe = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		const { name, clientId, attributes } = props;
		const Wireframe = WIREFRAMES[ name ];
		const show = useSelect(
			( select ) => {
				if ( ! Wireframe ) {
					return false;
				}
				const { getSettings, getBlockParents, getBlockAttributes } =
					select( blockEditorStore );
				return shouldWireframe( {
					name,
					attributes,
					isPreviewMode: !! getSettings().isPreviewMode,
					ancestorClassNames: getBlockParents( clientId ).map(
						( id ) => getBlockAttributes( id )?.className
					),
				} );
			},
			[ Wireframe, name, clientId, attributes ]
		);
		return show ? <Wireframe { ...props } /> : <BlockEdit { ...props } />;
	},
	'withLayoutPrimitivesWireframe'
);

addFilter( 'editor.BlockEdit', 'layout-primitives/wireframe', withWireframe );
```

**Step 6: `src/style.scss`**

```scss
// Wireframe styles. Loaded in the editor and in pattern preview iframes.
.lp-wireframe {
	color: inherit;

	svg {
		display: block;
		overflow: visible;
	}

	rect,
	ellipse,
	path {
		fill: currentColor;
		fill-opacity: 0.18;
	}

	.lp-wireframe__outline {
		fill: none;
		stroke: currentColor;
		stroke-opacity: 0.35;
		stroke-width: 2;
	}
}

.lp-wireframe--heading,
.lp-wireframe--paragraph {
	width: 100%;
}

// Inside Canvas, wireframes fill their grid frame.
.canvas__item.lp-wireframe {
	height: 100%;
}
```

**Step 7: Build and check the preview**

Run: `npm run build`

On port 9400, open the inserter, go to Patterns, then `▦ Layouts`. Expected: Hero shows a thick centred bar, three centred lines and an outlined pill, positioned like the real layout. Then add an empty Canvas, click "Add pattern" and check the `▦ Layouts` tab. Expected: the same.

Insert Hero. Expected: the canvas shows real empty blocks with "Add a headline", "Add a short introduction" and "Add button text" placeholders, not wireframes.

Repeat on port 9401 (core). Save screenshots to `.context/spike-canvas.png` and `.context/spike-core.png`.

**Step 8: Re-run the check**

Run: `EXPECTED_COUNT=1 npm run check -- canvas && EXPECTED_COUNT=1 npm run check -- core`
Expected: both pass.

**Step 9: Commit**

```bash
git add src/
git commit -m "Render heading, paragraph and button wireframes in layout previews"
```

---

### Task 7: Image and cover wireframes

**Files:**
- Create: `src/wireframes/image.js`
- Create: `src/wireframes/cover.js`
- Modify: `src/wireframes/index.js`
- Modify: `src/style.scss`

**Step 1: `src/wireframes/image.js`**

```js
import { useBlockProps } from '@wordpress/block-editor';

export function ImageIcon() {
	// Mountain and sun, centred on the parent SVG.
	return (
		<svg x="50%" y="50%" overflow="visible" className="lp-wireframe__icon">
			<g transform="translate(-16 -12)">
				<circle cx="8" cy="6" r="3" />
				<path d="M0 24 L10 12 L16 18 L22 10 L32 24 Z" />
			</g>
		</svg>
	);
}

export default function ImageWireframe( { attributes } ) {
	const round =
		attributes.canvas?.shape === 'circle' ||
		( attributes.className ?? '' ).split( /\s+/ ).includes( 'is-style-rounded' );
	const blockProps = useBlockProps( {
		className: `lp-wireframe lp-wireframe--image${ round ? ' is-round' : '' }`,
		'aria-hidden': true,
	} );
	return (
		<div { ...blockProps }>
			<svg width="100%" height="100%">
				{ round ? (
					<ellipse cx="50%" cy="50%" rx="50%" ry="50%" />
				) : (
					<rect width="100%" height="100%" rx="4" />
				) }
				<ImageIcon />
			</svg>
		</div>
	);
}
```

**Step 2: `src/wireframes/cover.js`**

```js
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { ImageIcon } from './image';

export default function CoverWireframe() {
	const blockProps = useBlockProps( {
		className: 'lp-wireframe lp-wireframe--cover',
	} );
	const innerBlocksProps = useInnerBlocksProps( {
		className: 'lp-wireframe__cover-inner',
	} );
	return (
		<div { ...blockProps }>
			<svg className="lp-wireframe__cover-bg" width="100%" height="100%" aria-hidden>
				<rect width="100%" height="100%" rx="4" />
				<ImageIcon />
			</svg>
			<div { ...innerBlocksProps } />
		</div>
	);
}
```

**Step 3: Register them in `src/wireframes/index.js`**

Add the imports and entries:

```js
import ImageWireframe from './image';
import CoverWireframe from './cover';
// …
	'core/image': ImageWireframe,
	'core/cover': CoverWireframe,
```

**Step 4: Append styles to `src/style.scss`**

```scss
.lp-wireframe--image {
	aspect-ratio: 4 / 3;
	width: 100%;

	&.is-round {
		aspect-ratio: 1;
	}

	.lp-wireframe__icon {
		fill-opacity: 0.35;
	}
}

.canvas__item.lp-wireframe--image {
	aspect-ratio: auto;
}

.lp-wireframe--cover {
	position: relative;
	min-height: 360px;
	display: flex;
	align-items: center;
	justify-content: center;

	.lp-wireframe__cover-bg {
		position: absolute;
		inset: 0;
	}

	.lp-wireframe__cover-inner {
		position: relative;
		width: 100%;
		padding: 2rem;
	}
}
```

**Step 5: Build**

Run: `npm run build && npm test`
Expected: build succeeds, tests pass. Images are checked visually in Task 9 once layouts that use them exist.

**Step 6: Commit**

```bash
git add src/
git commit -m "Add image and cover wireframes"
```

---

### Task 8: Remaining nine Canvas layouts

**Files:**
- Create: `patterns/canvas/{image-text,text-image,three-columns,three-features,quote,image-overlay,image-grid,call-to-action,intro}.html`

**Step 1: Write each file** using the coordinate table and placeholder copy above. Every file follows the Hero shape:

- Root: `<!-- wp:tabor/canvas {"align":"wide","desktopRows":N,"className":"layout-primitive"} -->`
- Headings: `"level":2` for section headings, `"level":3` for column and feature titles, always `"canvas":{"fill":false,…}`.
- Empty image (copy exactly):

```html
<!-- wp:image {"sizeSlug":"large","linkDestination":"none","canvas":{"desktop":{"column":1,"row":1,"columnSpan":9,"rowSpan":8,"gridColumns":18}}} -->
<figure class="wp-block-image size-large"><img alt=""/></figure>
<!-- /wp:image -->
```

- Quote photo: add `"shape":"circle"` inside the image's `canvas` object.
- Quote text: `"fontSize":"x-large"` and centred. The name paragraph uses `"fontSize":"small"` and is centred.
- Image overlay: image first so later siblings paint on top. Headline and button are centred.
- Call to action: buttons use `"layout":{"type":"flex","justifyContent":"right"}`.

**Step 2: Run the check**

Run: `npm run check -- canvas`
Expected: `✓ canvas: 10 layouts, all blocks valid`. If the image markup is invalid, insert an empty Image block in the editor, copy its markup from the Code editor and use that in every file.

**Step 3: Commit**

```bash
git add patterns/canvas/
git commit -m "Add remaining Canvas layouts"
```

---

### Task 9: Visual tuning of the Canvas set

**Step 1:** On port 9400, open Canvas's "Add pattern" modal, then `▦ Layouts`. Screenshot to `.context/canvas-picker.png`.

**Step 2:** For each layout, check that the wireframe reads as the intended shape at a glance. Look for even gutters, nothing overlapping by accident, images reading as images, and circle images as circles. Adjust coordinates or `desktopRows` in the pattern file. Re-run `npm run check -- canvas` after edits.

**Step 3:** Insert all 10 into a page. Screenshot to `.context/canvas-inserted.png`. Check that placeholder text isn't clipped by its frame. If it is, increase `rowSpan`.

**Step 4: Commit**

```bash
git add patterns/canvas/
git commit -m "Tune Canvas layout coordinates"
```

---

### Task 10: Remaining nine core layouts

**Files:**
- Create: `patterns/core/{image-text,text-image,three-columns,three-features,quote,image-overlay,image-grid,call-to-action,intro}.html`

**Step 1: Write each file.** Every root has `"align":"wide"` and `"className":"layout-primitive"` (and the class in the saved HTML).

| Layout | Structure |
|---|---|
| image-text | `core/columns` `{"verticalAlignment":"center"}`: column (image) + column (heading h2, paragraph, buttons) |
| text-image | Mirror of image-text |
| three-columns | `core/columns`: 3 × column (image, heading h3, paragraph) |
| three-features | `core/columns`: 3 × column (heading h3, paragraph) |
| quote | `core/group` constrained: paragraph (x-large, centred), image `{"className":"is-style-rounded","width":"80px","align":"center"}`, paragraph (small, centred) |
| image-overlay | `core/cover` `{"dimRatio":50,"minHeight":480}` with no `url`, inner heading h2 (centred) and buttons (centred) |
| image-grid | `core/group` `{"layout":{"type":"grid","columnCount":3}}`: 6 images |
| call-to-action | `core/columns` `{"verticalAlignment":"center"}`: column 66.66% (heading h2, paragraph) + column 33.33% (buttons, justify right) |
| intro | `core/columns`: column 40% (heading h2) + column 60% (paragraph) |

To get valid markup for Columns, Cover and the grid Group, build each container once in the editor on port 9401 and copy its markup from the Code editor. Then add the class and placeholders and clear any content.

**Step 2: Run the check**

Run: `npm run check -- core`
Expected: `✓ core: 10 layouts, all blocks valid`.

**Step 3: Visual check.** Patterns tab, then `▦ Layouts`, on port 9401. Screenshot to `.context/core-picker.png`. Insert all 10 and screenshot to `.context/core-inserted.png`. Confirm the Cover wireframe shows its heading and button bars on top of the tinted box.

**Step 4: Commit**

```bash
git add patterns/core/
git commit -m "Add remaining core layouts"
```

---

### Task 11: Audit and fix weak placeholder states on the canvas

**Step 1:** Using the `*-inserted.png` screenshots, list every slot whose empty state is unclear or cramped. Likely candidates are image placeholders in three columns, the six-image grid, the 80px quote photo in core, and the core Cover placeholder hiding its children.

**Step 2:** Fix each one with CSS in `src/style.scss` scoped to `.layout-primitive` (for example hiding the placeholder's instruction text and buttons below a certain width so only the icon shows). If CSS can't do it, use a small `editor.BlockEdit` filter in this plugin. Don't patch core or Canvas. Note anything left unfixed for the summary.

**Step 3:** Run `npm run build && npm test && npm run check -- canvas && npm run check -- core`. Expected: all pass.

**Step 4: Commit**

```bash
git add src/
git commit -m "Improve empty states for layout blocks on the canvas"
```

---

### Task 12: Switching check, README and share blueprints

**Files:**
- Create: `README.md`
- Create: `blueprint.json`
- Create: `blueprint-core.json`

**Step 1: Switching.** On port 9400, deactivate Canvas, reload the editor and open `▦ Layouts`. Expected: the core set, no console errors. Reactivate Canvas. Expected: the Canvas set.

**Step 2: README.** Cover what the plugin does, how sets are chosen, `npm run env` / `env:core` / `check`, and known gaps (empty heading and paragraph tags on the front end, Cover needs an image before its children appear).

**Step 3: Share blueprints.** Copy `dev/blueprint-canvas.json` and `dev/blueprint-core.json` to the repo root. Replace the `activatePlugin` step with an `installPlugin` step pointing at a built plugin zip URL. **Stop and ask Dave where to host the zip.** This repo is private, so Playground can't fetch from it. Options are making the repo public or adding the zip to `getdave/wordpress-user-testing` next to `canvas.zip`. Don't publish anything without confirmation.

**Step 4: Commit**

```bash
git add README.md blueprint.json blueprint-core.json
git commit -m "Add README and share blueprints"
```

---

### Task 13: Final verification

Run all of these and paste the output into the summary:

```bash
npm run build
npm test
npm run check -- canvas
npm run check -- core
```

Expected: build succeeds, Jest passes, both checks show `10 layouts, all blocks valid`. Use @superpowers:verification-before-completion before claiming done. Embed the four `.context/*.png` screenshots in the final message.
