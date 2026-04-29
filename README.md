# Pexels Media Importer

Search the entire Pexels library and import free stock photos directly into your WordPress Media Library — without leaving the dashboard.

---

## Description

Pexels Media Importer brings the full Pexels photo library into your WordPress admin. Search, preview, and import high-quality free stock photos straight to your Media Library in seconds — no downloading, no file uploads, no tab-switching.

Images can be imported from the dedicated search page, directly inside the block editor, or via the classic editor toolbar — wherever you're working.

---

## Features

### Search & Filter
- Keyword search with live pagination
- Filter by orientation: Landscape, Portrait, or Square
- Filter by size: Large, Medium, or Small
- Choose how many results to display per page (12, 24, 40, or 80)

### Import Options
- Preview any photo in a full-screen modal before importing
- Choose your import size: Original, Large 2×, Large, or Medium
- Set custom alt text before importing — or use the Pexels description as a default
- Quick-import directly from the search grid without opening the modal
- Already-imported photos are detected across sessions so you never create duplicates

### Duplicate Detection
- Every search result is automatically checked against your Media Library
- Photos already in your library display a green badge and an **In Library** button instead of Import
- The **In Library** button links directly to the attachment's edit screen
- The View button remains available so you can open the modal and import a different size if needed
- In the modal, the size you previously imported is disabled and labelled — other sizes remain available
- The imported size is stored in post meta and persists across sessions and page reloads

### Block Editor Integration
- A **Pexels Image** block is available in the block inserter under the Media category
- Search Pexels and browse results directly inside the block, without leaving the editor
- Selecting a photo imports it (if not already in your library) and automatically converts the block into a native **core/image** block — giving you full access to all standard image controls: alignment, caption, link, alt text, and size switching
- Already-imported photos are detected and inserted from the Media Library instantly, skipping the download

### Classic Editor Integration
- An **Add Pexels Image** button appears next to the Add Media button above the editor
- Clicking it opens a full search modal with the same search, filter, and grid interface
- Selecting a photo imports it if needed and inserts it directly at the cursor position in the editor, in both Visual and Text modes
- Already-imported photos are inserted from the Media Library without re-downloading

### Media Library Integration
- Imported photos are saved as standard WordPress attachments
- Photographer credit stored automatically in post meta
- Import size recorded per attachment
- Filter your Media Library to show only Pexels imports via a dropdown
- Direct link to edit the attachment in the Media Library after import

### Security
- All AJAX requests are nonce-verified
- Capability checks (`upload_files`) on every request
- API key stored securely in WordPress options, never exposed to the frontend

---

## Installation

1. Upload the `pexels-media-importer` folder to `/wp-content/plugins/`
2. Activate the plugin via **Plugins → Installed Plugins**
3. Go to **Pexels Importer → Settings** and enter your Pexels API key
4. Navigate to **Pexels Importer → Search Images** to start importing

### Getting a free API key

1. Visit [pexels.com/api](https://www.pexels.com/api/) and create a free account
2. After logging in, click **Your API Key** from your profile menu
3. Copy the key and paste it into the Settings page

The Pexels API is free — no credit card required. Full documentation is at [pexels.com/api/documentation](https://www.pexels.com/api/documentation/).

> **Rate limits:** 200 requests/hour and 20,000 requests/month. Each search or page navigation counts as one request; importing a photo does not.

---

## Requirements

| | |
|---|---|
| WordPress | 5.8+ |
| PHP | 7.4+ |
| Tested up to | 6.5 |

---

## FAQ

### Do I need a paid Pexels account?

No. A free Pexels account is all you need. The API key is available to all registered users at no cost.

### Are the photos free to use?

Yes. All photos on Pexels are licensed under the [Pexels License](https://www.pexels.com/license/), which allows free use for commercial and personal projects. Attribution is not required, though it is appreciated — the plugin stores photographer credit in post meta automatically.

### What image sizes can I import?

Four sizes are available at import time:

- **Original** — full resolution
- **Large 2×** — approx. 1880px wide
- **Large** — approx. 940px wide
- **Medium** — approx. 350px wide

WordPress will generate its own thumbnail sizes from whichever you import.

### How does duplicate detection work?

Each time you run a search, the plugin checks every result against your Media Library using the Pexels photo ID stored in post meta. Photos already imported show a green badge and an **In Library** button. This check runs against the database so it works across sessions — even photos imported weeks ago will be flagged correctly.

### Can I import the same photo in multiple sizes?

Yes. Opening the modal on an already-imported photo shows which size was previously saved (that option is disabled). You can select any other size and import again — each import creates a separate attachment in your Media Library.

### How does the block editor block work?

Add a **Pexels Image** block from the inserter. Search for a photo and click Insert — the plugin downloads it into your Media Library and immediately converts the block into a standard WordPress image block. From that point it behaves exactly like any other image block and can be edited, resized, captioned, and linked as normal.

### How does the classic editor button work?

An **Add Pexels Image** button appears next to the Add Media button above the editor. Clicking it opens a search modal. Once you select a photo it is imported (if not already in your library) and inserted at your cursor position. It works in both Visual and Text mode.

### Can I filter Pexels imports in the Media Library?

Yes. A **Pexels Imports** option appears in the Media Library list view filter dropdown, letting you view only photos imported via this plugin.

### What happens to the alt text?

If you set custom alt text in the modal before importing, that text is saved as the WordPress attachment alt. If you leave it blank, the Pexels photo description is used as a fallback, attributed to the photographer.

---

## Changelog

### 1.2.0
- Added **Pexels Image** block for the WordPress block editor — searches Pexels inline and converts to a native core/image block on insert
- Added **Add Pexels Image** button to the classic editor, appearing next to the Add Media button
- Classic editor insertion uses the WordPress `send_to_editor` API for reliable placement in both Visual and Text modes
- Already-imported photos are detected in both the block and classic editor interfaces and inserted from the Media Library without re-downloading

### 1.1.0
- Added persistent duplicate detection — search results are checked against the Media Library on every search, across sessions
- Already-imported photos now display a green badge and an **In Library** button in the grid
- Modal now disables the previously imported size and labels it, while keeping other sizes available
- Import size is now stored in post meta (`_pexels_import_size`) per attachment
- Import AJAX response now returns the recorded size for immediate UI updates

### 1.0.0
- Initial release

---

## Upgrade Notice

**1.2.0** — No database migration required. The new block and classic editor button are available immediately after updating.

**1.1.0** — No database migration required. Size tracking applies to photos imported from this version onward. Previously imported photos will still be detected as duplicates; their recorded size will default to "Original".

---

## License

[GPL-2.0+](https://www.gnu.org/licenses/gpl-2.0.html)