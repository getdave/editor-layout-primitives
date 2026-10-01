/**
 * ESLint flat config. Extends the @wordpress/scripts default.
 *
 * `@wordpress/*` packages are provided by WordPress at runtime (webpack
 * externals), so they are not installed as dependencies. Treat them as
 * internal so eslint-plugin-import neither tries to resolve them nor
 * expects them in package.json.
 */
const defaultConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	...defaultConfig,
	{
		settings: {
			'import/internal-regex': '^@wordpress/',
		},
		rules: {
			'import/no-unresolved': [ 'error', { ignore: [ '^@wordpress/' ] } ],
		},
	},
];
