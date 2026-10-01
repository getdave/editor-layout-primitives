import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

import { needsPreviewAlignWide } from './should-wireframe';

// Pattern previews render without the root layout that allows wide
// alignment, so core drops a wide Canvas's `alignwide` class. Canvas reads
// that class to pick its grid (18 columns for wide, 12 for content), so the
// preview would lay an 18-column layout onto a 12-column grid. Put the class
// back, in previews only. The block's saved markup is untouched.
function CanvasInPreview( { BlockListBlock, ...props } ) {
	// isPreviewMode is fixed when a preview's editor is created, so a one-off
	// read is enough and no block subscribes to the store.
	const registry = useRegistry();
	const add =
		needsPreviewAlignWide( props.name, props.attributes ) &&
		registry.select( blockEditorStore ).getSettings().isPreviewMode;
	return (
		<BlockListBlock
			{ ...props }
			className={
				add
					? [ props.className, 'alignwide' ]
							.filter( Boolean )
							.join( ' ' )
					: props.className
			}
		/>
	);
}

// Branch on the name only: it never changes for a mounted block, so the tree
// stays stable when attributes change and other blocks pass straight through.
const withPreviewAlignWide = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) =>
		props.name === 'tabor/canvas' ? (
			<CanvasInPreview { ...props } BlockListBlock={ BlockListBlock } />
		) : (
			<BlockListBlock { ...props } />
		),
	'withLayoutPrimitivesPreviewAlignWide'
);

addFilter(
	'editor.BlockListBlock',
	'layout-primitives/preview-align-wide',
	withPreviewAlignWide
);
