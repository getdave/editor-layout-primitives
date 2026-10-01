import { spansCanvasWidth } from '../wireframes/utils';

const frame = ( columnSpan, gridColumns = 18 ) => ( {
	canvas: { desktop: { column: 1, row: 1, columnSpan, gridColumns } },
} );

describe( 'spansCanvasWidth', () => {
	it( 'is true when the desktop frame spans every column', () => {
		expect( spansCanvasWidth( frame( 18 ) ) ).toBe( true );
		expect( spansCanvasWidth( frame( 12, 12 ) ) ).toBe( true );
	} );
	it( 'is false for narrower frames and non-Canvas blocks', () => {
		expect( spansCanvasWidth( frame( 9 ) ) ).toBe( false );
		expect( spansCanvasWidth( {} ) ).toBe( false );
		expect( spansCanvasWidth( { canvas: {} } ) ).toBe( false );
	} );
} );
