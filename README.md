# Super Tips Refill — student concept site

Unofficial academic concept for a refillable, replaceable-tip redesign of washable children's markers.
Student concept for Crayola Super Tips — not affiliated with or endorsed by Crayola. Concept design — refill mechanism not yet validated.

## Run

```bash
python3 -m http.server 8765      # from this folder
# open http://localhost:8765/
```
Serve it from the web root (links are root-relative). Opening `index.html` with `file://` is not supported.
Deploy: upload the folder as-is (includes `.htaccess` for Hostinger/Apache cache rules).

## Routes
`/`, `/how-it-could-work/`, `/for-schools/`, `/explore-the-kit/`, `/concept-and-evidence/`

## Edit
- Page content: `src/pages/*.html`, shared header/footer: `src/partials/`.
- Regenerate static pages: `python3 tools/build.py` (dev-time only; bump `V` there on each deploy).
- Styles `styles.css`, behaviour `main.js` (classic script, no modules, no dependencies).

## Exploded view (home)
Layered 2D SVG, one group per part (`part-cap`, `part-tip`, `part-body`, `part-reservoir`, `part-plug`) in
`src/partials/marker-parts.html`. Scroll progress drives part offsets and the SVG `viewBox` (camera) in `main.js`
(`EXPLODE`, `CAMERA`, `PARTS`), so scrolling up reverses it exactly. Labels are HTML, anchored to
`a-*` points inside each part. To use final renders: replace the contents of each part group, keep ids and anchors.
`prefers-reduced-motion` (or the on-page toggle) switches to a static, ordered layout.

## Status of visuals
All marker art is provisional original vector drawing (no photos, no official logo, no AI imagery).
