import {
	shouldWireframe,
	isEmptyBlock,
	hasMarker,
	needsPreviewAlignWide,
	MARKER,
} from '../should-wireframe';

const inLayout = [ 'something-else', `foo ${ MARKER }` ];

describe( 'isEmptyBlock', () => {
	it( 'treats text blocks with no content as empty', () => {
		expect( isEmptyBlock( 'core/heading', {} ) ).toBe( true );
		expect( isEmptyBlock( 'core/paragraph', { content: '' } ) ).toBe(
			true
		);
		expect( isEmptyBlock( 'core/button', { text: '  ' } ) ).toBe( true );
	} );
	it( 'treats text blocks with content as filled', () => {
		expect( isEmptyBlock( 'core/heading', { content: 'Hi' } ) ).toBe(
			false
		);
	} );
	it( 'reads the button label from text, not content', () => {
		expect( isEmptyBlock( 'core/button', { text: 'Go' } ) ).toBe( false );
	} );
	it( 'handles RichTextData-like content objects', () => {
		expect(
			isEmptyBlock( 'core/paragraph', {
				content: { toString: () => '' },
			} )
		).toBe( true );
		expect(
			isEmptyBlock( 'core/paragraph', {
				content: { toString: () => 'x' },
			} )
		).toBe( false );
	} );
	it( 'treats media blocks without a url as empty', () => {
		expect( isEmptyBlock( 'core/image', {} ) ).toBe( true );
		expect( isEmptyBlock( 'core/cover', { url: 'a.jpg' } ) ).toBe( false );
	} );
	it( 'treats covers using the featured image as filled', () => {
		expect( isEmptyBlock( 'core/cover', { useFeaturedImage: true } ) ).toBe(
			false
		);
	} );
	it( 'returns false for unsupported blocks', () => {
		expect( isEmptyBlock( 'core/list', {} ) ).toBe( false );
	} );
} );

describe( 'shouldWireframe', () => {
	const base = {
		name: 'core/heading',
		attributes: {},
		isPreviewMode: true,
		ancestorClassNames: inLayout,
	};
	it( 'is true for an empty supported block in a layout preview', () => {
		expect( shouldWireframe( base ) ).toBe( true );
	} );
	it( 'is false outside preview mode', () => {
		expect( shouldWireframe( { ...base, isPreviewMode: false } ) ).toBe(
			false
		);
	} );
	it( 'is false when the block has content', () => {
		expect(
			shouldWireframe( { ...base, attributes: { content: 'Hi' } } )
		).toBe( false );
	} );
	it( 'is false when no ancestor has the marker class', () => {
		expect(
			shouldWireframe( {
				...base,
				ancestorClassNames: [ 'x', undefined ],
			} )
		).toBe( false );
	} );
	it( 'is true when the block itself has the marker class', () => {
		expect(
			shouldWireframe( {
				name: 'core/cover',
				attributes: { className: `is-style-x ${ MARKER }` },
				isPreviewMode: true,
				ancestorClassNames: [],
			} )
		).toBe( true );
	} );
	it( 'does not match marker substrings', () => {
		expect(
			shouldWireframe( {
				...base,
				ancestorClassNames: [ `${ MARKER }-x` ],
			} )
		).toBe( false );
	} );
} );

describe( 'hasMarker', () => {
	it( 'finds the marker among other classes', () => {
		expect( hasMarker( `is-style-x ${ MARKER } foo` ) ).toBe( true );
		expect( hasMarker( MARKER ) ).toBe( true );
	} );
	it( 'is false for missing classes and substrings', () => {
		expect( hasMarker( undefined ) ).toBe( false );
		expect( hasMarker( '' ) ).toBe( false );
		expect( hasMarker( `${ MARKER }-x x${ MARKER }` ) ).toBe( false );
	} );
} );

describe( 'needsPreviewAlignWide', () => {
	const attributes = { align: 'wide', className: MARKER };
	it( 'is true for a wide Canvas layout', () => {
		expect( needsPreviewAlignWide( 'tabor/canvas', attributes ) ).toBe(
			true
		);
	} );
	it( 'is false for other blocks, alignments or unmarked Canvas', () => {
		expect( needsPreviewAlignWide( 'core/group', attributes ) ).toBe(
			false
		);
		expect(
			needsPreviewAlignWide( 'tabor/canvas', {
				...attributes,
				align: 'full',
			} )
		).toBe( false );
		expect(
			needsPreviewAlignWide( 'tabor/canvas', { align: 'wide' } )
		).toBe( false );
		expect( needsPreviewAlignWide( 'tabor/canvas' ) ).toBe( false );
	} );
} );
