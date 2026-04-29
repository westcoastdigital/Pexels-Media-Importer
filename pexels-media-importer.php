<?php

/**
 * Plugin Name: Pexels Media Importer
 * Plugin URI:  https://github.com/your-repo/pexels-media-importer
 * Description: Search Pexels.com and import images directly into your WordPress Media Library.
 * Version:     1.2.1
 * Author:      Jon Mather
 * Author URI:  https://jonmather.au
 * License:     GPL-2.0+
 * Text Domain: pexels-media-importer
 */

defined('ABSPATH') || exit;

define('PMI_VERSION', '1.2.1');
define('PMI_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PMI_PLUGIN_URL', plugin_dir_url(__FILE__));

define('PMI_LOGO', '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_2" idth="28" height="28"  viewBox="0 0 165.34 165.53"><defs><style>.cls-1 {fill: #000;stroke-width: 0}</style></defs><g id="Layer_1-2"><path d="M74.13 111.77c9.35 0 18.38.87 27.19-.17 21.12-2.51 36.95-22.14 35.84-43.29-1.15-21.94-18.27-38.91-40.54-40.18-20.63-1.18-40.08 14.8-42.89 35.74-.92 6.86-.57 13.89-.77 20.85-.06 2.11 0 4.22 0 6.57H.09v-4.71c0-17.92-.04-35.84.02-53.75C.17 13.71 13.93.04 33.15.02c33-.03 66-.03 98.99 0 19.5.02 33.15 13.66 33.17 33.17.03 33.02.04 66.03 0 99.05-.02 19.5-13.66 33.07-33.23 33.1-19.21.03-38.42 0-57.95 0v-53.58Z" class="cls-1" /><path d="M.1 112.65h52.54v52.81c-11.22-.98-22.56 2.07-33.31-2.82C7.22 157.14.75 147.57.16 134.3c-.32-7.07-.06-14.17-.06-21.65M73.95 91.51c0-8.26-.57-16.06.13-23.74 1.04-11.31 11.41-19.59 22.41-18.78 11.16.82 20.07 10.45 19.91 21.54-.15 11.11-9.11 20.45-20.49 20.93-7.1.3-14.22.06-21.96.06Z" class="cls-1" /></g></svg>');

// ============================================
// GitHub Auto-Updater Integration
// ============================================
require_once PMI_PLUGIN_DIR . 'github-updater.php';

if (class_exists('SimpliWeb_GitHub_Updater')) {
    $updater = new SimpliWeb_GitHub_Updater(__FILE__);
    $updater->set_username('westcoastdigital');
    $updater->set_repository('Pexels-Media-Importer');
    
    // For private repos, uncomment and add your token:
    // if (defined('GITHUB_ACCESS_TOKEN')) {
    //     $updater->authorize(GITHUB_ACCESS_TOKEN);
    // }
    
    $updater->initialize();
}
// ============================================

// ---------------------------------------------------------------------------
// Admin menu
// ---------------------------------------------------------------------------
add_action('admin_menu', function () {
	add_menu_page(
		__('Pexels Importer', 'pexels-media-importer'),
		__('Pexels Importer', 'pexels-media-importer'),
		'upload_files',
		'pexels-media-importer',
		'pmi_render_search_page',
		'data:image/svg+xml;base64,' . base64_encode(PMI_LOGO),
		10
	);

	add_submenu_page(
		'pexels-media-importer',
		__('Search Images', 'pexels-media-importer'),
		__('Search Images', 'pexels-media-importer'),
		'upload_files',
		'pexels-media-importer',
		'pmi_render_search_page'
	);

	add_submenu_page(
		'pexels-media-importer',
		__('Settings', 'pexels-media-importer'),
		__('Settings', 'pexels-media-importer'),
		'manage_options',
		'pexels-media-importer-settings',
		'pmi_render_settings_page'
	);
});

// ---------------------------------------------------------------------------
// Settings registration
// ---------------------------------------------------------------------------
add_action('admin_init', function () {
	register_setting('pmi_settings_group', 'pmi_api_key', [
		'sanitize_callback' => 'sanitize_text_field',
	]);

	add_settings_section('pmi_main_section', '', null, 'pexels-media-importer-settings');

	add_settings_field(
		'pmi_api_key',
		__('Pexels API Key', 'pexels-media-importer'),
		'pmi_render_api_key_field',
		'pexels-media-importer-settings',
		'pmi_main_section'
	);
});

function pmi_render_api_key_field()
{
	$key = get_option('pmi_api_key', '');
	echo '<input type="password" id="pmi_api_key" name="pmi_api_key" value="' . esc_attr($key) . '" class="regular-text" autocomplete="off" />';
	echo '<p class="description">' . sprintf(
		/* translators: %s: Pexels API link */
		__('Get your free API key at %s', 'pexels-media-importer'),
		'<a href="https://www.pexels.com/api/" target="_blank">pexels.com/api</a>'
	) . '</p>';
}

// ---------------------------------------------------------------------------
// Enqueue admin assets
// ---------------------------------------------------------------------------
add_action('admin_enqueue_scripts', function ($hook) {
	// Full assets on Pexels plugin pages
	$pmi_pages = ['toplevel_page_pexels-media-importer', 'pexels-importer_page_pexels-media-importer-settings'];
	if (in_array($hook, $pmi_pages, true)) {
		wp_enqueue_style('pmi-admin', PMI_PLUGIN_URL . 'assets/admin.css', [], PMI_VERSION);
		wp_enqueue_script('pmi-admin', PMI_PLUGIN_URL . 'assets/admin.js', ['jquery'], PMI_VERSION, true);
		wp_localize_script('pmi-admin', 'PMI', [
			'ajax_url' => admin_url('admin-ajax.php'),
			'nonce'    => wp_create_nonce('pmi_nonce'),
			'strings'  => [
				'importing'   => __('Importing…', 'pexels-media-importer'),
				'imported'    => __('Imported!', 'pexels-media-importer'),
				'error'       => __('Error', 'pexels-media-importer'),
				'no_key'      => __('Please add your Pexels API key in Settings first.', 'pexels-media-importer'),
				'searching'   => __('Searching…', 'pexels-media-importer'),
			],
		]);
		return;
	}

	// CSS + modal script on post/page edit screens — required for the media button modal
	if (in_array($hook, ['post.php', 'post-new.php'], true) && current_user_can('upload_files')) {
		wp_enqueue_style('pmi-admin', PMI_PLUGIN_URL . 'assets/admin.css', [], PMI_VERSION);
		wp_enqueue_script('pmi-media', PMI_PLUGIN_URL . 'assets/pexels-media.js', ['jquery'], PMI_VERSION, true);
	}
});

// ---------------------------------------------------------------------------
// Enqueue block editor assets
// ---------------------------------------------------------------------------
add_action('enqueue_block_editor_assets', function () {
	wp_enqueue_script(
		'pmi-block',
		PMI_PLUGIN_URL . 'assets/block.js',
		['wp-blocks', 'wp-element', 'wp-data', 'wp-i18n', 'jquery'],
		PMI_VERSION,
		true
	);

	wp_localize_script('pmi-block', 'PMI_Block', [
		'ajax_url'    => admin_url('admin-ajax.php'),
		'nonce'       => wp_create_nonce('pmi_nonce'),
		'api_key_set' => ! empty(get_option('pmi_api_key', '')),
		'logo'        => PMI_LOGO,
	]);

	wp_enqueue_style(
		'pmi-block-editor',
		PMI_PLUGIN_URL . 'assets/block-editor.css',
		['wp-edit-blocks'],
		PMI_VERSION
	);
});

// ---------------------------------------------------------------------------
// Classic Editor — "Add Pexels Image" button next to Add Media
// ---------------------------------------------------------------------------

// Render the button in the media buttons row above the editor
add_action('media_buttons', function () {
	if (! current_user_can('upload_files')) return;
	if (empty(get_option('pmi_api_key', ''))) return;
	echo '<button type="button" id="pmi-media-btn" class="button">' .
		'<span class="dashicons dashicons-format-image wp-media-buttons-icon" style="vertical-align:middle;"></span> ' .
		esc_html__('Add Pexels Image', 'pexels-media-importer') .
	'</button>';
});

// Output PMI_MCE global before the page scripts run so pexels-media.js can read it
add_action('admin_head', function () {
	if (! current_user_can('upload_files')) return;
	if (empty(get_option('pmi_api_key', ''))) return;
	echo '<script>window.PMI_MCE = ' . wp_json_encode([
		'ajax_url' => admin_url('admin-ajax.php'),
		'nonce'    => wp_create_nonce('pmi_nonce'),
		'logo'     => PMI_LOGO,
	]) . ';</script>' . "\n";
});

// ---------------------------------------------------------------------------
// Page renderers
// ---------------------------------------------------------------------------
function pmi_render_settings_page()
{
	if (! current_user_can('manage_options')) {
		return;
	}
?>
	<div class="wrap pmi-wrap">
		<div class="pmi-header">
			<div class="pmi-logo">
				<?= PMI_LOGO ?>
			</div>
			<h1><?php esc_html_e('Pexels Importer Settings', 'pexels-media-importer'); ?></h1>
		</div>

		<div class="pmi-settings-card">
			<?php if (isset($_GET['settings-updated'])) : ?>
				<div class="pmi-notice pmi-notice-success">
					<span class="dashicons dashicons-yes-alt"></span>
					<?php esc_html_e('Settings saved successfully.', 'pexels-media-importer'); ?>
				</div>
			<?php endif; ?>

			<form method="post" action="options.php">
				<?php
				settings_fields('pmi_settings_group');
				// do_settings_sections( 'pexels-media-importer-settings' );
				?>
				<div class="pmi-field-group">
					<label class="pmi-label" for="pmi_api_key">
						<?php esc_html_e('Pexels API Key', 'pexels-media-importer'); ?>
					</label>
					<?php pmi_render_api_key_field(); ?>
				</div>
				<?php submit_button(__('Save Settings', 'pexels-media-importer'), 'pmi-btn pmi-btn-primary', 'submit', false); ?>
			</form>

			<div class="pmi-help">
				<h3><?php esc_html_e('How to get your API key', 'pexels-media-importer'); ?></h3>
				<ol>
					<li><?php printf(__('Visit <a href="%s" target="_blank">pexels.com/api</a> and create a free account.', 'pexels-media-importer'), 'https://www.pexels.com/api/'); ?></li>
					<li><?php esc_html_e('Click "Your API Key" after logging in.', 'pexels-media-importer'); ?></li>
					<li><?php esc_html_e('Copy the key and paste it above.', 'pexels-media-importer'); ?></li>
				</ol>
			</div>
		</div>
	</div>
<?php
}

function pmi_render_search_page()
{
	if (! current_user_can('upload_files')) {
		return;
	}
	$has_key = ! empty(get_option('pmi_api_key', ''));
?>
	<div class="wrap pmi-wrap">
		<div class="pmi-header">
			<div class="pmi-logo">
				<?= PMI_LOGO ?>
			</div>
			<h1><?php esc_html_e('Pexels Image Search', 'pexels-media-importer'); ?></h1>
		</div>

		<?php if (! $has_key) : ?>
			<div class="pmi-notice pmi-notice-warning">
				<span class="dashicons dashicons-warning"></span>
				<?php printf(
					__('No API key found. Please <a href="%s">add your Pexels API key</a> in Settings.', 'pexels-media-importer'),
					esc_url(admin_url('admin.php?page=pexels-media-importer-settings'))
				); ?>
			</div>
		<?php endif; ?>

		<div class="pmi-search-bar">
			<div class="pmi-search-input-wrap">
				<span class="dashicons dashicons-search pmi-search-icon"></span>
				<input
					type="text"
					id="pmi-search-input"
					placeholder="<?php esc_attr_e('Search for photos… e.g. mountains, coffee, architecture', 'pexels-media-importer'); ?>"
					<?php disabled(! $has_key); ?> />
			</div>
			<div class="pmi-search-controls">
				<select id="pmi-per-page">
					<option value="12">12 per page</option>
					<option value="24" selected>24 per page</option>
					<option value="40">40 per page</option>
					<option value="60">60 per page</option>
					<option value="120">120 per page</option>
				</select>
				<select id="pmi-orientation">
					<option value="">All orientations</option>
					<option value="landscape">Landscape</option>
					<option value="portrait">Portrait</option>
					<option value="square">Square</option>
				</select>
				<select id="pmi-size">
					<option value="">Any size</option>
					<option value="large">Large</option>
					<option value="medium">Medium</option>
					<option value="small">Small</option>
				</select>
				<button id="pmi-search-btn" class="pmi-btn pmi-btn-primary" <?php disabled(! $has_key); ?>>
					<?php esc_html_e('Search', 'pexels-media-importer'); ?>
				</button>
			</div>
		</div>

		<div id="pmi-status" class="pmi-status" style="display:none;"></div>

		<div id="pmi-results-meta" class="pmi-results-meta" style="display:none;">
			<span id="pmi-results-count"></span>
			<div class="pmi-pagination">
				<button id="pmi-prev" class="pmi-btn pmi-btn-secondary" disabled><?php esc_html_e('← Prev', 'pexels-media-importer'); ?></button>
				<span id="pmi-page-info"></span>
				<button id="pmi-next" class="pmi-btn pmi-btn-secondary"><?php esc_html_e('Next →', 'pexels-media-importer'); ?></button>
			</div>
		</div>

		<div id="pmi-grid" class="pmi-grid"></div>

		<div id="pmi-empty" class="pmi-empty" style="display:none;">
			<span class="dashicons dashicons-images-alt2"></span>
			<p><?php esc_html_e('No results found. Try a different search term.', 'pexels-media-importer'); ?></p>
		</div>

		<div id="pmi-spinner" class="pmi-spinner" style="display:none;">
			<div class="pmi-spin"></div>
			<p><?php esc_html_e('Searching Pexels…', 'pexels-media-importer'); ?></p>
		</div>
	</div>

	<!-- Image preview modal -->
	<div id="pmi-modal" class="pmi-modal" style="display:none;">
		<div class="pmi-modal-backdrop"></div>
		<div class="pmi-modal-content">
			<button class="pmi-modal-close" id="pmi-modal-close">&times;</button>
			<div class="pmi-modal-body">
				<div class="pmi-modal-image-wrap">
					<img id="pmi-modal-img" src="" alt="" />
				</div>
				<div class="pmi-modal-info">
					<h2 id="pmi-modal-title"></h2>
					<p class="pmi-modal-photographer">
						<?php esc_html_e('Photo by', 'pexels-media-importer'); ?>
						<a id="pmi-modal-photographer-link" href="#" target="_blank"></a>
						<?php esc_html_e('on Pexels', 'pexels-media-importer'); ?>
					</p>
					<div class="pmi-modal-sizes">
						<p class="pmi-label"><?php esc_html_e('Import size', 'pexels-media-importer'); ?></p>
						<div class="pmi-size-options">
							<label><input type="radio" name="pmi-import-size" value="original" checked /> <?php esc_html_e('Original', 'pexels-media-importer'); ?></label>
							<label><input type="radio" name="pmi-import-size" value="large2x" /> <?php esc_html_e('Large 2×', 'pexels-media-importer'); ?></label>
							<label><input type="radio" name="pmi-import-size" value="large" /> <?php esc_html_e('Large', 'pexels-media-importer'); ?></label>
							<label><input type="radio" name="pmi-import-size" value="medium" /> <?php esc_html_e('Medium', 'pexels-media-importer'); ?></label>
						</div>
					</div>
					<div class="pmi-modal-alt">
						<label class="pmi-label" for="pmi-alt-text"><?php esc_html_e('Alt text', 'pexels-media-importer'); ?></label>
						<input type="text" id="pmi-alt-text" class="pmi-input" placeholder="<?php esc_attr_e('Describe the image…', 'pexels-media-importer'); ?>" />
					</div>
					<button id="pmi-import-btn" class="pmi-btn pmi-btn-primary pmi-btn-full" data-photo-id="">
						<span class="dashicons dashicons-download"></span>
						<?php esc_html_e('Import to Media Library', 'pexels-media-importer'); ?>
					</button>
					<div id="pmi-import-result" class="pmi-import-result" style="display:none;"></div>
					<p class="pmi-attribution">
						<?php printf(
							__('Photos provided by <a href="%s" target="_blank">Pexels</a>', 'pexels-media-importer'),
							'https://www.pexels.com'
						); ?>
					</p>
				</div>
			</div>
		</div>
	</div>
<?php
}

// ---------------------------------------------------------------------------
// AJAX: search Pexels
// ---------------------------------------------------------------------------
add_action('wp_ajax_pmi_search', function () {
	check_ajax_referer('pmi_nonce', 'nonce');

	if (! current_user_can('upload_files')) {
		wp_send_json_error(['message' => __('Permission denied.', 'pexels-media-importer')], 403);
	}

	$api_key = get_option('pmi_api_key', '');
	if (empty($api_key)) {
		wp_send_json_error(['message' => __('API key not set.', 'pexels-media-importer')], 400);
	}

	$query       = sanitize_text_field($_POST['query'] ?? '');
	$page        = absint($_POST['page'] ?? 1);
	$per_page    = min(80, absint($_POST['per_page'] ?? 24));
	$orientation = sanitize_text_field($_POST['orientation'] ?? '');
	$size        = sanitize_text_field($_POST['size'] ?? '');

	if (empty($query)) {
		wp_send_json_error(['message' => __('Please enter a search term.', 'pexels-media-importer')], 400);
	}

	$url = add_query_arg(array_filter([
		'query'       => $query,
		'page'        => $page,
		'per_page'    => $per_page,
		'orientation' => $orientation,
		'size'        => $size,
	]), 'https://api.pexels.com/v1/search');

	$response = wp_remote_get($url, [
		'headers' => ['Authorization' => $api_key],
		'timeout' => 15,
	]);

	if (is_wp_error($response)) {
		wp_send_json_error(['message' => $response->get_error_message()], 500);
	}

	$code = wp_remote_retrieve_response_code($response);
	$body = json_decode(wp_remote_retrieve_body($response), true);

	if (200 !== $code) {
		$msg = $body['error'] ?? __('Pexels API error.', 'pexels-media-importer');
		wp_send_json_error(['message' => $msg], $code);
	}

	wp_send_json_success($body);
});

// ---------------------------------------------------------------------------
// AJAX: check which Pexels photo IDs are already in the media library
// ---------------------------------------------------------------------------
add_action('wp_ajax_pmi_check_imported', function () {
	check_ajax_referer('pmi_nonce', 'nonce');

	if (! current_user_can('upload_files')) {
		wp_send_json_error(['message' => __('Permission denied.', 'pexels-media-importer')], 403);
	}

	$raw_ids = $_POST['ids'] ?? [];
	if (! is_array($raw_ids) || empty($raw_ids)) {
		wp_send_json_success([]);
	}

	// Sanitize — Pexels IDs are integers but stored as strings in meta
	$ids = array_values(array_filter(array_map('sanitize_text_field', $raw_ids)));
	if (empty($ids)) {
		wp_send_json_success([]);
	}

	$query = new WP_Query([
		'post_type'      => 'attachment',
		'post_status'    => 'inherit',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'meta_query'     => [
			[
				'key'     => '_pexels_photo_id',
				'value'   => $ids,
				'compare' => 'IN',
			],
		],
	]);

	$result = [];
	foreach ($query->posts as $attachment_id) {
		$photo_id = get_post_meta($attachment_id, '_pexels_photo_id', true);
		$size     = get_post_meta($attachment_id, '_pexels_import_size', true) ?: 'original';

		// Use string key so JSON encodes as object, not array
		$result[ (string) $photo_id ] = [
			'attachment_id' => $attachment_id,
			'edit_url'      => get_edit_post_link($attachment_id, 'raw'),
			'size'          => $size,
		];
	}

	wp_send_json_success($result);
});

// ---------------------------------------------------------------------------
// AJAX: import photo to media library
// ---------------------------------------------------------------------------
add_action('wp_ajax_pmi_import', function () {
	check_ajax_referer('pmi_nonce', 'nonce');

	if (! current_user_can('upload_files')) {
		wp_send_json_error(['message' => __('Permission denied.', 'pexels-media-importer')], 403);
	}

	$photo_url    = esc_url_raw($_POST['photo_url'] ?? '');
	$photo_id     = sanitize_text_field($_POST['photo_id'] ?? '');
	$photographer = sanitize_text_field($_POST['photographer'] ?? '');
	$alt_text     = sanitize_text_field($_POST['alt_text'] ?? '');
	$import_size  = sanitize_text_field($_POST['import_size'] ?? 'original');

	if (empty($photo_url)) {
		wp_send_json_error(['message' => __('Invalid photo URL.', 'pexels-media-importer')], 400);
	}

	// Download the file
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';

	$tmp = download_url($photo_url, 30);
	if (is_wp_error($tmp)) {
		wp_send_json_error(['message' => $tmp->get_error_message()], 500);
	}

	// Determine file extension from URL
	$url_path  = parse_url($photo_url, PHP_URL_PATH);
	$ext       = pathinfo($url_path, PATHINFO_EXTENSION) ?: 'jpg';
	$filename  = 'pexels-' . $photo_id . '.' . $ext;

	$file_array = [
		'name'     => $filename,
		'tmp_name' => $tmp,
	];

	$attachment_id = media_handle_sideload($file_array, 0, $alt_text ?: 'Pexels photo by ' . $photographer);

	if (is_wp_error($attachment_id)) {
		@unlink($tmp);
		wp_send_json_error(['message' => $attachment_id->get_error_message()], 500);
	}

	// Set alt text and credit
	update_post_meta($attachment_id, '_wp_attachment_image_alt', $alt_text ?: 'Photo by ' . $photographer . ' on Pexels');
	update_post_meta($attachment_id, '_pexels_photo_id', $photo_id);
	update_post_meta($attachment_id, '_pexels_photographer', $photographer);
	update_post_meta($attachment_id, '_pmi_source', 'pexels');
	update_post_meta($attachment_id, '_pexels_import_size', $import_size);

	$edit_url = get_edit_post_link($attachment_id, 'raw');

	wp_send_json_success([
		'attachment_id' => $attachment_id,
		'edit_url'      => $edit_url,
		'url'           => wp_get_attachment_url($attachment_id),
		'size'          => $import_size,
	]);
});

add_action('restrict_manage_posts', function ($post_type) {
	if ('attachment' !== $post_type) return;
	$selected = isset($_GET['pmi_source']) ? $_GET['pmi_source'] : '';
?>
	<select name="pmi_source">
		<option value=""><?php esc_html_e('All sources', 'pexels-media-importer'); ?></option>
		<option value="pexels" <?php selected($selected, 'pexels'); ?>><?php esc_html_e('Pexels Imports', 'pexels-media-importer'); ?></option>
	</select>
<?php
});

// ---------------------------------------------------------------------------
// Filter: filter pexel images in media library
// ---------------------------------------------------------------------------
add_filter('ajax_query_attachments_args', function ($query) {
	if (! empty($_REQUEST['pmi_source']) && 'pexels' === $_REQUEST['pmi_source']) {
		$query['meta_key'] = '_pexels_photo_id';
		$query['meta_compare'] = 'EXISTS';
	}
	return $query;
});

add_action('pre_get_posts', function ($query) {
	if (! is_admin() || ! $query->is_main_query()) return;
	if ('attachment' !== $query->get('post_type')) return;
	if (empty($_GET['pmi_source']) || 'pexels' !== $_GET['pmi_source']) return;

	$query->set('meta_key', '_pexels_photo_id');
	$query->set('meta_compare', 'EXISTS');
});
