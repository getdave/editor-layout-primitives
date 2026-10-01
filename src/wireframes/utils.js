// Text alignment across the attribute shapes core has used: block supports
// (style.typography.textAlign), the older textAlign attribute, and align.
export function textAlign( attributes ) {
	return (
		attributes.style?.typography?.textAlign ??
		attributes.textAlign ??
		attributes.align
	);
}
