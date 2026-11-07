#!/usr/bin/env python3
"""Dev-time page generator (not needed to host the site).

Reads src/layout.html + src/partials/* + src/pages/*.html and writes the static
pages the browser actually loads. Run:  python3 tools/build.py
The generated .html files are committed/uploaded as-is; no build step on the host.
"""
import datetime
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
V = "20261107"  # cache-buster; bump on every deploy

PAGES = [
    # slug, output, nav key, title, description, body class
    ("home", "index.html", "home",
     "Super Tips Refill — a student concept for a refillable washable marker",
     "An unofficial student concept: a washable children's marker redesigned in five parts so ink and tip could be replaced by an adult. Concept design — refill mechanism not yet validated.",
     "page-home"),
    ("how", "how-it-could-work/index.html", "how",
     "How it could work — Super Tips Refill concept",
     "A conceptual, adult-managed sequence for refilling ink and replacing a tip, with its limits and the tests still needed. Not instructions for any marker sold today.",
     "page-how"),
    ("schools", "for-schools/index.html", "schools",
     "For schools — Super Tips Refill concept",
     "How a refillable, replaceable-tip marker concept might fit school life: who uses and buys, what differs from families, and the practical questions to answer first.",
     "page-schools"),
    ("kit", "explore-the-kit/index.html", "kit",
     "Explore the kit — Super Tips Refill concept",
     "A non-transactional kit explorer for the proposed concept marker, ink refill and spare tips. Nothing is for sale; nothing is saved or sent.",
     "page-kit"),
    ("evidence", "concept-and-evidence/index.html", "evidence",
     "Concept and evidence — Super Tips Refill concept",
     "Facts, proposed decisions, hypotheses and pending tests kept visibly separate, plus FAQ and what still has to be documented.",
     "page-evidence"),
]

OFFSETS = {"cap": -390, "tip": -80, "body": 0, "reservoir": 390, "plug": 380}


def read(p):
    return (SRC / p).read_text(encoding="utf-8")


def marker_parts(e):
    """Marker parts with the explode offset baked in (used before JS takes over)."""
    html = read("partials/marker-parts.html")
    for key, off in OFFSETS.items():
        dy = round(off * e)
        html = html.replace(f'<g id="part-{key}"', f'<g id="part-{key}" transform="translate(0,{dy})"')
    return html


def schem(step):
    """Small flat horizontal schematic of the five parts for the 'how it could work' sequence."""
    sh = 70
    dx = {"cap": 0, "tip": 0, "body": 0, "res": 0, "plug": 0}
    hi = None
    spare = False
    pack = False
    if step == 1:
        dx["cap"] = -70; hi = "cap"
    elif step == 2:
        dx["cap"] = -70; dx["plug"] = 70; hi = "plug"
    elif step == 3:
        dx["cap"] = -70; dx["plug"] = 130; dx["res"] = 120; hi = "res"; pack = True
    elif step == 4:
        dx["cap"] = -70; dx["tip"] = -55; hi = "tip"; spare = True
    elif step == 5:
        hi = None

    def stroke(k):
        return ' stroke="#F2674F" stroke-width="4"' if hi == k else ' stroke="#2b2b2b" stroke-opacity=".25" stroke-width="1.5"'

    cy = 70
    out = [f'<svg class="schem" viewBox="0 0 560 150" role="img" aria-label="Schematic: step {step}" focusable="false">']
    # reservoir (behind body)
    out.append(f'<rect x="{200+sh+dx["res"]}" y="{cy-12}" width="150" height="24" rx="9" fill="#2F6FE4" fill-opacity=".35"{stroke("res")}/>')
    out.append(f'<rect x="{410+sh+dx["plug"]-6}" y="{cy-16}" width="14" height="32" rx="3" fill="#127a4b"/>')
    out.append(f'<rect x="{410+sh+dx["plug"]}" y="{cy-24}" width="40" height="48" rx="10" fill="#1E9A62"{stroke("plug")}/>')
    out.append(f'<path d="M{168+sh+dx["tip"]} {cy} l-34 -11 q-8 11 0 22 z" fill="#2F6FE4"{stroke("tip")} transform="translate(0,0)"/>')
    out.append(f'<rect x="{160+sh+dx["tip"]-6}" y="{cy-14}" width="16" height="28" rx="4" fill="#1E9A62"/>')
    if spare:
        out.append(f'<path d="M{168+sh-90} {cy-52} l-34 -11 q-8 11 0 22 z" fill="none" stroke="#51607f" stroke-width="2.5" stroke-dasharray="6 5"/>')
        out.append(f'<path d="M{168+sh-86} {cy-40} q20 12 40 24" fill="none" stroke="#51607f" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round"/>')
    out.append(f'<rect x="{170+sh}" y="{cy-20}" width="250" height="40" rx="12" fill="#F6C21F" stroke="#2b2b2b" stroke-opacity=".25" stroke-width="1.5"/>')
    out.append(f'<text x="{300+sh}" y="{cy+5}" text-anchor="middle" font-size="12" font-weight="800" letter-spacing="3" fill="#8C5D00" font-family="Avenir Next, Segoe UI, system-ui, sans-serif">SUPER TIPS REFILL</text>')
    out.append(f'<rect x="{60+sh+dx["cap"]-20}" y="{cy-25}" width="130" height="50" rx="16" fill="#1E9A62"{stroke("cap")}/>')
    if pack:
        out.append('<rect x="470" y="104" width="52" height="34" rx="9" fill="#2F6FE4" fill-opacity=".2" stroke="#51607f" stroke-width="2.5" stroke-dasharray="6 5"/>')
    out.append('</svg>')
    return "".join(out)


def build():
    layout = read("layout.html")
    header = read("partials/header.html")
    footer = read("partials/footer.html")
    defs = read("partials/marker-defs.html")
    for slug, out_name, key, title, desc, bodyclass in PAGES:
        body = read(f"pages/{slug}.html")
        body = body.replace("{{MARKER_DEFS}}", defs)
        body = body.replace("{{MARKER_PARTS}}", marker_parts(1.0 if slug == "home" else 0.55))
        body = re.sub(r"\{\{SCHEM:(\d)\}\}", lambda m: schem(int(m.group(1))), body)
        h = header
        for k in ("home", "how", "schools", "kit", "evidence"):
            h = h.replace("{{cur:%s}}" % k, ' aria-current="page"' if k == key else "")
        html = (layout.replace("{{TITLE}}", title).replace("{{DESC}}", desc)
                .replace("{{BODYCLASS}}", bodyclass).replace("{{HEADER}}", h)
                .replace("{{BODY}}", body).replace("{{FOOTER}}", footer).replace("{{V}}", V))
        out = ROOT / out_name
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        print("wrote", out_name)


if __name__ == "__main__":
    build()
