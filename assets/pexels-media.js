/* global PMI_MCE, jQuery */
( function ( $ ) {
	'use strict';

	if ( typeof PMI_MCE === 'undefined' ) return;

	// ---- State ----
	var $modal         = null;
	var currentPage    = 1;
	var totalPages     = 1;
	var totalResults   = 0;
	var lastPerPage    = 24;
	var lastOrientation= '';
	var lastSize       = '';
	var currentPhotos  = [];
	var importing      = false;
	var importedMap    = {};
	var sizePickerId   = null;

	// ---- Build modal HTML ----
	function buildModalHtml() {
		return (
			'<div id="pmi-mce-modal" class="pmi-modal" style="display:none;">' +
				'<div class="pmi-modal-backdrop"></div>' +
				'<div class="pmi-mce-panel">' +

					'<div class="pmi-mce-header">' +
						'<div class="pmi-logo pmi-mce-logo">' + PMI_MCE.logo + '</div>' +
						'<span class="pmi-mce-title">Insert Pexels Image</span>' +
						'<button class="pmi-modal-close" id="pmi-mce-close" type="button">&times;</button>' +
					'</div>' +

					'<div class="pmi-search-bar pmi-mce-search-bar">' +
						'<div class="pmi-search-input-wrap">' +
							'<input type="text" id="pmi-mce-input" class="pmi-mce-input"' +
								' placeholder="Search for photos… e.g. mountains, coffee, architecture" />' +
						'</div>' +
						'<div class="pmi-search-controls">' +
							'<select id="pmi-mce-per-page">' +
								'<option value="12">12 per page</option>' +
								'<option value="24" selected>24 per page</option>' +
								'<option value="40">40 per page</option>' +
							'</select>' +
							'<select id="pmi-mce-orientation">' +
								'<option value="">All orientations</option>' +
								'<option value="landscape">Landscape</option>' +
								'<option value="portrait">Portrait</option>' +
								'<option value="square">Square</option>' +
							'</select>' +
							'<select id="pmi-mce-size">' +
								'<option value="">Any size</option>' +
								'<option value="large">Large</option>' +
								'<option value="medium">Medium</option>' +
								'<option value="small">Small</option>' +
							'</select>' +
							'<button id="pmi-mce-search-btn" class="pmi-btn pmi-btn-primary" type="button">Search</button>' +
						'</div>' +
					'</div>' +

					'<div id="pmi-mce-status" class="pmi-status" style="display:none;"></div>' +

					'<div id="pmi-mce-meta" class="pmi-results-meta" style="display:none;">' +
						'<span id="pmi-mce-count"></span>' +
						'<div class="pmi-pagination">' +
							'<button id="pmi-mce-prev" class="pmi-btn pmi-btn-secondary" disabled type="button">← Prev</button>' +
							'<span id="pmi-mce-page-info" class="pmi-page-info"></span>' +
							'<button id="pmi-mce-next" class="pmi-btn pmi-btn-secondary" type="button">Next →</button>' +
						'</div>' +
					'</div>' +

					'<div class="pmi-mce-body">' +
						'<div id="pmi-mce-spinner" class="pmi-spinner" style="display:none;">' +
							'<div class="pmi-spin"></div>' +
							'<p>Searching Pexels…</p>' +
						'</div>' +
						'<div id="pmi-mce-empty" class="pmi-empty" style="display:none;">' +
							'<span class="dashicons dashicons-images-alt2"></span>' +
							'<p>No results found. Try a different search term.</p>' +
						'</div>' +
						'<div id="pmi-mce-grid" class="pmi-grid"></div>' +
					'</div>' +

					'<div class="pmi-mce-footer">' +
						'<p class="pmi-attribution">Photos provided by ' +
							'<a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a>' +
						'</p>' +
					'</div>' +

				'</div>' +
			'</div>'
		);
	}

	// ---- Init modal (once) ----
	function initModal() {
		if ( $modal ) return;
		$modal = $( buildModalHtml() ).appendTo( 'body' );
		bindEvents();
	}

	// ---- Events ----
	function bindEvents() {
		$modal.on( 'click', '.pmi-modal-backdrop, #pmi-mce-close', closeModal );

		$modal.on( 'click', '#pmi-mce-search-btn', function () { doSearch( 1 ); } );
		$modal.on( 'keypress', '#pmi-mce-input', function ( e ) {
			if ( e.which === 13 ) doSearch( 1 );
		} );

		$modal.on( 'click', '#pmi-mce-prev', function () {
			if ( currentPage > 1 ) doSearch( currentPage - 1 );
		} );
		$modal.on( 'click', '#pmi-mce-next', function () {
			if ( currentPage < totalPages ) doSearch( currentPage + 1 );
		} );

		$modal.on( 'click', '.pmi-mce-insert-btn', function ( e ) {
			e.stopPropagation();
			if ( importing ) return;
			var photo = $( this ).closest( '.pmi-card' ).data( 'photo' );
			var size  = $( this ).data( 'size' ) || 'original';
			if ( photo ) selectPhoto( photo, size );
		} );

		$modal.on( 'click', '.pmi-mce-size-toggle', function ( e ) {
			e.stopPropagation();
			var photoId = $( this ).data( 'id' );
			if ( sizePickerId === photoId ) {
				sizePickerId = null;
				$modal.find( '.pmi-mce-size-picker' ).remove();
			} else {
				sizePickerId = photoId;
				$modal.find( '.pmi-mce-size-picker' ).remove();
				showSizePicker( $( this ).closest( '.pmi-card-overlay' ), photoId );
			}
		} );

		// Click anywhere else in modal collapses size picker
		$modal.on( 'click', function () {
			if ( sizePickerId ) {
				sizePickerId = null;
				$modal.find( '.pmi-mce-size-picker' ).remove();
			}
		} );
	}

	// ---- Open / close ----
	function openModal() {
		initModal();
		$modal.find( '#pmi-mce-status' ).hide().removeClass( 'error info' );
		$modal.show();
		$( 'body' ).css( 'overflow', 'hidden' );
		$( document ).on( 'keyup.pmi-mce', function ( e ) {
			if ( e.key === 'Escape' ) closeModal();
		} );
		setTimeout( function () { $modal.find( '#pmi-mce-input' ).trigger( 'focus' ); }, 60 );
	}

	function closeModal() {
		if ( ! $modal ) return;
		$modal.hide();
		$( 'body' ).css( 'overflow', '' );
		$( document ).off( 'keyup.pmi-mce' );
	}

	// ---- Search ----
	function doSearch( page ) {
		var query = $modal.find( '#pmi-mce-input' ).val().trim();
		if ( ! query ) return;

		currentPage      = page || 1;
		lastPerPage      = parseInt( $modal.find( '#pmi-mce-per-page' ).val(), 10 );
		lastOrientation  = $modal.find( '#pmi-mce-orientation' ).val();
		lastSize         = $modal.find( '#pmi-mce-size' ).val();
		sizePickerId     = null;

		$modal.find( '#pmi-mce-grid' ).empty();
		$modal.find( '#pmi-mce-empty, #pmi-mce-status, #pmi-mce-meta' ).hide();
		$modal.find( '#pmi-mce-spinner' ).show();

		$.post( PMI_MCE.ajax_url, {
			action      : 'pmi_search',
			nonce       : PMI_MCE.nonce,
			query       : query,
			page        : currentPage,
			per_page    : lastPerPage,
			orientation : lastOrientation,
			size        : lastSize,
		} )
		.done( function ( res ) {
			$modal.find( '#pmi-mce-spinner' ).hide();
			if ( ! res.success ) {
				showStatus( res.data.message || 'Search failed.', 'error' );
				return;
			}
			renderResults( res.data );
		} )
		.fail( function () {
			$modal.find( '#pmi-mce-spinner' ).hide();
			showStatus( 'Search failed. Please check your connection and try again.', 'error' );
		} );
	}

	// ---- Render results ----
	function renderResults( data ) {
		totalResults  = data.total_results || 0;
		totalPages    = Math.ceil( totalResults / lastPerPage ) || 1;
		currentPhotos = data.photos || [];

		if ( ! currentPhotos.length ) {
			$modal.find( '#pmi-mce-empty' ).show();
			return;
		}

		$modal.find( '#pmi-mce-count' ).text( totalResults.toLocaleString() + ' photos found' );
		$modal.find( '#pmi-mce-page-info' ).text( 'Page ' + currentPage + ' of ' + totalPages );
		$modal.find( '#pmi-mce-prev' ).prop( 'disabled', currentPage <= 1 );
		$modal.find( '#pmi-mce-next' ).prop( 'disabled', currentPage >= totalPages );
		$modal.find( '#pmi-mce-meta' ).show();

		var $grid = $modal.find( '#pmi-mce-grid' );
		currentPhotos.forEach( function ( photo ) {
			var $card = buildCard( photo );
			$card.data( 'photo', photo );
			$grid.append( $card );
		} );

		checkImported( currentPhotos );
	}

	// ---- Build card ----
	function buildCard( photo ) {
		var inLibrary = !! importedMap[ String( photo.id ) ];

		var actionsHtml = inLibrary
			? '<button class="pmi-card-btn pmi-card-btn-import imported pmi-mce-insert-btn"' +
			  ' data-id="' + photo.id + '" data-size="original" type="button">' +
			  '<span class="dashicons dashicons-database-import"></span> Use from Library</button>'

			: '<button class="pmi-card-btn pmi-card-btn-import pmi-mce-insert-btn"' +
			  ' data-id="' + photo.id + '" data-size="original" type="button">' +
			  '<span class="dashicons dashicons-download"></span> Insert</button>' +
			  '<button class="pmi-card-btn pmi-card-btn-view pmi-mce-size-toggle"' +
			  ' data-id="' + photo.id + '" title="Choose import size" type="button">' +
			  '<span class="dashicons dashicons-editor-expand"></span></button>';

		return $( '<div class="pmi-card" />' ).html(
			'<img src="' + escAttr( photo.src.medium ) + '"' +
			     ' alt="' + escAttr( photo.alt || '' ) + '"' +
			     ' loading="lazy" />' +
			( inLibrary
				? '<div class="pmi-card-imported-badge"><span class="dashicons dashicons-yes-alt"></span></div>'
				: ''
			) +
			'<div class="pmi-card-overlay">' +
				'<div class="pmi-card-photographer">' + escHtml( photo.photographer ) + '</div>' +
				'<div class="pmi-card-action">' + actionsHtml + '</div>' +
			'</div>'
		);
	}

	// ---- Size picker ----
	function showSizePicker( $overlay, photoId ) {
		var sizes = [
			{ label: 'Original', value: 'original' },
			{ label: 'Large 2×', value: 'large2x'  },
			{ label: 'Large',    value: 'large'     },
			{ label: 'Medium',   value: 'medium'    },
		];
		var html = '<div class="pmi-mce-size-picker"><p class="pmi-mce-size-label">Import size</p>';
		sizes.forEach( function ( s ) {
			html += '<button class="pmi-mce-size-opt pmi-mce-insert-btn"' +
				' data-id="' + photoId + '" data-size="' + s.value + '" type="button">' +
				escHtml( s.label ) + '</button>';
		} );
		html += '</div>';
		$overlay.append( html );
	}

	// ---- DB import check ----
	function checkImported( photos ) {
		if ( ! photos.length ) return;
		$.post( PMI_MCE.ajax_url, {
			action : 'pmi_check_imported',
			nonce  : PMI_MCE.nonce,
			ids    : photos.map( function ( p ) { return p.id; } ),
		} ).done( function ( res ) {
			if ( ! res.success ) return;
			$.extend( importedMap, res.data );
			$.each( res.data, function ( photoIdStr ) {
				markCardImported( parseInt( photoIdStr, 10 ) );
			} );
		} );
	}

	function markCardImported( photoId ) {
		var $card = $modal.find( '#pmi-mce-grid .pmi-card' ).filter( function () {
			var p = $( this ).data( 'photo' );
			return p && p.id === photoId;
		} );
		if ( ! $card.length ) return;

		if ( ! $card.find( '.pmi-card-imported-badge' ).length ) {
			$card.append( '<div class="pmi-card-imported-badge"><span class="dashicons dashicons-yes-alt"></span></div>' );
		}
		$card.find( '.pmi-card-action' ).html(
			'<button class="pmi-card-btn pmi-card-btn-import imported pmi-mce-insert-btn"' +
			' data-id="' + photoId + '" data-size="original" type="button">' +
			'<span class="dashicons dashicons-database-import"></span> Use from Library</button>'
		);
	}

	// ---- Select / import ----
	function selectPhoto( photo, importSize ) {
		if ( importing ) return;
		importSize   = importSize || 'original';
		importing    = true;
		sizePickerId = null;
		$modal.find( '.pmi-mce-size-picker' ).remove();

		var $card = $modal.find( '#pmi-mce-grid .pmi-card' ).filter( function () {
			var p = $( this ).data( 'photo' );
			return p && p.id === photo.id;
		} );
		var existing    = importedMap[ String( photo.id ) ];
		var loadingText = existing ? 'Inserting…' : 'Importing…';

		$card.find( '.pmi-card-action' ).html(
			'<span class="pmi-mce-loading-label">' +
				'<span class="dashicons dashicons-update pmi-rotating"></span> ' + loadingText +
			'</span>'
		);

		if ( existing ) {
			insertIntoEditor( existing.attachment_id, photo.alt || '', photo.src.large2x || photo.src.large );
			return;
		}

		$.post( PMI_MCE.ajax_url, {
			action       : 'pmi_import',
			nonce        : PMI_MCE.nonce,
			photo_url    : photo.src[ importSize ] || photo.src.original,
			photo_id     : photo.id,
			photographer : photo.photographer,
			alt_text     : photo.alt || '',
			import_size  : importSize,
		} )
		.done( function ( res ) {
			importing = false;
			if ( ! res.success ) {
				showStatus( res.data.message || 'Import failed. Please try again.', 'error' );
				restoreCardActions( $card, photo );
				return;
			}
			insertIntoEditor( res.data.attachment_id, photo.alt || '', res.data.url );
		} )
		.fail( function () {
			importing = false;
			showStatus( 'Import failed. Please try again.', 'error' );
			restoreCardActions( $card, photo );
		} );
	}

	function restoreCardActions( $card, photo ) {
		$card.find( '.pmi-card-action' ).html(
			'<button class="pmi-card-btn pmi-card-btn-import pmi-mce-insert-btn"' +
			' data-id="' + photo.id + '" data-size="original" type="button">' +
			'<span class="dashicons dashicons-download"></span> Insert</button>' +
			'<button class="pmi-card-btn pmi-card-btn-view pmi-mce-size-toggle"' +
			' data-id="' + photo.id + '" type="button">' +
			'<span class="dashicons dashicons-editor-expand"></span></button>'
		);
	}

	// ---- Insert into editor ----
	// Uses window.send_to_editor() — the WordPress standard API for media buttons.
	// It automatically targets the active editor in both Visual and Text mode.
	function insertIntoEditor( attachmentId, alt, url ) {
		var imgHtml =
			'<img' +
			' src="'   + escAttr( url ) + '"' +
			' alt="'   + escAttr( alt ) + '"' +
			' class="alignnone size-full wp-image-' + parseInt( attachmentId, 10 ) + '"' +
			' />';

		closeModal();

		// Small delay to let the modal finish closing before inserting,
		// so TinyMCE reclaims focus cleanly.
		setTimeout( function () {
			if ( typeof window.send_to_editor === 'function' ) {
				window.send_to_editor( imgHtml );
			} else if ( typeof window.tinymce !== 'undefined' && tinymce.activeEditor ) {
				tinymce.activeEditor.execCommand( 'mceInsertContent', false, imgHtml );
			}
			importing = false;
		}, 50 );
	}

	// ---- Helpers ----
	function showStatus( msg, type ) {
		$modal.find( '#pmi-mce-status' )
			.text( msg )
			.removeClass( 'error info' )
			.addClass( type )
			.show();
	}
	function escHtml( str ) {
		return $( '<div>' ).text( str || '' ).html();
	}
	function escAttr( str ) {
		return ( str || '' ).replace( /"/g, '&quot;' );
	}

	// ---- Bind the Add Media-row button ----
	$( document ).on( 'click', '#pmi-media-btn', function ( e ) {
		e.preventDefault();
		openModal();
	} );

} )( jQuery );