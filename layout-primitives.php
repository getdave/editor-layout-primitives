<?php
/**
 * Plugin Name:       Layout Primitives
 * Description:       Simple wireframe layouts in a Layouts pattern category. Uses Canvas when it's active and core blocks otherwise.
 * Version:           0.1.0
 * Requires at least: 7.1
 * Requires PHP:      8.3
 * Author:            Dave Smith
 * License:           GPL-2.0-or-later
 * Text Domain:       layout-primitives
 *
 * @package LayoutPrimitives
 */

namespace LayoutPrimitives;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue the editor script that renders wireframes in pattern previews.
 */
function enqueue_editor_assets() {
	$asset_file = __DIR__ . '/build/index.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}
	$asset = require $asset_file;
	wp_enqueue_script(
		'layout-primitives-editor',
		plugins_url( 'build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		true
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_editor_assets' );

/**
 * Enqueue wireframe styles. Using enqueue_block_assets gets them into
 * the editor canvas iframe and the pattern preview iframes.
 */
function enqueue_block_assets() {
	if ( ! is_admin() || ! file_exists( __DIR__ . '/build/style-index.css' ) ) {
		return;
	}
	wp_enqueue_style(
		'layout-primitives',
		plugins_url( 'build/style-index.css', __FILE__ ),
		array(),
		filemtime( __DIR__ . '/build/style-index.css' )
	);
}
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\enqueue_block_assets' );
