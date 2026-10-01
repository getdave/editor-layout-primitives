import { shouldWireframe, isEmptyBlock, MARKER } from '../should-wireframe';

const inLayout = [ 'something-else', `foo ${ MARKER }` ];

describe( 'isEmptyBlock', () => {
	it( 'treats text blocks with no content as empty', () => {
		expect( isEmptyBlock( 'core/heading', {} ) ).toBe( true );
		expect( isEmptyBlock( 'core/paragraph', { content: '' } ) ).toBe(
			true
		);
		expect( isEmptyBlock( 'core/button', { content: '  ' } ) ).toBe( true );
	} );
	it( 'treats text blocks with content as filled', () => {
		expect( isEmptyBlock( 'core/heading', { content: 'Hi' } ) ).toBe(
			false
		);
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
	it( 'does not match marker substrings', () => {
		expect(
			shouldWireframe( {
				...base,
				ancestorClassNames: [ `${ MARKER }-x` ],
			} )
		).toBe( false );
	} );
} );
