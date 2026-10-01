# Layout Primitives

A WordPress plugin that adds a small set of plain layouts to the block editor. Each one previews as a grey wireframe and inserts as empty blocks, ready for your own content.

## Why

Most patterns come with stock photos, fonts, colours and copy. In user testing, people judged that content instead of the shape of the section they wanted.

Layout Primitives offers the shapes on their own. Pick "three columns with images" or "image left, text right", see it as a wireframe, insert it and fill it in. The theme decides how it looks.

## What it does

- Adds a "▦ Layouts" pattern category. The leading symbol sorts it near the top of the inserter's category list.
- Pattern thumbnails draw empty headings, paragraphs, images, buttons and covers as grey SVG wireframes.
- Inserted layouts are ordinary empty blocks in their placeholder state, with hints such as "Add a heading" and a media placeholder for images. In the core set the plugin restyles empty images and covers so they match their thumbnails.

## The layouts

1. Hero
2. Image left, text right
3. Text left, image right
4. Three columns with images
5. Three features
6. Quote
7. Image with heading over it
8. Image grid
9. Call to action banner
10. Intro

## Canvas and core sets

There are two versions of every layout.

- With the [Canvas block plugin](https://github.com/Automattic/canvas) active, each layout is a single Canvas section (`patterns/canvas`). They also show up in Canvas's own "Add pattern" modal.
- Without Canvas, the layouts use core Columns, Group and Cover blocks (`patterns/core`).

The plugin picks the set on each request by checking whether `tabor/canvas` is in the block registry. Activating or deactivating Canvas switches the set on the next page load. Both sets use the same titles and text blocks. The one structural difference is "Image with heading over it", which is a full-width image in Canvas and a Cover block in core.

## Try it

- [Try it in Playground with Canvas](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/getdave/editor-layout-primitives/trunk/blueprint.json)
- [Try it in Playground without Canvas](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/getdave/editor-layout-primitives/trunk/blueprint-core.json)

Both open a new page in the editor. Open the inserter, choose Patterns and then "▦ Layouts".

The links use `blueprint.json` and `blueprint-core.json` from this repository, which install the plugin from the v0.1.0 release zip. The Canvas link also installs Canvas.

## Development

You need Node.js 20 or later and npm.

```sh
npm install
npm run build   # or `npm start` to rebuild on change
```

Build before you load the plugin. Without `build/` the layouts still register, but the previews show empty blocks instead of wireframes.

Local environments run in [WordPress Playground](https://wordpress.org/playground/) with this repository mounted as the plugin.

```sh
npm run env       # with Canvas, http://127.0.0.1:9400
npm run env:core  # without Canvas, http://127.0.0.1:9401
```

These commands run the checks and build the zip.

```sh
npm test                  # unit tests
npm run lint:js           # lint src and scripts
npm run check -- canvas   # browser check against :9400
npm run check -- core     # browser check against :9401
npm run plugin-zip        # build layout-primitives.zip
```

`npm run check` needs the matching environment running. It counts the layouts, checks their root blocks and that their markup is canonical, then inserts them all into a page, saves, reloads and confirms every block is valid. It deletes the page afterwards.

Run `npm run build` before `npm run plugin-zip`. The zip contains `layout-primitives.php`, `build/`, `patterns/`, this README and `package.json` (which npm always includes) inside a `layout-primitives/` folder.

## How it works

Every layout's root block carries the class `layout-primitive`.

An `editor.BlockEdit` filter wraps heading, paragraph, image, button and cover blocks. It swaps in a wireframe only when all three of these hold.

1. The editor is in preview mode (`isPreviewMode`, set by the pattern previews).
2. The block is empty. Text blocks have no text, and images and covers have no image.
3. The block or one of its ancestors has the `layout-primitive` class.

The second rule means a layout that has been filled in previews as real content wherever it appears later. Wireframes call `useBlockProps()`, so Canvas, Columns and Group still place them as normal.

Core's pattern preview drops a root block's wide alignment, which would lay a wide Canvas section onto Canvas's narrower content grid. An `editor.BlockListBlock` filter adds `alignwide` back to wide Canvas layouts in previews only. Saved markup is never touched.

On the canvas, a little CSS scoped to `.layout-primitive` gives the core set's empty images a 4:3 shape with an image icon, and swaps an empty Cover's black dim for a light tint with a corner icon. Each rule stops applying once the slot has content or the user picks an overlay colour.

## Known limitations

- On mobile, empty Canvas text frames can clip or overlap. Canvas fits frames to their text and ignores placeholder text. This resolves once real text is entered.
- The empty-state styling is editor-only. On the front end an empty core Cover renders as a grey 50% dim.
- Empty headings and paragraphs output empty tags on the front end, which still take up their grid cells in Canvas. Core outputs nothing for an empty image.
- Core Cover only shows its own media placeholder when it has no inner blocks. The core "Image with heading over it" layout relies on a tint, a corner icon and the toolbar's "Add media" button instead.
- Wireframes can appear in other read-only previews, such as Site Editor view mode or revisions, for layouts whose slots are still empty.
- Previews add `alignwide` to wide Canvas layouts to work around the dropped alignment above. This is preview-only and never saved.

## Licence

GPL-2.0-or-later.
