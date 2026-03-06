# Event Journal

A pocket journal for events, trade shows and fairs. Capture notes, contacts, photos, tasks and links — all stored locally on your device. No account, no server, no tracking.

**[→ Open the app](https://YOUR_USERNAME.github.io/event-journal/)**

---

## Features

| Command | What it does |
|---|---|
| `/note` | Quick text note |
| `/contact` | Save a person's details |
| `/photo` | Photo with caption |
| `/thought` | Idea to revisit later |
| `/todo` | Checklist (multiple tasks at once) |
| `/link` | Save a URL |

- **Timeline view** — entries grouped by day, newest at the bottom
- **Export** — PDF (print-ready) or ZIP (Markdown + photos)
- **Backup & Restore** — full local backup as a ZIP file
- **Works offline** — fully functional with no internet connection
- **Installable** — add to your home screen as a PWA on any device

## Privacy

Everything stays on your device. No data is ever sent to a server.

| | |
|---|---|
| 🔒 Local | All events, entries, photos, contacts, backups |
| 🌐 Online (first load only) | Fonts |
| 🌐 Online (ZIP export only) | JSZip library |

## Install as App (PWA)

**Android / Chrome** — tap ⋮ → Add to Home Screen  
**iPhone / Safari** — tap Share ⎙ → Add to Home Screen  
**Desktop / Chrome or Edge** — click ⊕ in the address bar → Install

> A local HTML file cannot be installed as a PWA — the app must be opened from the hosted URL above.

## Run Locally

No build step needed. Just open the HTML file:

```bash
# Option 1 — open directly in browser (limited, no PWA install)
open index.html

# Option 2 — serve locally (full PWA features)
python3 -m http.server 8080
# then open http://localhost:8080
```

## Development

Single-file app — all HTML, CSS and JavaScript in `index.html`.

- **Storage:** IndexedDB (entries + blobs), localStorage (theme preference only)
- **No frameworks, no build tools, no dependencies**
- All global functions use the `EJ_` prefix to avoid browser API collisions

### Running the test suite

```bash
node ej-tests.js
# Expected: 216 tests  216 passed  0 failed
```

## Version

| | |
|---|---|
| Version | v0.1 beta |
| Status | Open beta — feedback welcome |

## License

MIT — see [LICENSE.txt](LICENSE.txt)

## Feedback

Found a bug or have a suggestion? Open an issue on GitHub.
