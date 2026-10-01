import { useBlockProps } from '@wordpress/block-editor';

// Mountain and sun, 32x24. Centred on the parent SVG by default; `corner`
// draws it at double size, inset from the top-right, clear of centred
// content (covers are large, so a 32px icon vanishes in a thumbnail).
export function ImageIcon( { corner = false } ) {
	return (
		<svg
			x={ corner ? '100%' : '50%' }
			y={ corner ? 0 : '50%' }
			overflow="visible"
			className="lp-wireframe__icon"
		>
			<g
				transform={
					corner ? 'translate(-96 32) scale(2)' : 'translate(-16 -12)'
				}
			>
				<circle cx="8" cy="6" r="3" />
				<path d="M0 24 L10 12 L16 18 L22 10 L32 24 Z" />
			</g>
		</svg>
	);
}

export default function ImageWireframe( { attributes } ) {
	// Canvas shapes (circle, arch, diamond…) are applied by a CSS mask, the
	// same way Canvas masks its own placeholder. See style.scss.
	const round = ( attributes.className ?? '' )
		.split( /\s+/ )
		.includes( 'is-style-rounded' );
	const blockProps = useBlockProps( {
		className: `lp-wireframe lp-wireframe--image${
			round ? ' is-round' : ''
		}`,
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
