// Checks the registered Layouts patterns: count, root block, canonical
// markup (no deprecation migrations), and block validity after inserting
// them all into a page, saving and reloading. Deletes the page afterwards.
// Usage: node scripts/check-layouts.mjs [canvas|core]
/* eslint-disable no-console -- CLI script; console output is the report. */
import { chromium } from 'playwright';

const mode = process.argv[ 2 ] === 'core' ? 'core' : 'canvas';
const base = `http://127.0.0.1:${ mode === 'core' ? 9401 : 9400 }`;
const EXPECTED_COUNT = Number( process.env.EXPECTED_COUNT ?? 10 );

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on(
	'console',
	( msg ) => msg.type() === 'error' && errors.push( msg.text() )
);
const problems = [];

await page.goto( `${ base }/wp-admin/post-new.php?post_type=page` );
// Patterns arrive from the REST API after the editor boots.
await page.waitForFunction( () => {
	const core = window.wp?.data?.select( 'core' );
	if ( ! core?.getBlockPatterns ) {
		return false;
	}
	core.getBlockPatterns();
	return (
		core.hasFinishedResolution( 'getBlockPatterns' ) &&
		window.wp.data
			.select( 'core/block-editor' )
			.__experimentalGetAllowedPatterns().length > 0
	);
} );

const found = await page.evaluate(
	( expectedRoot ) => {
		const { select, dispatch } = window.wp.data;
		const { createBlock, serialize } = window.wp.blocks;
		dispatch( 'core/preferences' ).set(
			'core/edit-post',
			'welcomeGuide',
			false
		);
		const patterns = select( 'core/block-editor' )
			.__experimentalGetAllowedPatterns()
			.filter( ( p ) => p.categories?.includes( 'layout-primitives' ) );

		const wrongRoot = patterns
			.map( ( p ) => ( { name: p.name, root: p.blocks[ 0 ]?.name } ) )
			.filter( ( r ) => r.root !== expectedRoot );

		// Canvas's "Add pattern" modal only lists patterns with a single tabor/canvas root.
		const multiRoot = expectedRoot
			? patterns
					.filter( ( p ) => p.blocks.length !== 1 )
					.map( ( p ) => `${ p.name } (${ p.blocks.length } roots)` )
			: [];

		// Parsed blocks have been through any deprecation migrations, so if the
		// file isn't already canonical, re-serialising them won't reproduce it.
		const stripMetadata = ( b ) => {
			const { metadata, ...attributes } = b.attributes;
			return createBlock(
				b.name,
				attributes,
				b.innerBlocks.map( stripMetadata )
			);
		};
		const normalise = ( s ) => s.replace( /-->\s+<!--/g, '--><!--' ).trim();
		const roundTrip = [];
		for ( const p of patterns ) {
			const file = normalise( p.content );
			const saved = normalise(
				serialize( p.blocks.map( stripMetadata ) )
			);
			if ( file !== saved ) {
				let i = 0;
				while ( file[ i ] === saved[ i ] ) {
					i++;
				}
				const start = Math.max( 0, i - 40 );
				roundTrip.push(
					`${ p.name } differs at char ${ i }:\n    file:       …${ file.slice( start, i + 60 ) }…\n    serialised: …${ saved.slice( start, i + 60 ) }…`
				);
			}
		}

		return { count: patterns.length, wrongRoot, multiRoot, roundTrip };
	},
	mode === 'core' ? null : 'tabor/canvas'
);

// Core set roots vary (group, columns, cover); only check for Canvas leakage.
if ( mode === 'core' ) {
	found.wrongRoot = found.wrongRoot.filter(
		( r ) => r.root === 'tabor/canvas'
	);
}

if ( found.count !== EXPECTED_COUNT ) {
	problems.push(
		`Expected ${ EXPECTED_COUNT } layouts, found ${ found.count }`
	);
}
if ( found.wrongRoot.length ) {
	problems.push( `Wrong root block: ${ JSON.stringify( found.wrongRoot ) }` );
}
if ( found.multiRoot.length ) {
	problems.push(
		`Canvas patterns must have exactly one root block: ${ found.multiRoot.join( ', ' ) }`
	);
}
if ( found.roundTrip.length ) {
	problems.push(
		`Markup isn't canonical (re-serialising changes it):\n  ${ found.roundTrip.join( '\n  ' ) }`
	);
}

if ( found.count > 0 ) {
	const save = await page.evaluate( async () => {
		const { select, dispatch } = window.wp.data;
		for ( const p of select( 'core/block-editor' )
			.__experimentalGetAllowedPatterns()
			.filter( ( pattern ) =>
				pattern.categories?.includes( 'layout-primitives' )
			) ) {
			dispatch( 'core/block-editor' ).insertBlocks(
				p.blocks.map( ( b ) => window.wp.blocks.cloneBlock( b ) )
			);
		}
		dispatch( 'core/editor' ).editPost( { title: 'Layouts check' } );
		await dispatch( 'core/editor' ).savePost();
		return {
			id: select( 'core/editor' ).getCurrentPostId(),
			ok: select( 'core/editor' ).didPostSaveRequestSucceed(),
		};
	} );

	if ( ! save.ok ) {
		problems.push( 'Saving the check page failed' );
	} else {
		await page.goto(
			`${ base }/wp-admin/post.php?post=${ save.id }&action=edit`
		);
		await page.waitForFunction(
			() =>
				window.wp?.data?.select( 'core/block-editor' )?.getBlocks()
					.length > 0
		);

		const invalid = await page.evaluate( () => {
			const out = [];
			const walk = ( blocks ) =>
				blocks.forEach( ( b ) => {
					if ( ! b.isValid ) {
						out.push( b.name );
					}
					walk( b.innerBlocks );
				} );
			walk( window.wp.data.select( 'core/block-editor' ).getBlocks() );
			return out;
		} );
		if ( invalid.length ) {
			problems.push(
				`Invalid blocks after reload: ${ invalid.join( ', ' ) }`
			);
		}
	}

	try {
		await page.evaluate(
			( id ) =>
				window.wp.apiFetch( {
					path: `/wp/v2/pages/${ id }?force=true`,
					method: 'DELETE',
				} ),
			save.id
		);
	} catch ( e ) {
		problems.push(
			`Could not delete check page ${ save.id }: ${ e.message }`
		);
	}
}

await browser.close();

if ( errors.length ) {
	problems.push( `Console errors:\n  ${ errors.join( '\n  ' ) }` );
}

if ( problems.length ) {
	console.error( `✗ ${ mode }\n${ problems.join( '\n' ) }` );
	process.exit( 1 );
}
console.log( `✓ ${ mode }: ${ found.count } layouts, all blocks valid` );
