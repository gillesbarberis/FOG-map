# FOG Map

Web-app statica importata da `FOG_Map_V0.zip`, con ricerca, filtri, elenco accessibile, rotazione e zoom del globo.

## Stato dei dati

- 71 elementi e 29 relazioni conservati dalla V0.
- 10 luoghi forniti nella V0: `provided_unverified`. Sono sul globo, ma non certificati come verificati.
- 61 artisti con geografia provvisoria: `pending`. Sono consultabili nell’elenco, esclusi dal globo e dalle linee geografiche. Le coordinate illustrative originali sono conservate solo in `draft_coordinates`.
- Tutte le relazioni sono `provided_unverified`; `sources` è vuoto perché la V0 non allega fonti. Il paese di un episodio non è l’origine o la residenza di un artista.
- Nessun dato è dichiarato verificato senza fonti. Per verificare un elemento, aggiungere la fonte, controllare identità e coordinate, poi aggiornare lo stato esplicitamente.

## Anteprima locale

Eseguire `python3 -m http.server 8080 --bind 127.0.0.1` nella cartella e aprire http://127.0.0.1:8080.

La sezione portfolio è raggiungibile direttamente su http://127.0.0.1:8080/#practice; `#atlas` riporta alla mappa. La preview locale è accessibile sul computer che esegue il server.

## Practice — revisione

Il branch `spatial-practice-ctm` e la draft PR #1 restano in revisione fino all’approvazione della preview da parte di Gilles, prima del merge su `main`.

L’atlante mantiene la propria griglia con globo e pannello; Practice segue nel normale flusso della pagina. I due casi spatial sono affiancati su desktop e impilati su mobile. La sala cinema Atmos/d&b è descritta come sviluppo futuro non ancora operativo, con infrastruttura d&b in valutazione; TENS resta ad alto livello.

Verifica locale del 19 settembre 2026 nel browser integrato: controllo visivo desktop 1440 × 900 e mobile 390 × 844; assenza di overflow orizzontale anche a 320, 760, 768, 1024, 1280 e 1600 px; ricerca “Oslated”, apertura scheda mobile e navigazione Practice/Atlas funzionanti; nessun warning o errore console rilevato. Emulazione delle dimensioni, non test su dispositivi fisici.

## GitHub Pages

Settings → Pages → Deploy from a branch → main → / (root).
I percorsi relativi consentono la pubblicazione su https://gillesbarberis.github.io/FOG-map/.

## Interazione

Trascinare per ruotare, rotella o pulsanti per zoomare; su touch è implementato il pinch a due dita. La ricerca e i filtri sono disponibili anche su mobile. L’elenco permette di selezionare punti sovrapposti e artisti senza coordinate.

## Grafica V0.2

Interfaccia ricostruita dal riferimento visivo: globo WebGL notturno, atmosfera, punti luminosi, etichette senza sovrapposizioni, scheda laterale e ricerca apribile. Texture terrestre inclusa localmente da [three-globe](https://github.com/vasturiano/three-globe/blob/master/example/img/earth-night.jpg), con licenza MIT in `assets/LICENSE-three-globe.txt`. Le luci urbane della texture sono cartografia di sfondo, non dati FOG.

Solo le relazioni già presenti nel JSON con entrambi gli estremi geolocalizzati sono disegnate sul globo. Nessun artista, collegamento o biografia del mockup è stato aggiunto ai dati.
