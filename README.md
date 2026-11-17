# Super Tips Refill — student concept site

Unofficial academic concept for a refillable, replaceable-tip redesign of washable children's markers.
Student concept for Crayola Super Tips — not affiliated with or endorsed by Crayola. Concept design — refill mechanism not yet validated.

## Run

```bash
python3 -m http.server 8765      # from this folder
# open http://localhost:8765/
```
Serve it from the web root (links are root-relative). Opening `index.html` with `file://` is not supported.
Hosted on GitHub Pages from the `main` branch. (`.htaccess` is only used on Apache hosts; GitHub Pages ignores it.)

## Routes
Customer pages: `/`, `/how-it-could-work/`, `/for-schools/`, `/explore-the-kit/`.
Concept notes: `/strategy/`, `/relaunch/`, `/concept-and-evidence/`. Plus `404.html`.

## Edit
- Page content: `src/pages/*.html`, shared header/footer: `src/partials/`.
- Regenerate static pages: `python3 tools/build.py` (dev-time only; bump `V` there on each deploy).
- Styles `styles.css`, behaviour `main.js` (classic script, no modules, no dependencies).
- Fonts: Baloo 2 (headings) and Nunito (body), loaded from Google Fonts, with system fallbacks.

## Interactive pieces (all in `main.js`, each in its own `init*`)
- Home: `initInkHero` (a marker draws a stroke as you scroll, the ink runs out, the refill bottle appears) and `initTry` (tap a marker to use it up, refill just that colour).
- How it works: `initStory` (exploded marker; scroll drives part offsets and the SVG camera) and `initSchem` (each step sketch plays its step).
- Strategy: `initCanvas` (Strategy Canvas curves draw in; the legend isolates a curve) and `initCalc` (two-family cost table).
- Kit: `initKit`.
All of them fall back to a static view with `prefers-reduced-motion` or without JavaScript.

## Exploded view
Layered 2D SVG, one group per part (`part-cap`, `part-tip`, `part-body`, `part-reservoir`, `part-plug`) in
`src/partials/marker-parts.html`. To use final renders: replace the contents of each part group, keep ids and anchors.

## Status of visuals
All marker art is provisional original vector drawing made for this project with AI assistance (Claude Code), recorded in the group's AI-use log. No photos and no official logo are used.
