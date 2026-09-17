# FOG Map

Web-app statica importata da `FOG_Map_V0.zip`, con ricerca, filtri, elenco accessibile, rotazione e zoom del globo.

## Stato dei dati

- 71 elementi e 29 relazioni conservati dalla V0.
- 10 luoghi forniti nella V0: `provided_unverified`. Sono sul globo, ma non certificati come verificati.
- 61 artisti con geografia provvisoria: `pending`. Sono consultabili nell’elenco, esclusi dal globo e dalle linee geografiche. Le coordinate illustrative originali sono conservate solo in `draft_coordinates`.
- Tutte le relazioni sono `provided_unverified`; `sources` è vuoto perché la V0 non allega fonti. Il paese di un episodio non è l’origine o la residenza di un artista.
- Nessun dato è dichiarato verificato senza fonti. Per verificare un elemento, aggiungere la fonte, controllare identità e coordinate, poi aggiornare lo stato esplicitamente.

## Anteprima locale

Eseguire `python3 -m http.server 8080` nella cartella e aprire http://localhost:8080.

## GitHub Pages

Settings → Pages → Deploy from a branch → main → / (root).
I percorsi relativi consentono la pubblicazione su https://gillesbarberis.github.io/FOG-map/.

## Interazione

Trascinare per ruotare, rotella o pulsanti per zoomare; su touch è implementato il pinch a due dita. La ricerca e i filtri sono disponibili anche su mobile. L’elenco permette di selezionare punti sovrapposti e artisti senza coordinate.
