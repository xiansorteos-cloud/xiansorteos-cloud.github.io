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
V = "20261118a"  # cache-buster; bump on every deploy

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
     "Schools and nurseries — Super Tips Refill concept",
     "Refillable washable markers for primary schools and early years settings: one order a year, a refill routine run by an adult, and pupils who just draw. Student concept, nothing for sale.",
     "page-schools"),
    ("relaunch", "relaunch/index.html", "relaunch",
     "Brand and campaign plan — Super Tips Refill concept",
     "Prototype of the relaunch: concept visual identity, packaging and point-of-sale sketches and a 30-second advert storyboard. Student concept, not affiliated with Crayola.",
     "page-relaunch"),
    ("strategy", "strategy/index.html", "strategy",
     "Strategy — Super Tips Refill concept",
     "Positioning, segments, whole product, Strategy Canvas, behaviour change and a transparent first look at the money, with assumptions clearly labelled.",
     "page-strategy"),
    ("kit", "explore-the-kit/index.html", "kit",
     "Explore the kit — Super Tips Refill concept",
     "A non-transactional kit explorer for the proposed concept marker, ink refill and spare tips. Nothing is for sale; nothing is saved or sent.",
     "page-kit"),
    ("evidence", "concept-and-evidence/index.html", "evidence",
     "Concept and evidence — Super Tips Refill concept",
     "Facts, proposed decisions, hypotheses and pending tests kept visibly separate, plus FAQ and what still has to be documented.",
     "page-evidence"),
    ("404", "404.html", "",
     "Page not found — Super Tips Refill concept",
     "That page does not exist on the Super Tips Refill student concept site.",
     "page-404"),
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
    """Flat horizontal sketch of one step. Parts start assembled and slide to their place when the sketch plays (CSS)."""
    INK, NAVY, CORAL = "#1E63C6", "#123F86", "#F2674F"
    cy = 70
    cap, tip, plug = (0, 0), (0, 0), (0, 0)
    hi = None
    arriving = False  # step 5: parts start apart and come together
    if step == 1:
        cap = (-64, 0); hi = "cap"
    elif step == 2:
        cap = (-64, 0); plug = (56, 0); hi = "plug"
    elif step == 3:
        cap = (-64, 0); plug = (58, 50); hi = "port"
    elif step == 4:
        cap = (-64, 0); tip = (-12, 46); hi = "tip"
    elif step == 5:
        cap = (-64, 0); plug = (56, 0); arriving = True

    def grp(dxy, inner):
        cls = "sp sp-in" if arriving else "sp"
        return f'<g class="{cls}" style="--dx:{dxy[0]}px;--dy:{dxy[1]}px">{inner}</g>'

    def ring(k):
        return f' stroke="{CORAL}" stroke-width="4"' if hi == k else ' stroke="#25231F" stroke-opacity=".25" stroke-width="1.5"'

    o = [f'<svg class="schem" viewBox="0 0 560 150" role="img" aria-label="Sketch of step {step}" focusable="false">']
    # rear plug
    o.append(grp(plug, f'<rect x="444" y="{cy-16}" width="14" height="32" rx="3" fill="{NAVY}"/>'
                       f'<rect x="450" y="{cy-20}" width="34" height="40" rx="10" fill="{INK}"{ring("plug")}/>'))
    # tip (worn tip is set aside in step 4)
    nib = f'M176,{cy} Q181,{cy-7} 198,{cy-10} V{cy+10} Q181,{cy+7} 176,{cy} Z'
    collar = f'<rect x="196" y="{cy-12}" width="16" height="24" rx="4" fill="#F1F1EF" stroke="#999" stroke-width="1"/>'
    worn = ' fill-opacity=".45"' if step == 4 else ''
    o.append(grp(tip, f'<path d="{nib}" fill="{INK}"{worn}/>{collar}'))
    if step == 4:
        o.append(f'<g class="sb" style="--fx:-10px;--fy:-42px"><path d="{nib}" fill="{INK}" stroke="{CORAL}" stroke-width="3" stroke-linejoin="round"/>{collar}</g>')
    # body
    o.append(f'<rect x="210" y="{cy-16}" width="250" height="32" rx="10" fill="#FBFBFA" stroke="#25231F" stroke-opacity=".3" stroke-width="1.5"/>')
    o.append(f'<text x="335" y="{cy+1}" text-anchor="middle" font-size="12" font-weight="800" font-style="italic" letter-spacing="2" fill="{INK}" font-family="Nunito, Avenir Next, Segoe UI, system-ui, sans-serif">SUPER TIPS REFILL</text>')
    if step == 3:
        # the wick stays inside: a gauge shows it taking up ink from the rear
        o.append(f'<rect x="226" y="{cy+7}" width="218" height="5" rx="2.5" fill="{INK}" fill-opacity=".18"/>')
        o.append(f'<rect class="sf" x="226" y="{cy+7}" width="218" height="5" rx="2.5" fill="{INK}"/>')
        o.append(f'<rect x="452" y="{cy-20}" width="12" height="40" rx="4" fill="none" stroke="{CORAL}" stroke-width="3"/>')
        o.append('<g class="sb" style="--fx:26px;--fy:0px">'
                 f'<rect x="462" y="{cy-6}" width="18" height="12" rx="3" fill="#F4F4F2" stroke="#8D97A8" stroke-width="1.5"/>'
                 f'<path d="M476,{cy} C496,{cy-4} 508,{cy-25} 526,{cy-25} A25,25 0 0 1 526,{cy+25} C508,{cy+25} 496,{cy+4} 476,{cy} Z" fill="{INK}" stroke="{NAVY}" stroke-width="2"/>'
                 f'<path d="M514,{cy-17} C524,{cy-21} 536,{cy-19} 543,{cy-11}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/></g>')
    # cap
    o.append(grp(cap, f'<rect x="112" y="{cy-20}" width="104" height="40" rx="12" fill="{INK}"{ring("cap")}/>'
                      f'<rect x="122" y="{cy-13}" width="60" height="5" rx="2.5" fill="#fff" fill-opacity=".3"/>'))
    if step == 5:
        o.append(f'<g class="sb" style="--fx:0px;--fy:8px"><circle cx="522" cy="{cy}" r="15" fill="#1F9D63"/>'
                 f'<path d="M514,{cy} l6,6 l11,-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>')
    o.append('</svg>')
    return "".join(o)


# Scores from the group's Person 2 work (Delexa), checked 12/11/2026.
# Order: factor, Super Tips today, Super Tips Refill (concept, assumptions), BIC Kids Visa, STABILO Trio Scribbi
FACTORS = [
    ("Low upfront price", 4, 3, 5, 1),
    ("Washable, kid-friendly ink", 5, 5, 4, 5),
    ("Body reuse", 1, 5, 1, 1),
    ("Replaceable tip", 1, 5, 1, 1),
    ("Low waste at end of life", 1, 3, 1, 1),
    ("Easy school provisioning", 5, 4, 5, 2),
    ("Child suitability", 4, 4, 3, 5),
    ("Special colour editions", 4, 1, 1, 1),
]
CURVES = [("Super Tips today", "#25231F", "", 1),
          ("BIC Kids Visa", "#1E63C6", "", 3),
          ("STABILO Trio Scribbi", "#2E8B6E", "", 4),
          ("Super Tips Refill (concept)", "#F2674F", "8 6", 2)]


def canvas():
    W, H, L, R, T, B = 800, 330, 56, 64, 20, 90
    n = len(FACTORS)
    xs = [L + i * (W - L - R) / (n - 1) for i in range(n)]
    y = lambda v: T + (5 - v) * (H - T - B) / 4
    o = [f'<svg class="canvas" id="canvas-svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="cv-t cv-d" focusable="false"><title id="cv-t">Strategy Canvas, indicative scores</title><desc id="cv-d">Four curves scored 1 to 5 on eight factors. A table with the same scores follows.</desc>']
    o.append('<defs>' + "".join(f'<clipPath id="cv-clip-{k}"><rect class="cv-clip" x="0" y="0" width="{W}" height="{H}"/></clipPath>' for k in range(len(CURVES))) + '</defs>')
    for v in range(1, 6):
        o.append(f'<line x1="{L}" x2="{W-R}" y1="{y(v)}" y2="{y(v)}" stroke="#E4D8B9"/><text x="{L-12}" y="{y(v)+4}" text-anchor="end" font-size="11" fill="#5A574F">{v}</text>')
    for x, f in zip(xs, FACTORS):
        o.append(f'<line x1="{x}" x2="{x}" y1="{T}" y2="{H-B}" stroke="#EFE5C8"/>')
        words = f[0].split()
        mid = (len(words) + 1) // 2
        for k, line in enumerate([" ".join(words[:mid]), " ".join(words[mid:])]):
            o.append(f'<text x="{x}" y="{H-B+20+k*14}" text-anchor="middle" font-size="11" fill="#25231F">{line}</text>')
    for k, (name, col, dash, idx) in enumerate(CURVES):
        pts = " ".join(f"{x:.1f},{y(f[idx]):.1f}" for x, f in zip(xs, FACTORS))
        d = f' stroke-dasharray="{dash}"' if dash else ""
        o.append(f'<g class="cv-curve" data-i="{k}" clip-path="url(#cv-clip-{k})">')
        o.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"{d}/>')
        for x, f in zip(xs, FACTORS):
            o.append(f'<circle cx="{x:.1f}" cy="{y(f[idx]):.1f}" r="4.5" fill="{col}"/>')
        o.append('</g>')
    o.append('</svg>')
    leg = ('<p class="legend-hint">Select a name to isolate its curve.</p><ul class="legend">'
           + "".join(f'<li><button type="button" class="legend-btn" data-i="{k}" aria-pressed="false"><i style="background:{c}"></i>{n}</button></li>' for k, (n, c, d, i) in enumerate(CURVES))
           + '</ul>')
    rows = "".join(f'<tr><th scope="row">{f[0]}</th>' + "".join(f'<td>{f[i]}</td>' for _, _, _, i in CURVES) + '</tr>' for f in FACTORS)
    tbl = ('<details class="canvas-data"><summary>View the scores as a table</summary><div class="table-wrap"><table class="grid"><thead><tr><th scope="col">Factor</th>'
           + "".join(f'<th scope="col">{n}</th>' for n, *_ in CURVES) + f'</tr></thead><tbody>{rows}</tbody></table></div></details>')
    return '<div class="canvas-wrap">' + "".join(o) + '</div>' + leg + tbl


def build():
    layout = read("layout.html")
    header = read("partials/header.html")
    footer = read("partials/footer.html")
    defs = read("partials/marker-defs.html")
    for slug, out_name, key, title, desc, bodyclass in PAGES:
        body = read(f"pages/{slug}.html")
        body = body.replace("{{CANVAS}}", canvas())
        body = body.replace("{{MARKER_DEFS}}", defs)
        body = body.replace("{{MARKER_PARTS}}", marker_parts(1.0 if slug == "how" else 0.55))
        body = re.sub(r"\{\{SCHEM:(\d)\}\}", lambda m: schem(int(m.group(1))), body)
        h = header
        for k in ("home", "how", "schools", "kit", "relaunch", "strategy", "evidence"):
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
