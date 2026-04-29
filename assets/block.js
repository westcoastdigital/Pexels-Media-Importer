/* global PMI_Block, jQuery, wp */
( function ( $, blocks, element, data, i18n ) {
	'use strict';

	var el          = element.createElement;
	var useState    = element.useState;
	var Fragment    = element.Fragment;
	var useDispatch = data.useDispatch;
	var __          = i18n.__;

	var SIZE_OPTIONS = [
		{ label: 'Original', value: 'original' },
		{ label: 'Large 2×', value: 'large2x'  },
		{ label: 'Large',    value: 'large'     },
		{ label: 'Medium',   value: 'medium'    },
	];

	// ---------------------------------------------------------------------------
	// Edit component
	// ---------------------------------------------------------------------------
	function PexelsBlockEdit( props ) {
		var clientId    = props.clientId;
		var replaceBlocks = useDispatch( 'core/block-editor' ).replaceBlocks;

		// Search state
		var _q   = useState( '' );    var query       = _q[0];   var setQuery       = _q[1];
		var _pp  = useState( 24 );    var perPage     = _pp[0];  var setPerPage     = _pp[1];
		var _ori = useState( '' );    var orientation = _ori[0]; var setOrientation = _ori[1];
		var _sz  = useState( '' );    var size        = _sz[0];  var setSize        = _sz[1];

		// Results state
		var _ph  = useState( [] );    var photos     = _ph[0];   var setPhotos     = _ph[1];
		var _tr  = useState( 0 );     var totalRes   = _tr[0];   var setTotalRes   = _tr[1];
		var _tp  = useState( 1 );     var totalPages = _tp[0];   var setTotalPages = _tp[1];
		var _pg  = useState( 1 );     var page       = _pg[0];   var setPage       = _pg[1];

		// UI state
		var _ld  = useState( false ); var loading    = _ld[0];   var setLoading    = _ld[1];
		var _imp = useState( null );  var importing  = _imp[0];  var setImporting  = _imp[1];
		var _err = useState( '' );    var error      = _err[0];  var setError      = _err[1];
		var _im  = useState( {} );    var importedMap = _im[0];  var setImportedMap = _im[1];
		var _sp  = useState( null );  var sizePickId = _sp[0];   var setSizePickId = _sp[1];
		var _hov = useState( null );  var hoverId    = _hov[0];  var setHoverId    = _hov[1];

		// ---- Search ----
		function doSearch( pg ) {
			if ( ! query.trim() ) return;
			pg = pg || 1;
			setLoading( true );
			setError( '' );
			setPhotos( [] );
			setSizePickId( null );

			$.post( PMI_Block.ajax_url, {
				action      : 'pmi_search',
				nonce       : PMI_Block.nonce,
				query       : query.trim(),
				page        : pg,
				per_page    : perPage,
				orientation : orientation,
				size        : size,
			} )
			.done( function ( res ) {
				setLoading( false );
				if ( ! res.success ) {
					setError( res.data.message || 'Search failed.' );
					return;
				}
				var list  = res.data.photos || [];
				var total = res.data.total_results || 0;
				setPhotos( list );
				setTotalRes( total );
				setTotalPages( Math.ceil( total / perPage ) || 1 );
				setPage( pg );
				checkImported( list );
			} )
			.fail( function () {
				setLoading( false );
				setError( 'Search failed. Please check your connection and try again.' );
			} );
		}

		function checkImported( list ) {
			if ( ! list.length ) return;
			$.post( PMI_Block.ajax_url, {
				action : 'pmi_check_imported',
				nonce  : PMI_Block.nonce,
				ids    : list.map( function ( p ) { return p.id; } ),
			} ).done( function ( res ) {
				if ( res.success ) {
					setImportedMap( function ( prev ) {
						return Object.assign( {}, prev, res.data );
					} );
				}
			} );
		}

		// ---- Select / import photo ----
		function selectPhoto( photo, importSize ) {
			importSize = importSize || 'original';
			setImporting( photo.id );
			setSizePickId( null );

			var existing = importedMap[ String( photo.id ) ];

			if ( existing ) {
				// Already in Media Library — use it directly
				insertCoreImageBlock( existing.attachment_id, photo.alt || '', photo.src.large2x || photo.src.large );
				return;
			}

			// Import from Pexels then insert
			$.post( PMI_Block.ajax_url, {
				action       : 'pmi_import',
				nonce        : PMI_Block.nonce,
				photo_url    : photo.src[ importSize ] || photo.src.original,
				photo_id     : photo.id,
				photographer : photo.photographer,
				alt_text     : photo.alt || '',
				import_size  : importSize,
			} )
			.done( function ( res ) {
				if ( ! res.success ) {
					setImporting( null );
					setError( res.data.message || 'Import failed.' );
					return;
				}
				insertCoreImageBlock( res.data.attachment_id, photo.alt || '', res.data.url );
			} )
			.fail( function () {
				setImporting( null );
				setError( 'Import failed. Please try again.' );
			} );
		}

		function insertCoreImageBlock( attachmentId, alt, url ) {
			replaceBlocks(
				clientId,
				blocks.createBlock( 'core/image', {
					id      : attachmentId,
					url     : url,
					alt     : alt,
					sizeSlug: 'full',
				} )
			);
		}

		function onSearchKeyDown( e ) {
			if ( e.key === 'Enter' ) doSearch( 1 );
		}

		// ---- Render helpers ----
		function renderSizePicker( photo ) {
			return el( 'div', { className: 'pmi-b-size-picker', onClick: function ( e ) { e.stopPropagation(); } },
				el( 'p', { className: 'pmi-b-size-picker-label' }, 'Choose import size' ),
				SIZE_OPTIONS.map( function ( opt ) {
					return el( 'button', {
						key       : opt.value,
						className : 'pmi-b-size-opt',
						onClick   : function ( e ) { e.stopPropagation(); selectPhoto( photo, opt.value ); },
					}, opt.label );
				} )
			);
		}

		function renderCard( photo ) {
			var id          = photo.id;
			var isImporting = importing === id;
			var inLibrary   = !! importedMap[ String( id ) ];
			var showPicker  = sizePickId === id;
			var isHovered   = hoverId === id;

			return el( 'div', {
				key          : id,
				className    : 'pmi-b-card' + ( inLibrary ? ' pmi-b-card--imported' : '' ) + ( isHovered ? ' pmi-b-card--hovered' : '' ),
				onMouseEnter : function () { setHoverId( id ); },
				onMouseLeave : function () { setHoverId( null ); setSizePickId( null ); },
			},
				el( 'img', { src: photo.src.small || photo.src.medium, alt: photo.alt || '', loading: 'lazy' } ),

				// Already-in-library badge
				inLibrary && el( 'div', { className: 'pmi-b-badge' },
					el( 'span', { className: 'dashicons dashicons-yes-alt' } )
				),

				// Hover overlay
				el( 'div', { className: 'pmi-b-overlay' },

					isImporting
						? el( 'div', { className: 'pmi-b-importing' },
							el( 'div', { className: 'pmi-b-spin' } ),
							el( 'span', null, inLibrary ? 'Inserting…' : 'Importing…' )
						  )
						: el( Fragment, null,
							el( 'div', { className: 'pmi-b-photographer' }, photo.photographer ),

							el( 'div', { className: 'pmi-b-actions' },
								// Already in library — single insert button
								inLibrary
									? el( 'button', {
										className : 'pmi-b-btn pmi-b-btn--insert',
										onClick   : function ( e ) { e.stopPropagation(); selectPhoto( photo ); },
									},
										el( 'span', { className: 'dashicons dashicons-database-import' } ),
										' Use from Library'
									  )
									: el( Fragment, null,
										el( 'button', {
											className : 'pmi-b-btn pmi-b-btn--insert',
											onClick   : function ( e ) { e.stopPropagation(); selectPhoto( photo, 'original' ); },
										},
											el( 'span', { className: 'dashicons dashicons-download' } ),
											' Insert'
										  ),
										el( 'button', {
											className : 'pmi-b-btn pmi-b-btn--size' + ( showPicker ? ' active' : '' ),
											onClick   : function ( e ) { e.stopPropagation(); setSizePickId( showPicker ? null : id ); },
											title     : 'Choose import size',
										},
											el( 'span', { className: 'dashicons dashicons-editor-expand' } )
										  )
									  )
							),

							// Size picker panel
							showPicker && renderSizePicker( photo )
						  )
				)
			);
		}

		// ---- Root render ----
		return el( 'div', { className: 'pmi-b-wrap' },

			// ---- Header ----
			el( 'div', { className: 'pmi-b-header' },
				el( 'span', {
					className              : 'pmi-b-logo',
					dangerouslySetInnerHTML: { __html: PMI_Block.logo },
				} ),
				el( 'span', { className: 'pmi-b-title' }, 'Pexels Image' )
			),

			// ---- No API key warning ----
			! PMI_Block.api_key_set && el( 'div', { className: 'pmi-b-notice pmi-b-notice--warning' },
				el( 'span', { className: 'dashicons dashicons-warning' } ),
				' No Pexels API key found. Please add one in ',
				el( 'strong', null, 'Pexels Importer → Settings' ),
				'.'
			),

			// ---- Search bar ----
			PMI_Block.api_key_set && el( 'div', { className: 'pmi-b-search-bar' },
				el( 'div', { className: 'pmi-b-search-row' },
					el( 'input', {
						type        : 'text',
						className   : 'pmi-b-input',
						placeholder : 'Search Pexels for free photos…',
						value       : query,
						onChange    : function ( e ) { setQuery( e.target.value ); },
						onKeyDown   : onSearchKeyDown,
						disabled    : !! importing,
					} ),
					el( 'button', {
						className : 'pmi-b-search-btn',
						onClick   : function () { doSearch( 1 ); },
						disabled  : loading || !! importing || ! query.trim(),
					}, loading ? 'Searching…' : 'Search' )
				),
				el( 'div', { className: 'pmi-b-filters' },
					el( 'select', { value: perPage, onChange: function ( e ) { setPerPage( parseInt( e.target.value, 10 ) ); } },
						el( 'option', { value: 12 },  '12 per page' ),
						el( 'option', { value: 24 },  '24 per page' ),
						el( 'option', { value: 40 },  '40 per page' )
					),
					el( 'select', { value: orientation, onChange: function ( e ) { setOrientation( e.target.value ); } },
						el( 'option', { value: ''          }, 'All orientations' ),
						el( 'option', { value: 'landscape' }, 'Landscape'        ),
						el( 'option', { value: 'portrait'  }, 'Portrait'         ),
						el( 'option', { value: 'square'    }, 'Square'           )
					),
					el( 'select', { value: size, onChange: function ( e ) { setSize( e.target.value ); } },
						el( 'option', { value: ''       }, 'Any size' ),
						el( 'option', { value: 'large'  }, 'Large'    ),
						el( 'option', { value: 'medium' }, 'Medium'   ),
						el( 'option', { value: 'small'  }, 'Small'    )
					)
				)
			),

			// ---- Error ----
			error && el( 'div', { className: 'pmi-b-error' },
				el( 'span', { className: 'dashicons dashicons-warning' } ),
				' ', error
			),

			// ---- Results meta + pagination ----
			photos.length > 0 && el( 'div', { className: 'pmi-b-meta' },
				el( 'span', { className: 'pmi-b-count' }, totalRes.toLocaleString() + ' photos found' ),
				el( 'div', { className: 'pmi-b-pagination' },
					el( 'button', {
						className : 'pmi-b-page-btn',
						disabled  : page <= 1 || loading || !! importing,
						onClick   : function () { doSearch( page - 1 ); },
					}, '← Prev' ),
					el( 'span', { className: 'pmi-b-page-info' }, 'Page ' + page + ' of ' + totalPages ),
					el( 'button', {
						className : 'pmi-b-page-btn',
						disabled  : page >= totalPages || loading || !! importing,
						onClick   : function () { doSearch( page + 1 ); },
					}, 'Next →' )
				)
			),

			// ---- Loading ----
			loading && el( 'div', { className: 'pmi-b-spinner' },
				el( 'div', { className: 'pmi-b-spin pmi-b-spin--lg' } ),
				el( 'p', null, 'Searching Pexels…' )
			),

			// ---- Grid ----
			! loading && photos.length > 0 && el( 'div', { className: 'pmi-b-grid' },
				photos.map( renderCard )
			),

			// ---- Empty state ----
			! loading && photos.length === 0 && query.trim() && ! error && el( 'div', { className: 'pmi-b-empty' },
				el( 'span', { className: 'dashicons dashicons-images-alt2' } ),
				el( 'p', null, 'No results found. Try a different search term.' )
			),

			// ---- Attribution ----
			el( 'p', { className: 'pmi-b-attribution' },
				'Photos provided by ',
				el( 'a', { href: 'https://www.pexels.com', target: '_blank', rel: 'noreferrer' }, 'Pexels' )
			)
		);
	}

	// ---------------------------------------------------------------------------
	// Block registration
	// ---------------------------------------------------------------------------
	blocks.registerBlockType( 'pexels-media-importer/image', {
		title      : 'Pexels Image',
		description: 'Search Pexels and insert a free stock photo directly into your content.',
		icon       : 'format-image',
		category   : 'media',
		keywords   : [ 'pexels', 'photo', 'stock', 'image', 'free' ],
		attributes : {},

		edit: PexelsBlockEdit,

		// This block always replaces itself with core/image on insert,
		// so it will never be serialised to post content as this block type.
		save: function () { return null; },
	} );

} )( jQuery, wp.blocks, wp.element, wp.data, wp.i18n );