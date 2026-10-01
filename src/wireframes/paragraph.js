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
