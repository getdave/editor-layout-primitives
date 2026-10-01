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
