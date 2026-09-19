# FOG — Atlas & Practice

An episode-led musical atlas and a portfolio of Gilles Barberis’s current practice. Static HTML, CSS, Canvas 2D and WebGL; no build step or account credentials required.

## Local preview

Run `python3 -m http.server 8080 --bind 127.0.0.1` and open http://127.0.0.1:8080/#atlas. Practice is at `#practice`.

The `spatial-practice-ctm` branch and draft PR #1 remain under review. Do not merge into `main` until Gilles has approved the preview.

## Explore the atlas

- **World:** clickable `FOG_JAP`, `FOG_MEX`, `FOG_KOR` and `FOG_FRA` labels represent the countries covered by the recordings. Country labels remain visible while rotating.
- **Country:** as a country fills more of the view, labels and collectives appear. Their visibility depends on apparent country size and centering, not just a universal zoom threshold.
- **Local scene:** the country label gives way to the main focus (bright gold), guest (medium brightness) and located producers (lower brightness). A small episode return button keeps the recording accessible. Producers are grouped by their actual home base, across all FOG episodes.
- **Connections:** hovering or keyboard-focusing a label previews its network; clicking keeps that network lit. A new click replaces the selection; closing details clears it. Great-circle trajectories stop at the horizon. Unlocated endpoints do not generate invented map positions.
- **Listening:** each country offers its two SoundCloud recordings. Play opens the official embedded player inside the page. The player stays mounted when selecting another node or changing zoom, and can be minimized or closed. Only an explicit play action changes its recording. Producer cards offer the specific recordings where they are credited.

The searchable list includes episodes, producers, labels and festivals, including entries without confirmed coordinates. Mouse drag, wheel, zoom buttons and touch pinch are supported.

<a id="stato-dei-dati"></a>

## Data status

`atlas-data.json` separates country episodes, recordings, producer appearances, entity relationships and actual locations. `fog-data.json` is the preserved V0 archive; it is no longer used directly by the renderer.

- Four country episodes and eight recordings, resolved from the [public FOG SoundCloud playlist](https://soundcloud.com/gilles_barberis/sets/fog).
- Every recording has its public URL, identifier, description and retrieval date. Appearance links are mapped from these tracklists. Main and guest recordings remain distinct; the absence of a guest tracklist is not filled with the main recording’s producers.
- Cross-episode appearances include Piante Vive and Saphileaum (Mexico / Korea), ena b. (Mexico / Korea), Biocym (France / Korea), and Susumu Yokota (both Japan recordings).
- Three city-level locations were checked against public sources on 19 September 2026: ena b. in Lisbon, Adhémar in Paris and Recy in Seoul. See each node’s location sources. The original V0 city/region positions remain explicitly `provided_unverified`.
- A country episode anchor is representative cartography, not an artist address. V0 illustrative artist coordinates are not imported into the live geography. An artist’s appearance in an episode never establishes residence or nationality.
- Remaining location research is intentionally unfinished. Missing locations are listed in the panels and search; their trajectories will become drawable when sourced coordinates are added.
- Legacy label/festival relationships retain their original verification status. Newly sourced relationships carry the relevant recording URL.

To locate an artist, update their `location` with `city`, `country`, `lat`, `lon`, `precision`, `status`, `sources` and `checked_at`. Keep country-level estimates explicitly marked; do not silently turn a country estimate into a city address. Each node’s `appearances` references recording IDs, so it can occur in multiple countries’ tracklists without duplication.

## SoundCloud access

Playback uses SoundCloud’s official widget. No login, secret, API key or custom audio proxy is included in the website. Public metadata can be reviewed with:

```
python3 scripts/sync-soundcloud.py
python3 scripts/sync-soundcloud.py --write
```

The first command only reports changes. The second updates existing public recording metadata locally after identity checks. It does not change SoundCloud, infer new tracklist relationships, or assign locations. New recordings require an editorial episode mapping. Public page metadata is a best-effort source and may change; the script fails without modifying the file if its required records cannot be resolved.

A stable authenticated account integration is a separate application: SoundCloud currently requires app registration and OAuth authorization. It is not connected by this preview. See the [official API guide](https://developers.soundcloud.com/docs/api/guide).

## Validation

Run `node --test tests/atlas-model.test.js` (Node 18+) and `node --check app.js`. The tests cover referential integrity, distinct main/guest appearances, cross-country memberships, missing locations, country-specific semantic zoom and great-circle endpoints.

Browser checks cover clickable country labels, persistent selection, episode and producer cards, semantic zoom, embedded playback, and narrow layouts. Chrome playback was verified, including continued playback during scene navigation and a minimized player at 320px. Layouts were checked at 390px and 320px without horizontal overflow. These are desktop viewport simulations, not physical-device tests. The Codex in-app browser left the SoundCloud iframe blank on localhost; use Chrome for audio review of this local preview.

## GitHub Pages

Settings → Pages → Deploy from a branch → main → / (root). Relative paths support https://gillesbarberis.github.io/FOG-map/.

The local Earth texture is from [three-globe](https://github.com/vasturiano/three-globe/blob/master/example/img/earth-night.jpg), under the MIT licence in `assets/LICENSE-three-globe.txt`. City lights are background cartography, not FOG network points. Practice preserves the future/non-operational status of the Atmos/d&b room and keeps TENS documentation high-level.
