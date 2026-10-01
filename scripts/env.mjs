// Starts a local Playground with this plugin mounted.
// Usage: node scripts/env.mjs canvas|core
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath( new URL( '../', import.meta.url ) );
const mode = process.argv[ 2 ] === 'core' ? 'core' : 'canvas';
const port = mode === 'core' ? 9401 : 9400;

const server = spawn(
	process.execPath,
	[
		path.join( root, 'node_modules/@wp-playground/cli/cli.js' ),
		'server',
		`--port=${ port }`,
		'--login',
		`--blueprint=${ path.join( root, `dev/blueprint-${ mode }.json` ) }`,
		`--mount=${ root }:/wordpress/wp-content/plugins/layout-primitives`,
	],
	{ cwd: root, stdio: 'inherit' }
);
server.on( 'exit', ( code ) => process.exit( code ?? 0 ) );
