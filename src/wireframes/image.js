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
