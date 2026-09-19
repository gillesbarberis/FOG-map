# FOG Map

Static web app imported from `FOG_Map_V0.zip`, with search, filters, an accessible list, globe rotation and zoom.

<a id="stato-dei-dati"></a>

## Data status

- 71 entries and 29 connections preserved from V0.
- 10 places supplied in V0: `provided_unverified`. They appear on the globe but have not been verified.
- 61 artists with provisional locations: `pending`. They are available in the list but excluded from the globe and geographic connections. Original illustrative coordinates are preserved only in `draft_coordinates`.
- All connections are `provided_unverified`; `sources` is empty because V0 included no sources. An episode’s country does not establish an artist’s origin or residence.
- No data is marked as verified without sources. To verify an entry, add a source, check its identity and coordinates, then explicitly update its status.

## Local preview

Run `python3 -m http.server 8080 --bind 127.0.0.1` in this directory and open http://127.0.0.1:8080.

The portfolio is directly accessible at http://127.0.0.1:8080/#practice; `#atlas` returns to the map. The local preview is available on the computer running the server.

## Practice — review

The `spatial-practice-ctm` branch and draft PR #1 remain under review until Gilles approves the preview, before merging into `main`.

The atlas has its own globe and panel grid; Practice follows in normal document flow. The two spatial cases sit side by side on desktop and stack on mobile. The Atmos/d&b cinema room is described as a future development that is not yet operational, with d&b infrastructure under consideration. TENS remains high-level.

Local verification on 19 September 2026 in the in-app browser: visual review at desktop 1440 × 900 and mobile 390 × 844; no horizontal overflow at 320, 760, 768, 1024, 1280 or 1600 px; search for “Oslated”, mobile detail selection and Practice/Atlas navigation worked; no console warnings or errors observed. These were viewport simulations, not tests on physical devices.

All interface text, accessibility labels, search states and error messages are in English. Artist, organisation and work names retain their original spelling.

## GitHub Pages

Settings → Pages → Deploy from a branch → main → / (root).
Relative paths support publication at https://gillesbarberis.github.io/FOG-map/.

## Interaction

Drag to rotate; use the mouse wheel or buttons to zoom. Two-finger pinch is supported on touch screens. Search and filters are also available on mobile. The list lets visitors select overlapping points and artists without coordinates.

## V0.2 graphics

Interface rebuilt from the visual reference: a night-time WebGL globe, atmosphere, luminous points, non-overlapping labels, side panel and expandable search. The Earth texture from [three-globe](https://github.com/vasturiano/three-globe/blob/master/example/img/earth-night.jpg) is included locally under the MIT licence in `assets/LICENSE-three-globe.txt`. City lights in the texture are background cartography, not FOG data.

Only connections already present in the JSON with both endpoints geolocated are drawn on the globe. No artists, connections or biographies from the mockup have been added to the data.
