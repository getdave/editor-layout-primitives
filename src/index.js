import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

import { isEmptyBlock, shouldWireframe } from './should-wireframe';
import WIREFRAMES from './wireframes';
import './style.scss';

const withWireframe = createHigherOrderComponent( ( BlockEdit ) => {
	function MaybeWireframe( props ) {
		const { name, clientId, attributes } = props;
		const show = useSelect(
			( select ) => {
				const { getSettings, getBlockParents, getBlockAttributes } =
					select( blockEditorStore );
				// Cheap checks first: real editors never get past this line.
				if (
					! getSettings().isPreviewMode ||
					! isEmptyBlock( name, attributes )
				) {
					return false;
				}
				return shouldWireframe( {
					name,
					attributes,
					isPreviewMode: true,
					ancestorClassNames: getBlockParents( clientId ).map(
						( id ) => getBlockAttributes( id )?.className
					),
				} );
			},
			[ name, clientId, attributes ]
		);
		const Wireframe = WIREFRAMES[ name ];
		return show ? <Wireframe { ...props } /> : <BlockEdit { ...props } />;
	}

	// A mounted BlockEdit's name never changes, so branching here is stable,
	// and blocks without a wireframe skip the store subscription entirely.
	return ( props ) =>
		WIREFRAMES[ props.name ] ? (
			<MaybeWireframe { ...props } />
		) : (
			<BlockEdit { ...props } />
		);
}, 'withLayoutPrimitivesWireframe' );

addFilter( 'editor.BlockEdit', 'layout-primitives/wireframe', withWireframe );
