// Checks the registered Layouts patterns: count, root block, canonical
// markup (no deprecation migrations), and block validity after inserting
// them all into a page, saving and reloading. Deletes the page afterwards.
// Usage: node scripts/check-layouts.mjs [canvas|core]
/* eslint-disable no-console -- CLI script; console output is the report. */
import { chromium } from 'playwright';

const mode = process.argv[ 2 ] === 'core' ? 'core' : 'canvas';
const base = `http://127.0.0.1:${ mode === 'core' ? 9401 : 9400 }`;
const EXPECTED_COUNT = Number( process.env.EXPECTED_COUNT ?? 10 );

const problems = [];
const errors = [];
const browser = await chromium.launch();
let pageId;
let found;

try {
	const page = await browser.newPage();
	page.on(
		'console',
		( msg ) => msg.type() === 'error' && errors.push( msg.text() )
	);

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
	// The auto-draft's ID; saving keeps it, so `finally` can always clean up.
	pageId = await page.evaluate( () =>
		window.wp.data.select( 'core/editor' ).getCurrentPostId()
	);

	found = await page.evaluate( inspectPatterns, {
		expectedRoot: mode === 'core' ? null : 'tabor/canvas',
	} );

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
		problems.push(
			`Wrong root block: ${ JSON.stringify( found.wrongRoot ) }`
		);
	}
	if ( found.multiRoot.length ) {
		problems.push(
			`Canvas patterns must have exactly one root block: ${ found.multiRoot.join(
				', '
			) }`
		);
	}
	if ( found.roundTrip.length ) {
		problems.push(
			`Markup isn't canonical (re-serialising changes it):\n  ${ found.roundTrip.join(
				'\n  '
			) }`
		);
	}

	if ( found.count > 0 ) {
		const saved = await page.evaluate( async () => {
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
			return select( 'core/editor' ).didPostSaveRequestSucceed();
		} );

		if ( ! saved ) {
			problems.push( 'Saving the check page failed' );
		} else {
			await page.goto(
				`${ base }/wp-admin/post.php?post=${ pageId }&action=edit`
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
				walk(
					window.wp.data.select( 'core/block-editor' ).getBlocks()
				);
				return out;
			} );
			if ( invalid.length ) {
				problems.push(
					`Invalid blocks after reload: ${ invalid.join( ', ' ) }`
				);
			}
		}
	}
} finally {
	if ( pageId ) {
		await deletePage( pageId ).catch( ( e ) =>
			problems.push(
				`Could not delete check page ${ pageId }: ${ e.message }`
			)
		);
	}
	await browser.close();
}

if ( errors.length ) {
	problems.push( `Console errors:\n  ${ errors.join( '\n  ' ) }` );
}

if ( problems.length ) {
	console.error( `✗ ${ mode }\n${ problems.join( '\n' ) }` );
	process.exit( 1 );
}
console.log( `✓ ${ mode }: ${ found.count } layouts, all blocks valid` );

// Deletes the check page from a fresh page, so it works even if the
// editor page is the thing that hung.
async function deletePage( id ) {
	const page = await browser.newPage();
	try {
		await page.goto(
			`${ base }/wp-admin/post.php?post=${ id }&action=edit`,
			{
				timeout: 20000,
			}
		);
		await page.waitForFunction( () => window.wp?.apiFetch, null, {
			timeout: 20000,
		} );
		await page.evaluate(
			( pageToDelete ) =>
				window.wp.apiFetch( {
					path: `/wp/v2/pages/${ pageToDelete }?force=true`,
					method: 'DELETE',
				} ),
			id
		);
	} finally {
		await page.close();
	}
}

// Runs in the editor page. Reports pattern count, roots, and any markup that
// re-serialising would change.
function inspectPatterns( { expectedRoot } ) {
	const { select, dispatch } = window.wp.data;
	const { createBlock, serialize } = window.wp.blocks;
	const rawParse = window.wp.blockSerializationDefaultParser.parse;
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
	// file isn't canonical, re-serialising them won't reproduce it. Compare
	// the raw parse trees of both (block names, attributes, HTML) so that
	// attribute order and whitespace between tags don't count.
	const INJECTED = [ 'categories', 'patternName', 'name' ];
	const withoutInjectedMetadata = ( attributes, fileMetadata, title ) => {
		if ( ! attributes.metadata ) {
			return attributes;
		}
		const metadata = { ...attributes.metadata };
		for ( const key of INJECTED ) {
			const injected =
				! ( key in fileMetadata ) &&
				( key !== 'name' || metadata.name === title );
			if ( injected ) {
				delete metadata[ key ];
			}
		}
		const { metadata: _, ...rest } = attributes;
		return Object.keys( metadata ).length ? { ...rest, metadata } : rest;
	};
	const rebuild = ( b ) =>
		createBlock( b.name, b.attributes, b.innerBlocks.map( rebuild ) );

	const html = ( s ) => s.replace( />\s+</g, '><' ).trim();
	const sortKeys = ( v ) => {
		if ( Array.isArray( v ) ) {
			return v.map( sortKeys );
		}
		if ( v && typeof v === 'object' ) {
			return Object.fromEntries(
				Object.keys( v )
					.sort()
					.map( ( k ) => [ k, sortKeys( v[ k ] ) ] )
			);
		}
		return v;
	};
	const tidy = ( blocks ) =>
		blocks
			// Drop the whitespace-only freeform blocks between top-level blocks.
			.filter( ( b ) => b.blockName !== null || b.innerHTML.trim() )
			.map( ( b ) => ( {
				name: b.blockName,
				attrs: sortKeys( b.attrs ),
				// null marks where each inner block sits.
				html: b.innerContent
					.map( ( c ) => ( c === null ? null : html( c ) ) )
					.filter( ( c ) => c !== '' ),
				innerBlocks: tidy( b.innerBlocks ),
			} ) );

	const show = ( v ) =>
		v === undefined ? '(absent)' : JSON.stringify( v );
	const firstDiff = ( a, b, path ) => {
		if ( a === b ) {
			return null;
		}
		if (
			a &&
			b &&
			typeof a === 'object' &&
			typeof b === 'object' &&
			Array.isArray( a ) === Array.isArray( b )
		) {
			for ( const k of new Set( [
				...Object.keys( a ),
				...Object.keys( b ),
			] ) ) {
				const d = firstDiff(
					a[ k ],
					b[ k ],
					Array.isArray( a )
						? `${ path }[${ k }]`
						: `${ path }.${ k }`
				);
				if ( d ) {
					return d;
				}
			}
			return null;
		}
		if ( typeof a === 'string' && typeof b === 'string' ) {
			let i = 0;
			while ( a[ i ] === b[ i ] ) {
				i++;
			}
			const from = Math.max( 0, i - 30 );
			return {
				path: `${ path } (char ${ i })`,
				file: `…${ a.slice( from, i + 50 ) }…`,
				saved: `…${ b.slice( from, i + 50 ) }…`,
			};
		}
		return { path, file: show( a ), saved: show( b ) };
	};
	const compareBlocks = ( fileBlocks, savedBlocks, path ) => {
		const length = Math.max( fileBlocks.length, savedBlocks.length );
		for ( let i = 0; i < length; i++ ) {
			const f = fileBlocks[ i ];
			const s = savedBlocks[ i ];
			const here = `${ path }[${ i }] ${ ( f ?? s ).name }`;
			if ( ! f || ! s ) {
				return `${ here }: only in the ${ f ? 'file' : 'serialised output' }`;
			}
			if ( f.name !== s.name ) {
				return `${ here }: serialised as ${ s.name }`;
			}
			const d =
				firstDiff( f.attrs, s.attrs, 'attrs' ) ??
				firstDiff( f.html, s.html, 'html' );
			if ( d ) {
				return `${ here } › ${ d.path }\n      file:       ${ d.file }\n      serialised: ${ d.saved }`;
			}
			const inner = compareBlocks(
				f.innerBlocks,
				s.innerBlocks,
				`${ here } › innerBlocks`
			);
			if ( inner ) {
				return inner;
			}
		}
		return null;
	};

	const roundTrip = [];
	for ( const p of patterns ) {
		const fileTree = rawParse( p.content );
		const roots = tidy( fileTree );
		const blocks = p.blocks.map( ( b, i ) =>
			rebuild( {
				...b,
				attributes: withoutInjectedMetadata(
					b.attributes,
					roots[ i ]?.attrs.metadata ?? {},
					p.title
				),
			} )
		);
		const diff = compareBlocks(
			roots,
			tidy( rawParse( serialize( blocks ) ) ),
			'blocks'
		);
		if ( diff ) {
			roundTrip.push( `${ p.name }: ${ diff }` );
		}
	}

	return { count: patterns.length, wrongRoot, multiRoot, roundTrip };
}
