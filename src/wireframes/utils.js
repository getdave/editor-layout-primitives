// Text alignment across the attribute shapes core has used: block supports
// (style.typography.textAlign), the older textAlign attribute, and align.
export function textAlign( attributes ) {
	return (
		attributes.style?.typography?.textAlign ??
		attributes.textAlign ??
		attributes.align
	);
}

// A Canvas child whose desktop frame spans every grid column is a backdrop
// (image-overlay): other blocks sit on top of it.
export function spansCanvasWidth( attributes ) {
	const desktop = attributes.canvas?.desktop;
	return !! desktop?.gridColumns && desktop.columnSpan >= desktop.gridColumns;
}
