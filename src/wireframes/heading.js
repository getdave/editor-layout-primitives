import { useBlockProps } from '@wordpress/block-editor';
import { textAlign } from './utils';

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
				<rect
					x={ centred ? '15%' : 0 }
					width="70%"
					height={ height }
					rx={ height / 4 }
				/>
			</svg>
		</div>
	);
}
