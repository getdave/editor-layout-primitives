export const MARKER = 'layout-primitive';

const TEXT_BLOCKS = [ 'core/heading', 'core/paragraph', 'core/button' ];
const MEDIA_BLOCKS = [ 'core/image', 'core/cover' ];

export const WIREFRAME_BLOCKS = [ ...TEXT_BLOCKS, ...MEDIA_BLOCKS ];

// core/button keeps its label in `text`; heading and paragraph use `content`.
const TEXT_ATTRIBUTE = { 'core/button': 'text' };

export function isEmptyBlock( name, attributes = {} ) {
	if ( TEXT_BLOCKS.includes( name ) ) {
		const text = attributes[ TEXT_ATTRIBUTE[ name ] ?? 'content' ];
		return ! String( text ?? '' ).trim();
	}
	if ( name === 'core/cover' ) {
		return ! attributes.url && ! attributes.useFeaturedImage;
	}
	if ( MEDIA_BLOCKS.includes( name ) ) {
		return ! attributes.url;
	}
	return false;
}

function hasMarker( className ) {
	return ( className ?? '' ).split( /\s+/ ).includes( MARKER );
}

// The marker can sit on the block itself (e.g. a cover root) or any ancestor.
export function shouldWireframe( {
	name,
	attributes = {},
	isPreviewMode,
	ancestorClassNames = [],
} ) {
	if ( ! isPreviewMode || ! isEmptyBlock( name, attributes ) ) {
		return false;
	}
	return [ attributes.className, ...ancestorClassNames ].some( hasMarker );
}
