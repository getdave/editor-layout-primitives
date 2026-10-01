export const MARKER = 'layout-primitive';

const TEXT_BLOCKS = [ 'core/heading', 'core/paragraph', 'core/button' ];
const MEDIA_BLOCKS = [ 'core/image', 'core/cover' ];

export const WIREFRAME_BLOCKS = [ ...TEXT_BLOCKS, ...MEDIA_BLOCKS ];

export function isEmptyBlock( name, attributes = {} ) {
	if ( TEXT_BLOCKS.includes( name ) ) {
		return ! String( attributes.content ?? '' ).trim();
	}
	if ( MEDIA_BLOCKS.includes( name ) ) {
		return ! attributes.url;
	}
	return false;
}

export function shouldWireframe( {
	name,
	attributes,
	isPreviewMode,
	ancestorClassNames,
} ) {
	if ( ! isPreviewMode || ! isEmptyBlock( name, attributes ) ) {
		return false;
	}
	return ancestorClassNames.some( ( className ) =>
		( className ?? '' ).split( /\s+/ ).includes( MARKER )
	);
}
