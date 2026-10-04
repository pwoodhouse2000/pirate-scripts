# Don't Panic — an unofficial Hitchhiker's text adventure

A 2026 take on the classic text adventure, with graphics: a typed parser (plus clickable exits, objects and verbs), an animated neon "Guide screen" viewscreen for every location, an in-game Guide with illustrated entries, an Improbability Drive glitch effect, hints, undo, autosave, and 42 points to find.

Fan-made, non-commercial and unofficial. All prose and puzzles are original; it is inspired by Douglas Adams' books and the 1984 Infocom game but copies neither.

## Play

Open `index.html` in a browser, or serve the folder with any static server:

```sh
cd hitchhiker && python3 -m http.server 8000
```

No build step. Plain HTML, CSS and JavaScript; works offline.

## Commands

`look`, `examine towel`, `take gown`, `wear gown`, `north` / `n`, `talk to ford`, `ask marvin about missiles`, `marvin, follow me`, `put towel on drain`, `give coins to barman`, `hint`, `guide tea`, `save`, `restore`, `undo`. Type `help` in-game for the full list.

## Layout

- `index.html` — page shell and overlays (title, Guide, death, ending)
- `css/style.css` — the Guide-screen look
- `js/world.js` — rooms, objects, characters, puzzles, events, hints
- `js/guide.js` — Guide entries
- `js/scenes.js` — SVG line-art scenes and layers per location
- `js/engine.js` — parser, turn loop, save/undo, UI, sound, starfield
- `test/walkthrough.mjs` — headless Playwright playthrough that finishes the game with 42 points

## Test

```sh
PLAYWRIGHT_PKG=/path/to/node_modules/playwright node test/walkthrough.mjs --shots
```

(`PLAYWRIGHT_PKG` is optional if `playwright` is installed locally. `--shots` writes screenshots to `test/shots/`.)

## Deploy to Google Cloud Run

```sh
PROJECT=your-gcp-project ./deploy.sh
```

Builds the nginx container from `Dockerfile` with Cloud Build and deploys it as the public service `dont-panic` in `europe-west2` (override with `REGION` and `SERVICE`). You need `gcloud` authenticated against the project.
