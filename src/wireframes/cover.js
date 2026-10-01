import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { ImageIcon } from './image';

export default function CoverWireframe() {
	const blockProps = useBlockProps( {
		className: 'lp-wireframe lp-wireframe--cover',
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
				<ImageIcon />
			</svg>
			<div { ...innerBlocksProps } />
		</div>
	);
}
