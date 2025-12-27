# Radio Ciocile - Portfolio Version

Acesta este o versiune statică (prototip) a proiectului **Radio Ciocile**, adaptată pentru a fi vizualizată direct din browser (de exemplu, pe GitHub Pages), fără a necesita un server PHP/MySQL.

## Structură
- `index.html`: Pagina principală (adaptare statică a `index.php`).
- `mock_server.js`: Simulează răspunsurile backend-ului (`heartbeat.php`, `chat.php`) folosind JavaScript.
- `main.js`: Logica aplicației (player audio, sync, chat UI).
- `style.css`: Stilurile CSS extrase.

## Cum funcționează
Această versiune folosește un playlist static definit în `mock_server.js`. Dacă doriți să auziți muzică, asigurați-vă că fișierele MP3 menționate în playlist există în folderul `../muzica/` (relativ la acest folder) sau editați `mock_server.js` cu link-uri publice.

## Funcționalități Simulate
- **Sync Audio**: Simulează un server de radio care difuzează piese sincronizate.
- **Chat Live**: Mesaje predefinite și posibilitatea de a adăuga mesaje noi (doar local).
- **Reacții**: Butoanele de reacții funcționează vizual.
