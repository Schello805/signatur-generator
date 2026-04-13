# Signaturgenerator (Webapp)

Eine kleine, lokale Webapp zum Erstellen von E‑Mail‑Signaturen (HTML) mit mehreren Design‑Vorlagen.

## Start

- Öffne `index.html` direkt im Browser (funktioniert offline).
- Für Copy‑Funktionen (Clipboard) ist ein lokaler Server oft zuverlässiger: `python3 -m http.server` und dann die angezeigte URL öffnen.
- Für PWA/Offline-Cache (Service Worker) ist `https://` oder `http://localhost` erforderlich.

## Features

- 5 Designs (auswählbar)
- Live‑Vorschau
- Social‑Links als „Badges“ oder Textlinks
- Profil Export/Import als JSON (für spätere Bearbeitung)
- Kompatibilitätsschalter: „Standard“ / „Outlook‑sicher“
- PWA/Offline: Update‑Hinweis + „Update installieren“ (nur über HTTPS/localhost)
- Export:
  - „Als Rich‑Text kopieren“ (ideal für Mail‑Signatur‑Editoren)
  - „HTML kopieren“
  - „Download .html“
  - „Download vCard (.vcf)“
- Optionales Bild:
  - per URL (empfohlen)
  - per Upload (als Data‑URL, nicht in jedem Mail‑Client zuverlässig)

## Empfohlener Ablauf

1. Daten ausfüllen und ein Design auswählen.
2. „Als Rich‑Text kopieren“ klicken.
3. In den Signatur‑Editor von Gmail/Outlook einfügen.
