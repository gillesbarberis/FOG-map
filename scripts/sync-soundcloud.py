#!/usr/bin/env python3
"""Refresh public FOG recording metadata without credentials or account writes.

Default: report changes. --write updates existing recordings after all eight
are resolved. Tracklist appearances and artist geography require editorial review.
"""
import argparse
import datetime
import json
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PLAYLIST = 'https://soundcloud.com/gilles_barberis/sets/fog'


def fetch(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'soundcloud.com':
        raise ValueError('Only public HTTPS SoundCloud pages are accepted')
    request = urllib.request.Request(url, headers={'User-Agent': 'FOG-atlas-metadata/1.0'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read().decode('utf-8')


def hydration(html):
    match = re.search(r'window.__sc_hydration\s*=\s*(\[.*?\]);', html)
    if not match:
        raise ValueError('Public page metadata changed; no local data was updated')
    return json.loads(match.group(1))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='save resolved recording metadata locally')
    args = parser.parse_args()
    path = ROOT / 'atlas-data.json'
    data = json.loads(path.read_text())
    playlist = next(x['data'] for x in hydration(fetch(PLAYLIST)) if x['hydratable'] == 'playlist')
    public_ids = {str(t['id']) for t in playlist['tracks']}
    tracks = {str(t['id']): t for t in playlist['tracks'] if t.get('title')}
    # The public playlist may expose only its first five full records.
    # Existing public permalinks resolve the remainder without private APIs.
    for record in data['recordings']:
        if record['id'] not in public_ids:
            raise ValueError(f"Recording {record['id']} is no longer in the playlist; review required")
        if record['id'] not in tracks:
            t = next(x['data'] for x in hydration(fetch(record['url'])) if x['hydratable'] == 'sound')
            if str(t['id']) != record['id']:
                raise ValueError('Recording identity changed; no local data was updated')
            tracks[record['id']] = t
    changes = []
    for record in data['recordings']:
        t = tracks[record['id']]
        for field, source in [('title', 'title'), ('url', 'permalink_url'), ('description', 'description')]:
            value = t.get(source) or ''
            if record.get(field) != value:
                changes.append(f"{record['id']}: {field}")
                record[field] = value
        record['checked_at'] = datetime.date.today().isoformat()
    added = public_ids - {r['id'] for r in data['recordings']}
    print(f"Resolved {len(data['recordings'])} recordings; {len(changes)} metadata changes.")
    for change in changes:
        print(change)
    if added:
        print('New playlist recording IDs need episode/tracklist mapping:', ', '.join(sorted(added)))
    if args.write:
        temporary = path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(path)
        print('Saved public metadata. Appearances and locations were not modified.')


if __name__ == '__main__':
    main()
