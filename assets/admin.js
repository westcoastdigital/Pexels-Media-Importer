/* global PMI, jQuery */
( function ( $ ) {
	'use strict';

	// ---- State ----
	let currentPage     = 1;
	let totalResults    = 0;
	let totalPages      = 1;
	let lastQuery       = '';
	let lastPerPage     = 24;
	let lastOrientation = '';
	let lastSize        = '';
	let currentPhoto    = null;

	// importedIds: Map< photoId (number) => { edit_url, size } >
	// Covers both session imports and DB-verified imports.
	let importedIds = new Map();

	// Human-readable labels for size keys
	const SIZE_LABELS = {
		original : 'Original',
		large2x  : 'Large 2×',
		large    : 'Large',
		medium   : 'Medium',
	};

	// ---- DOM refs ----
	const $searchInput  = $( '#pmi-search-input' );
	const $searchBtn    = $( '#pmi-search-btn' );
	const $perPage      = $( '#pmi-per-page' );
	const $orientation  = $( '#pmi-orientation' );
	const $size         = $( '#pmi-size' );
	const $grid         = $( '#pmi-grid' );
	const $spinner      = $( '#pmi-spinner' );
	const $empty        = $( '#pmi-empty' );
	const $status       = $( '#pmi-status' );
	const $resultsMeta  = $( '#pmi-results-meta' );
	const $resultsCount = $( '#pmi-results-count' );
	const $pageInfo     = $( '#pmi-page-info' );
	const $prevBtn      = $( '#pmi-prev' );
	const $nextBtn      = $( '#pmi-next' );
	const $modal        = $( '#pmi-modal' );
	const $modalImg     = $( '#pmi-modal-img' );
	const $modalTitle   = $( '#pmi-modal-title' );
	const $modalPhotog  = $( '#pmi-modal-photographer-link' );
	const $importBtn    = $( '#pmi-import-btn' );
	const $importResult = $( '#pmi-import-result' );
	const $altText      = $( '#pmi-alt-text' );

	// ---- Search ----
	function doSearch( page ) {
		const query = $searchInput.val().trim();
		if ( ! query ) return;

		lastQuery       = query;
		lastPerPage     = parseInt( $perPage.val(), 10 );
		lastOrientation = $orientation.val();
		lastSize        = $size.val();
		currentPage     = page || 1;

		$grid.empty();
		$empty.hide();
		$status.hide();
		$resultsMeta.hide();
		$spinner.show();

		$.post( PMI.ajax_url, {
			action      : 'pmi_search',
			nonce       : PMI.nonce,
			query       : lastQuery,
			page        : currentPage,
			per_page    : lastPerPage,
			orientation : lastOrientation,
			size        : lastSize,
		} )
		.done( function ( res ) {
			$spinner.hide();
			if ( ! res.success ) {
				showStatus( res.data.message, 'error' );
				return;
			}
			renderResults( res.data );
		} )
		.fail( function () {
			$spinner.hide();
			showStatus( PMI.strings.error, 'error' );
		} );
	}

	function renderResults( data ) {
		totalResults = data.total_results || 0;
		totalPages   = Math.ceil( totalResults / lastPerPage );

		if ( ! data.photos || data.photos.length === 0 ) {
			$empty.show();
			return;
		}

		$resultsCount.text( totalResults.toLocaleString() + ' photos found' );
		$pageInfo.text( 'Page ' + currentPage + ' of ' + totalPages );
		$prevBtn.prop( 'disabled', currentPage <= 1 );
		$nextBtn.prop( 'disabled', currentPage >= totalPages );
		$resultsMeta.show();

		data.photos.forEach( function ( photo ) {
			const alreadyImported = importedIds.has( photo.id );
			const $card = buildCard( photo, alreadyImported );
			$card.data( 'photo', photo );
			$grid.append( $card );
		} );

		// Check the DB for any photos already imported that we don't know about
		// (e.g. imported in a previous session or by another user).
		checkImportedInLibrary( data.photos );
	}

	// Build a card element. alreadyImported = we already know it's in the library.
	function buildCard( photo, alreadyImported ) {
		const importedData = importedIds.get( photo.id );

		const actionHtml = alreadyImported
			? buildLibraryBtnHtml( photo.id, importedData ? importedData.edit_url : '#' )
			: '<button class="pmi-card-btn pmi-card-btn-import" data-id="' + photo.id + '">' +
			  '<span class="dashicons dashicons-download"></span> Import' +
			  '</button>';

		const $card = $( '<div class="pmi-card" />' ).html(
			'<img src="' + escAttr( photo.src.medium ) + '" alt="' + escAttr( photo.alt || '' ) + '" loading="lazy" />' +
			( alreadyImported ? '<div class="pmi-card-imported-badge"><span class="dashicons dashicons-yes-alt"></span></div>' : '' ) +
			'<div class="pmi-card-overlay">' +
				'<div class="pmi-card-photographer">' + escHtml( photo.photographer ) + '</div>' +
				'<div class="pmi-card-action">' +
					'<button class="pmi-card-btn pmi-card-btn-view" data-id="' + photo.id + '">' +
						'<span class="dashicons dashicons-visibility"></span> View' +
					'</button>' +
					actionHtml +
				'</div>' +
			'</div>'
		);

		return $card;
	}

	function buildLibraryBtnHtml( photoId, editUrl ) {
		return '<a href="' + escAttr( editUrl || '#' ) + '" target="_blank" ' +
		       'class="pmi-card-btn pmi-card-btn-library" data-id="' + photoId + '" ' +
		       'onclick="event.stopPropagation()">' +
		       '<span class="dashicons dashicons-media-default"></span> In Library' +
		       '</a>';
	}

	// ---------------------------------------------------------------------------
	// DB check — fires after each page of results renders
	// ---------------------------------------------------------------------------
	function checkImportedInLibrary( photos ) {
		if ( ! photos || ! photos.length ) return;

		const ids = photos.map( function ( p ) { return p.id; } );

		$.post( PMI.ajax_url, {
			action : 'pmi_check_imported',
			nonce  : PMI.nonce,
			ids    : ids,
		} )
		.done( function ( res ) {
			if ( ! res.success ) return;

			$.each( res.data, function ( photoIdStr, data ) {
				const photoId = parseInt( photoIdStr, 10 );
				// Store / update in our local map
				importedIds.set( photoId, {
					edit_url : data.edit_url,
					size     : data.size || 'original',
				} );
				// Update the card if it's on screen
				markCardImported( photoId, importedIds.get( photoId ) );
			} );
		} );
	}

	// Update a rendered card to show "In Library" state.
	function markCardImported( photoId, data ) {
		const $card = $grid.find( '.pmi-card' ).filter( function () {
			const p = $( this ).data( 'photo' );
			return p && p.id === photoId;
		} );
		if ( ! $card.length ) return;

		// Add the badge if not already there
		if ( ! $card.find( '.pmi-card-imported-badge' ).length ) {
			$card.append( '<div class="pmi-card-imported-badge"><span class="dashicons dashicons-yes-alt"></span></div>' );
		}

		// Swap Import button → In Library link (leave View button alone)
		const $importCardBtn = $card.find( '.pmi-card-btn-import' );
		if ( $importCardBtn.length ) {
			$importCardBtn.replaceWith( buildLibraryBtnHtml( photoId, data.edit_url ) );
		}
	}

	// ---- Quick-import from card button ----
	$grid.on( 'click', '.pmi-card-btn-import', function ( e ) {
		e.stopPropagation();
		const $btn  = $( this );
		const $card = $btn.closest( '.pmi-card' );
		const photo = $card.data( 'photo' );
		if ( ! photo ) return;

		$btn.prop( 'disabled', true ).html( '<span class="dashicons dashicons-update pmi-rotating"></span> Importing…' );

		importPhoto(
			photo.src.original,
			photo.id,
			photo.photographer,
			photo.alt || '',
			'original',
			function ( ok, msg, editUrl, size ) {
				if ( ok ) {
					const importData = { edit_url: editUrl, size: size || 'original' };
					importedIds.set( photo.id, importData );
					markCardImported( photo.id, importData );
				} else {
					$btn.prop( 'disabled', false ).html( '<span class="dashicons dashicons-download"></span> Import' );
					showStatus( msg, 'error' );
				}
			}
		);
	} );

	// ---- View photo in modal ----
	$grid.on( 'click', '.pmi-card-btn-view, .pmi-card', function ( e ) {
		// Don't open modal if the click was on the import or library button
		if (
			$( e.target ).hasClass( 'pmi-card-btn-import' ) ||
			$( e.target ).closest( '.pmi-card-btn-import' ).length ||
			$( e.target ).hasClass( 'pmi-card-btn-library' ) ||
			$( e.target ).closest( '.pmi-card-btn-library' ).length
		) return;

		const $card = $( this ).closest( '.pmi-card' );
		const photo = $card.data( 'photo' );
		if ( ! photo ) return;
		openModal( photo );
	} );

	function openModal( photo ) {
		currentPhoto = photo;
		$modalImg.attr( { src: photo.src.large, alt: photo.alt || '' } );
		$modalTitle.text( photo.alt || 'Photo by ' + photo.photographer );
		$modalPhotog.text( photo.photographer ).attr( 'href', photo.photographer_url );
		$altText.val( photo.alt || '' );

		// Reset size radios to enabled, default to original
		$( 'input[name="pmi-import-size"]' )
			.prop( 'disabled', false )
			.closest( 'label' )
			.removeClass( 'pmi-size-already-imported' );
		$( 'input[name="pmi-import-size"][value="original"]' ).prop( 'checked', true );

		const importedData = importedIds.get( photo.id );

		if ( importedData ) {
			// Disable the size already imported and mark its label
			const $alreadyRadio = $( 'input[name="pmi-import-size"][value="' + importedData.size + '"]' );
			$alreadyRadio
				.prop( 'disabled', true )
				.prop( 'checked', false )
				.closest( 'label' )
				.addClass( 'pmi-size-already-imported' );

			// If the disabled size was the default (original), pre-select the next option
			if ( importedData.size === 'original' ) {
				$( 'input[name="pmi-import-size"][value="large2x"]' ).prop( 'checked', true );
			}

			// Show info strip — already in library
			const sizeLabel = SIZE_LABELS[ importedData.size ] || importedData.size;
			$importResult
				.removeClass( 'error success' )
				.addClass( 'info' )
				.html(
					'<span class="dashicons dashicons-yes-alt"></span> ' +
					'Already imported as <strong>' + escHtml( sizeLabel ) + '</strong>. ' +
					'<a href="' + escAttr( importedData.edit_url ) + '" target="_blank">View in Media Library →</a>'
				)
				.show();

			// Import button stays active so they can pull a different size
			$importBtn
				.data( 'photo-id', photo.id )
				.prop( 'disabled', false )
				.html( '<span class="dashicons dashicons-download"></span> Import Different Size' );

		} else {
			$importResult.hide();
			$importBtn
				.data( 'photo-id', photo.id )
				.prop( 'disabled', false )
				.html( '<span class="dashicons dashicons-download"></span> Import to Media Library' );
		}

		$modal.show();
		$( 'body' ).css( 'overflow', 'hidden' );
	}

	// ---- Modal import ----
	$importBtn.on( 'click', function () {
		if ( ! currentPhoto ) return;

		const size     = $( 'input[name="pmi-import-size"]:checked' ).val() || 'original';
		const photoUrl = currentPhoto.src[ size ] || currentPhoto.src.original;
		const alt      = $altText.val().trim();

		$importBtn.prop( 'disabled', true ).html( '<span class="dashicons dashicons-update pmi-rotating"></span> Importing…' );
		$importResult.hide();

		importPhoto(
			photoUrl,
			currentPhoto.id,
			currentPhoto.photographer,
			alt,
			size,
			function ( ok, msg, editUrl, importedSize ) {
				if ( ok ) {
					const importData = { edit_url: editUrl, size: importedSize || size };
					importedIds.set( currentPhoto.id, importData );
					markCardImported( currentPhoto.id, importData );

					$importBtn.html( '<span class="dashicons dashicons-yes"></span> Imported!' );
					$importResult
						.removeClass( 'error info' ).addClass( 'success' )
						.html( 'Saved! <a href="' + escAttr( editUrl ) + '" target="_blank">Edit in Media Library →</a>' )
						.show();

					// Disable the just-imported size radio for this session
					const $justImported = $( 'input[name="pmi-import-size"][value="' + importData.size + '"]' );
					$justImported
						.prop( 'disabled', true )
						.prop( 'checked', false )
						.closest( 'label' )
						.addClass( 'pmi-size-already-imported' );

					// Re-enable import button for other sizes
					$importBtn
						.prop( 'disabled', false )
						.html( '<span class="dashicons dashicons-download"></span> Import Different Size' );

				} else {
					$importBtn
						.prop( 'disabled', false )
						.html( '<span class="dashicons dashicons-download"></span> Import to Media Library' );
					$importResult.removeClass( 'success info' ).addClass( 'error' ).text( msg ).show();
				}
			}
		);
	} );

	// ---- Close modal ----
	$( '#pmi-modal-close, .pmi-modal-backdrop' ).on( 'click', closeModal );
	$( document ).on( 'keyup', function ( e ) { if ( e.key === 'Escape' ) closeModal(); } );

	function closeModal() {
		$modal.hide();
		$( 'body' ).css( 'overflow', '' );
		currentPhoto = null;
	}

	// ---- Core import function ----
	// cb( ok, message, editUrl, size )
	function importPhoto( url, id, photographer, alt, size, cb ) {
		$.post( PMI.ajax_url, {
			action       : 'pmi_import',
			nonce        : PMI.nonce,
			photo_url    : url,
			photo_id     : id,
			photographer : photographer,
			alt_text     : alt,
			import_size  : size,
		} )
		.done( function ( res ) {
			if ( res.success ) {
				cb( true, PMI.strings.imported, res.data.edit_url, res.data.size );
			} else {
				cb( false, res.data.message || PMI.strings.error );
			}
		} )
		.fail( function () {
			cb( false, PMI.strings.error );
		} );
	}

	// ---- Pagination ----
	$prevBtn.on( 'click', function () { if ( currentPage > 1 ) doSearch( currentPage - 1 ); } );
	$nextBtn.on( 'click', function () { if ( currentPage < totalPages ) doSearch( currentPage + 1 ); } );

	// ---- Search triggers ----
	$searchBtn.on( 'click', function () { doSearch( 1 ); } );
	$searchInput.on( 'keypress', function ( e ) { if ( e.which === 13 ) doSearch( 1 ); } );

	// ---- Helpers ----
	function showStatus( msg, type ) {
		$status.text( msg ).removeClass( 'error info' ).addClass( type ).show();
	}
	function escHtml( str ) {
		return $( '<div>' ).text( str || '' ).html();
	}
	function escAttr( str ) {
		return ( str || '' ).replace( /"/g, '&quot;' );
	}

	// Rotating animation for spinner dashicon
	$( '<style>.pmi-rotating { animation: pmi-spin .7s linear infinite; display: inline-block; }</style>' ).appendTo( 'head' );

} )( jQuery );