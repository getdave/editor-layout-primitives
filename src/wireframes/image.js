import { useBlockProps } from '@wordpress/block-editor';
import { spansCanvasWidth } from './utils';

// Mountain and sun, 32x24. Centred on the parent SVG by default; `corner`
// draws it at double size, inset from the top-right, clear of centred
// content (covers and Canvas backdrops are large, so a 32px icon vanishes
// in a thumbnail).
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

// Image sizes arrive as CSS strings ("80px") or, from older markup, numbers.
const cssSize = ( value ) =>
	typeof value === 'number' ? `${ value }px` : value || undefined;

export default function ImageWireframe( { attributes } ) {
	const { width, height, aspectRatio, align } = attributes;
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
		// Mirror the image's own size so small images (a quote's 80px
		// portrait) look small. Unset values fall back to the stylesheet.
		style: {
			width: cssSize( width ),
			height: cssSize( height ),
			aspectRatio:
				aspectRatio && aspectRatio !== 'auto' ? aspectRatio : undefined,
			marginInline: align === 'center' ? 'auto' : undefined,
		},
	} );
	return (
		<div { ...blockProps }>
			<svg width="100%" height="100%">
				{ round ? (
					<ellipse cx="50%" cy="50%" rx="50%" ry="50%" />
				) : (
					<rect width="100%" height="100%" rx="4" />
				) }
				{ /* Backdrops carry text over their centre; keep the icon clear. */ }
				<ImageIcon corner={ spansCanvasWidth( attributes ) } />
			</svg>
		</div>
	);
}
