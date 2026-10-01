import { useBlockProps } from '@wordpress/block-editor';

export default function ButtonWireframe() {
	const blockProps = useBlockProps( {
		className: 'lp-wireframe lp-wireframe--button',
		'aria-hidden': true,
	} );
	return (
		<div { ...blockProps }>
			<svg width="120" height="40" viewBox="0 0 120 40">
				<rect
					className="lp-wireframe__outline"
					x="1"
					y="1"
					width="118"
					height="38"
					rx="19"
				/>
				<rect x="35" y="16" width="50" height="8" rx="4" />
			</svg>
		</div>
	);
}
