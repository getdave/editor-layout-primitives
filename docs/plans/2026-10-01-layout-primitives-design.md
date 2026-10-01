# Layout Primitives: design

Date: 1 October 2026

## Problem

In Canvas user testing, the patterns people choose from are too designed. Core, theme and Canvas patterns come with stock photos, fonts, colours and copy, so people judge the content instead of the shape of the section.

What people want is a small set of plain layout primitives, like three columns with images, or image on the left and text on the right. They want to see each one as a wireframe, insert it, and fill in their own content.

## Goals

- A "Layouts" category with 10 very simple layouts, shown first in the Patterns tab and in Canvas's pattern modal.
- Previews show wireframes (SVG shapes per block), not real content.
- Inserted layouts show empty blocks in their native placeholder state, ready to fill in.
- Works with Canvas (`tabor/canvas`) active, and without it using core blocks.

## Non-goals

- No colours, fonts, spacing or backgrounds in the layouts. The theme decides.
- No changes to Canvas or core.
- No settings screen.
- No hiding of other pattern categories.

## Layouts

| # | Title | Blocks | Canvas set | Core set |
|---|---|---|---|---|
| 1 | Hero | Centred heading, paragraph, button | Canvas | Group (centred) |
| 2 | Image left, text right | Image, then heading, paragraph, button | Canvas | Columns |
| 3 | Text left, image right | Mirror of 2 | Canvas | Columns |
| 4 | Three columns with images | 3 × (image, heading, paragraph) | Canvas | Columns |
| 5 | Three features | 3 × (heading, paragraph) | Canvas | Columns |
| 6 | Quote | Large paragraph, circle image, name paragraph | Canvas | Group (centred) |
| 7 | Image with heading over it | Full-width image, heading and button on top | Canvas (overlapping children) | Cover |
| 8 | Image grid | 6 images, 3 × 2 | Canvas | Group, grid layout, 3 columns |
| 9 | Call to action banner | Heading and paragraph left, button right | Canvas | Columns |
| 10 | Intro | Heading left, paragraph right | Canvas | Columns |

Both sets use the same leaf blocks, which are `core/heading`, `core/paragraph`, `core/image`, `core/buttons` + `core/button`. Canvas has no Quote block support, so the quote layout uses a large paragraph in both sets.

Every leaf block is empty and has a `placeholder` hint written for its slot (for example "Add a heading", "Describe what you offer", "Add button text"). Images have no URL. The quote photo uses Canvas's circle shape in the Canvas set and the rounded style in the core set.

## Architecture

### Plugin

```
layout-primitives.php      Header, category + pattern registration
patterns/canvas/*.php      10 Canvas layouts
patterns/core/*.php        10 core layouts
src/index.js               editor.BlockEdit wireframe filter
src/wireframes/*.js        Heading, paragraph, image, button, cover
src/style.scss             Wireframe and placeholder styles
build/                     @wordpress/scripts output
blueprint.json             Playground, with Canvas
blueprint-core.json        Playground, without Canvas
```

No `Requires Plugins` header. Canvas is optional.

### Registration

On `init` at priority 20 (after Canvas registers its block):

1. Register the category `layout-primitives` with the label `▦ Layouts`. Both the core inserter and Canvas's modal sort categories by `label.localeCompare()`. The leading symbol sorts ahead of letters and digits in en, fr, de and ja, so Layouts sits straight after "All" (and "My patterns").
2. If `WP_Block_Type_Registry::get_instance()->is_registered( 'tabor/canvas' )`, register the 10 Canvas patterns. Otherwise register the 10 core patterns. Both sets use the same pattern titles.

Every layout's root block has the class `layout-primitive`.

Canvas's modal (`src/canvas-patterns.jsx` in Canvas) lists any allowed pattern whose only root block is `tabor/canvas` and builds its tabs from the patterns' categories. So the Canvas set shows up there with no Canvas changes.

### Wireframe previews

An `editor.BlockEdit` filter wraps `core/heading`, `core/paragraph`, `core/image`, `core/button` and `core/cover`. It renders a wireframe instead of the normal edit UI when all of these are true:

1. Preview mode: block editor settings have `isPreviewMode` (set by `BlockPreview`, which both pickers use).
2. The block is empty: no `content` for text blocks, no `url` for image and cover.
3. A parent block has the `layout-primitive` class.

Rule 2 means filled-in layouts preview as real content anywhere they show up later.

The wireframe component calls `useBlockProps()` so the block keeps the wrapper and props that Canvas, Columns and Group use for placement. Cover uses `useInnerBlocksProps()` so its children render on top (as wireframes themselves).

Shapes are inline SVG in `currentColor` at low opacity, so they work on light and dark themes:

| Block | Wireframe |
|---|---|
| Heading | One thick rounded bar, about 70% width. Taller for h1/h2 |
| Paragraph | Three thin bars, last one shorter. Follows text alignment |
| Image | Tinted box with a mountain and sun icon. Circle if Canvas circle shape or `is-style-rounded` |
| Button | Outlined pill with a short bar inside |
| Cover | Tinted box filling the block, children on top |

In Canvas, wireframes fill their grid frame and sit at the top. In core they take natural heights (one line, three lines, 4:3 image).

The main risk is that Canvas may measure child DOM to work out row heights or readable-content growth. A spike with one layout comes first to confirm wireframes keep their positions in Canvas's modal.

### Inserted state

- Headings, paragraphs and buttons show their `placeholder` hint.
- Images show the native media placeholder. Canvas makes empty image placeholders fill their frame.
- Core Cover shows its placeholder until an image or colour is chosen, then its children appear. Watch this in testing.

After building, every layout gets screenshotted on the canvas in both modes. Weak empty states (likely image placeholders in narrow columns and the image grid) get fixed with CSS or small filters in this plugin, scoped to `.layout-primitive`.

### Front end

Core outputs nothing for an image block with no `src`. Empty headings and paragraphs output empty tags, and Canvas keeps their grid space. That's acceptable for a prototype and is a known gap.

## Verification

Checks run locally with wp-env and Playwright.

1. Validity: a browser script inserts all 10 layouts, saves, reloads, and asserts every block is valid. Run with and without Canvas.
2. Pickers: screenshots of `▦ Layouts` in the core Patterns tab (core set) and Canvas's modal (Canvas set), showing wireframes.
3. Inserted state: screenshot of each layout on the canvas in both modes.
4. Switching: deactivate Canvas, reload, confirm the core set appears with no errors.

## Delivery

`blueprint.json` (with Canvas) and `blueprint-core.json` (without), giving two Playground links for user test sessions. Adding them to `getdave/wordpress-user-testing` can come later.
