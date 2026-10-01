// Inserts every Layouts pattern into a new page, saves, reloads and checks
// that each block is valid and that the expected set is registered.
// Usage: node scripts/check-layouts.mjs [canvas|core]
import { chromium } from 'playwright';

const mode = process.argv[ 2 ] === 'core' ? 'core' : 'canvas';
const base = `http://127.0.0.1:${ mode === 'core' ? 9401 : 9400 }`;
const EXPECTED_COUNT = Number( process.env.EXPECTED_COUNT ?? 10 );

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on( 'console', ( msg ) => msg.type() === 'error' && errors.push( msg.text() ) );

await page.goto( `${ base }/wp-admin/post-new.php?post_type=page` );
// Patterns arrive from the REST API after the editor boots.
await page.waitForFunction( () => {
	const core = window.wp?.data?.select( 'core' );
	if ( ! core?.getBlockPatterns ) return false;
	core.getBlockPatterns();
	return (
		core.hasFinishedResolution( 'getBlockPatterns' ) &&
		window.wp.data.select( 'core/block-editor' ).__experimentalGetAllowedPatterns().length > 0
	);
} );

const result = await page.evaluate( async ( expectedRoot ) => {
	const { select, dispatch } = window.wp.data;
	dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false );
	const patterns = select( 'core/block-editor' )
		.__experimentalGetAllowedPatterns()
		.filter( ( p ) => p.categories?.includes( 'layout-primitives' ) );
	const roots = patterns.map( ( p ) => ( { name: p.name, root: p.blocks[ 0 ]?.name } ) );
	const wrongRoot = roots.filter( ( r ) => r.root !== expectedRoot );
	for ( const p of patterns ) {
		dispatch( 'core/block-editor' ).insertBlocks(
			p.blocks.map( ( b ) => window.wp.blocks.cloneBlock( b ) )
		);
	}
	dispatch( 'core/editor' ).editPost( { title: 'Layouts check' } );
	await dispatch( 'core/editor' ).savePost();
	return { count: patterns.length, wrongRoot, id: select( 'core/editor' ).getCurrentPostId() };
}, mode === 'core' ? null : 'tabor/canvas' );

// Core set roots vary (group, columns, cover); only check for Canvas leakage.
if ( mode === 'core' ) {
	result.wrongRoot = result.wrongRoot.filter( ( r ) => r.root === 'tabor/canvas' );
}

await page.goto( `${ base }/wp-admin/post.php?post=${ result.id }&action=edit` );
await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' )?.getBlocks().length > 0 );

const invalid = await page.evaluate( () => {
	const out = [];
	const walk = ( blocks ) =>
		blocks.forEach( ( b ) => {
			if ( ! b.isValid ) out.push( b.name );
			walk( b.innerBlocks );
		} );
	walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
	return out;
} );

await browser.close();

const problems = [];
if ( result.count !== EXPECTED_COUNT ) problems.push( `Expected ${ EXPECTED_COUNT } layouts, found ${ result.count }` );
if ( result.wrongRoot.length ) problems.push( `Wrong root block: ${ JSON.stringify( result.wrongRoot ) }` );
if ( invalid.length ) problems.push( `Invalid blocks after reload: ${ invalid.join( ', ' ) }` );
if ( errors.length ) problems.push( `Console errors:\n  ${ errors.join( '\n  ' ) }` );

if ( problems.length ) {
	console.error( `✗ ${ mode }\n${ problems.join( '\n' ) }` );
	process.exit( 1 );
}
console.log( `✓ ${ mode }: ${ result.count } layouts, all blocks valid` );
