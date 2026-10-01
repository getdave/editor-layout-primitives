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

/**
 * Layout slugs and titles, in display order.
 *
 * @return array<string, string>
 */
function layouts() {
	return array(
		'hero'           => __( 'Hero', 'layout-primitives' ),
		'image-text'     => __( 'Image left, text right', 'layout-primitives' ),
		'text-image'     => __( 'Text left, image right', 'layout-primitives' ),
		'three-columns'  => __( 'Three columns with images', 'layout-primitives' ),
		'three-features' => __( 'Three features', 'layout-primitives' ),
		'quote'          => __( 'Quote', 'layout-primitives' ),
		'image-overlay'  => __( 'Image with heading over it', 'layout-primitives' ),
		'image-grid'     => __( 'Image grid', 'layout-primitives' ),
		'call-to-action' => __( 'Call to action banner', 'layout-primitives' ),
		'intro'          => __( 'Intro', 'layout-primitives' ),
	);
}

/**
 * Which pattern set to register: Canvas when its block exists, core otherwise.
 *
 * @return string 'canvas' or 'core'.
 */
function pattern_set() {
	return \WP_Block_Type_Registry::get_instance()->is_registered( 'tabor/canvas' ) ? 'canvas' : 'core';
}

/**
 * Register the Layouts category and the active pattern set.
 * Runs after Canvas registers its block on init (priority 10).
 */
function register_patterns() {
	// The leading symbol sorts the category first in label-sorted pickers.
	register_block_pattern_category(
		'layout-primitives',
		array(
			'label'       => __( '▦ Layouts', 'layout-primitives' ),
			'description' => __( 'Simple starting layouts to fill with your own content.', 'layout-primitives' ),
		)
	);

	$set = pattern_set();
	foreach ( layouts() as $slug => $title ) {
		$file = __DIR__ . "/patterns/{$set}/{$slug}.html";
		if ( ! file_exists( $file ) ) {
			continue;
		}
		register_block_pattern(
			"layout-primitives/{$slug}",
			array(
				'title'         => $title,
				'categories'    => array( 'layout-primitives' ),
				'keywords'      => array( 'layout', 'wireframe' ),
				'viewportWidth' => 1200,
				'content'       => file_get_contents( $file ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			)
		);
	}
}
add_action( 'init', __NAMESPACE__ . '\\register_patterns', 20 );
