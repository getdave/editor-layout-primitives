import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { ImageIcon } from './image';

export default function CoverWireframe( { attributes } ) {
	const { minHeight, minHeightUnit } = attributes;
	const blockProps = useBlockProps( {
		className: 'lp-wireframe lp-wireframe--cover',
		// Unset falls back to the stylesheet's min-height.
		style: minHeight
			? { minHeight: `${ minHeight }${ minHeightUnit || 'px' }` }
			: undefined,
	} );
	const innerBlocksProps = useInnerBlocksProps( {
		className: 'lp-wireframe__cover-inner',
	} );
	return (
		<div { ...blockProps }>
			<svg
				className="lp-wireframe__cover-bg"
				width="100%"
				height="100%"
				aria-hidden
			>
				<rect width="100%" height="100%" rx="4" />
				<ImageIcon corner />
			</svg>
			<div { ...innerBlocksProps } />
		</div>
	);
}
