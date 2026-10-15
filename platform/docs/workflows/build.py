"""Assemble areas/*.json into workflows.html for printing to PDF with render.mjs."""
import glob, html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
CLASSDEFS = open(os.path.join(HERE, 'classdefs.txt')).read()

ACTORS = [
    ('arch', 'Architect', '#dbeafe', '#1d4ed8'),
    ('client', 'Client (developer)', '#ede9fe', '#6d28d9'),
    ('owner', 'Donor building owner', '#fef3c7', '#b45309'),
    ('surveyor', 'Site surveyor', '#ccfbf1', '#0f766e'),
    ('contractor', 'Deconstruction contractor', '#e7e5e4', '#57534e'),
    ('consultant', 'Sustainability consultant', '#dcfce7', '#15803d'),
    ('system', 'The platform, automatically', '#fafaf9', '#a8a29e'),
]


def actor_style(name):
    n = name.lower()
    for key, label, fill, stroke in ACTORS:
        words = {'arch': ['architect'], 'client': ['client', 'developer'], 'owner': ['owner'],
                 'surveyor': ['surveyor'], 'contractor': ['contractor'], 'consultant': ['consultant'],
                 'system': ['platform', 'system', 'tallyard']}[key]
        if any(w in n for w in words):
            return fill, stroke
    return '#f5f5f4', '#a8a29e'


def esc(s):
    return html.escape(str(s or ''), quote=True)


def clean(s):
    return str(s or '').replace('\u2014', ', ').replace('\u2013', ' to ')


def mermaid_block(src, cls='diagram'):
    src = clean(src).strip()
    if src.startswith('flowchart'):
        src = src + '\n' + CLASSDEFS
    return f'<div class="{cls}"><pre class="mermaid">{esc(src)}</pre></div>'


areas = []
for path in sorted(glob.glob(os.path.join(HERE, os.environ.get('AREAS_DIR', 'areas'), '*.json'))):
    if os.path.basename(path).startswith('_'):
        continue
    with open(path) as f:
        areas.append(json.load(f))

total_workflows = sum(len(a.get('workflows', [])) for a in areas)

parts = []
# Cover
parts.append(f'''<section class="cover">
<div class="mark"><span></span><span></span><span></span></div>
<h1>Tallyard platform<br>workflows</h1>
<p class="lede">Every workflow in the platform, drawn as a simple diagram with the steps, the rules and who is told what. As built on 15 October 2026, after the round 2 changes from the partner review of 14 October.</p>
<dl class="facts">
<div><dt>Sections</dt><dd>{len(areas)}</dd></div>
<div><dt>Workflows</dt><dd>{total_workflows}</dd></div>
<div><dt>Live app</dt><dd>tallyard-platform.vercel.app</dd></div>
<div><dt>Sample password</dt><dd>sandbox</dd></div>
</dl>
<p class="small">Everything here describes the sandbox: data stays in each visitor's browser, the world is sample data, and carbon, price and timeline figures are indicative.</p>
</section>''')

# How to read
shapes_demo = mermaid_block('flowchart LR\nA["An action someone takes"]:::arch --> B{"A decision or a check?"}\nB -->|"Yes"| C(["An outcome"])\nB -->|"No"| D(["Another outcome"])', 'diagram small')
legend_rows = ''.join(
    f'<div class="lg"><span class="sw" style="background:{fill};border-color:{stroke}{";border-style:dashed" if key == "system" else ""}"></span>{esc(label)}</div>'
    for key, label, fill, stroke in ACTORS)
parts.append(f'''<section class="page">
<h2>How to read this</h2>
<p>Each workflow has its own page: a diagram first, then the same flow written out as numbered steps, then the rules (who may do it, what is refused, what stays hidden) and the notifications it sends. Some workflows also show a lifecycle: the states a record moves through.</p>
<h3>Colours: who does each step</h3>
<div class="legend">{legend_rows}</div>
<h3>Shapes</h3>
{shapes_demo}
<p class="small">Rectangles are actions, diamonds are decisions or checks, rounded ends are outcomes. Dashed grey boxes are things the platform does by itself, such as checking access or sending a notification.</p>
</section>''')

# Contents
toc = []
for a in areas:
    items = ''.join(f'<li><a href="#{esc(w["id"])}">{esc(clean(w["title"]))}</a></li>' for w in a.get('workflows', []))
    toc.append(f'<div class="toc-sec"><a class="toc-h" href="#sec-{esc(a["key"])}">{esc(clean(a["title"]))}</a><ol>{items}</ol></div>')
toc.append('<div class="toc-sec"><a class="toc-h" href="#sec-appendix">Things worth a look</a></div>')
parts.append(f'<section class="page"><h2>Contents</h2><div class="toc">{"".join(toc)}</div></section>')

# Sections
for a in areas:
    parts.append(f'<section class="page sec" id="sec-{esc(a["key"])}"><p class="eyebrow">Section</p><h2>{esc(clean(a["title"]))}</h2><p class="intro">{esc(clean(a.get("intro")))}</p>')
    if a.get('overview_mermaid'):
        parts.append(mermaid_block(a['overview_mermaid'], 'diagram big'))
    parts.append('</section>')
    for w in a.get('workflows', []):
        who = ''.join(
            f'<span class="chip" style="background:{actor_style(r)[0]};border-color:{actor_style(r)[1]}">{esc(clean(r))}</span>'
            for r in w.get('who', []))
        steps = ''.join(
            f'<li><span class="actor" style="background:{actor_style(s.get("actor",""))[0]};border-color:{actor_style(s.get("actor",""))[1]}">{esc(clean(s.get("actor")))}</span> {esc(clean(s.get("action")))}</li>'
            for s in w.get('steps', []))
        rules = ''.join(f'<li>{esc(clean(r))}</li>' for r in w.get('rules', []))
        notes = ''.join(f'<li>{esc(clean(n))}</li>' for n in w.get('notifications', []))
        states = ''
        if w.get('states_mermaid'):
            note = f'<p class="small">{esc(clean(w["states_note"]))}</p>' if w.get('states_note') else ''
            states = f'<div class="lifecycle"><h4>Lifecycle</h4>{note}{mermaid_block(w["states_mermaid"], "diagram states")}</div>'
        parts.append(f'''<section class="page wf" id="{esc(w["id"])}">
<p class="eyebrow">{esc(clean(a["title"]))}</p>
<h3 class="wf-title">{esc(clean(w["title"]))}</h3>
<div class="meta"><div class="who">{who}</div><div class="where"><b>Where</b> {esc(clean(w.get("where")))}</div></div>
<p class="summary">{esc(clean(w.get("summary")))}</p>
{mermaid_block(w.get("mermaid", ""))}
<div class="cols">
<div><h4>Steps</h4><ol class="steps">{steps}</ol></div>
<div><h4>Rules</h4><ul class="rules">{rules}</ul><h4>Notifications</h4><ul class="rules">{notes}</ul></div>
</div>
{states}
</section>''')

app = json.load(open(os.path.join(HERE, 'appendix.json')))
items = ''.join(f'<li><p>{esc(clean(t))}</p><p class="small">{esc(clean(w))}</p></li>' for t, w in app['items'])
parts.append(f'<section class="page sec" id="sec-appendix"><p class="eyebrow">Appendix</p><h2>{esc(app["title"])}</h2><p class="intro">{esc(app["intro"])}</p><ol class="gaps">{items}</ol></section>')

doc = f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Tallyard platform workflows</title>
<script src="node_modules/mermaid/dist/mermaid.min.js"></script>
<style>
@page {{ size: A4; }}
* {{ box-sizing: border-box; }}
body {{ font-family: 'Liberation Sans', 'DejaVu Sans', sans-serif; color: #1c1917; font-size: 10.5pt; line-height: 1.45; margin: 0; }}
section.page {{ page-break-before: always; }}
section.cover {{ min-height: 250mm; display: flex; flex-direction: column; justify-content: center; padding: 0 6mm; }}
.mark {{ display: flex; flex-direction: column; gap: 3px; margin-bottom: 10mm; }}
.mark span {{ display: block; height: 7px; background: #1f6b53; border-radius: 1px; }}
.mark span:nth-child(1) {{ width: 46px; }} .mark span:nth-child(2) {{ width: 34px; margin-left: 6px; }} .mark span:nth-child(3) {{ width: 46px; }}
h1 {{ font-size: 34pt; line-height: 1.1; margin: 0 0 6mm; letter-spacing: -0.01em; }}
.lede {{ font-size: 13pt; color: #44403c; max-width: 150mm; }}
.facts {{ display: grid; grid-template-columns: repeat(4, auto); gap: 4mm 10mm; margin: 10mm 0; justify-content: start; }}
.facts dt {{ font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #78716c; }}
.facts dd {{ margin: 1mm 0 0; font-size: 12pt; font-weight: 700; }}
h2 {{ font-size: 20pt; margin: 0 0 4mm; color: #175541; }}
h3 {{ font-size: 13pt; margin: 6mm 0 2mm; }}
h4 {{ font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; color: #57534e; margin: 4mm 0 1.5mm; }}
.eyebrow {{ font-size: 8pt; text-transform: uppercase; letter-spacing: .08em; color: #1f6b53; margin: 0 0 1mm; font-weight: 700; }}
.intro {{ font-size: 12pt; color: #44403c; }}
.small {{ font-size: 9pt; color: #57534e; }}
.legend {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm 8mm; }}
.lg {{ display: flex; align-items: center; gap: 3mm; }}
.sw {{ width: 9mm; height: 6mm; border: 1.5px solid; border-radius: 2px; display: inline-block; }}
.toc {{ columns: 2; column-gap: 10mm; }}
.toc-sec {{ break-inside: avoid; margin-bottom: 5mm; }}
.toc-h {{ font-weight: 700; color: #175541; text-decoration: none; font-size: 11pt; }}
.toc ol {{ margin: 1mm 0 0; padding-left: 6mm; font-size: 9.5pt; }}
.toc a {{ color: inherit; text-decoration: none; }}
.wf-title {{ font-size: 16pt; margin: 0 0 2mm; }}
.meta {{ display: flex; flex-wrap: wrap; gap: 2mm 6mm; align-items: center; margin-bottom: 2mm; }}
.chip, .actor {{ display: inline-block; border: 1.2px solid; border-radius: 3px; padding: 0 2mm; font-size: 8.5pt; margin-right: 1.5mm; white-space: nowrap; }}
.where {{ font-size: 9pt; color: #44403c; }}
.summary {{ margin: 2mm 0 3mm; color: #292524; }}
.diagram {{ border: 1px solid #e7e5e4; border-radius: 3mm; padding: 4mm; margin: 2mm 0 3mm; display: flex; justify-content: center; break-inside: avoid; width: 100%; max-width: 100%; overflow: hidden; }}
.diagram pre.mermaid {{ width: 100%; display: flex; justify-content: center; }}
.diagram svg {{ max-width: 100% !important; height: auto; max-height: 215mm; }}
.diagram.big svg {{ max-height: 215mm; }}
.diagram.small svg {{ max-height: 40mm; }}
.diagram.states svg {{ max-height: 110mm; }}
.diagram pre {{ margin: 0; }}
.lifecycle {{ break-inside: avoid; }}
.cols {{ display: grid; grid-template-columns: 1.15fr 1fr; gap: 6mm; }}
ol.steps {{ padding-left: 5mm; margin: 0; }}
ol.steps li {{ margin-bottom: 1.6mm; break-inside: avoid; }}
ul.rules {{ padding-left: 4.5mm; margin: 0; }}
ul.rules li {{ margin-bottom: 1.2mm; break-inside: avoid; }}
ol.gaps {{ padding-left: 6mm; }} ol.gaps li {{ margin-bottom: 3mm; break-inside: avoid; }} ol.gaps p {{ margin: 0; }}
</style></head><body>
{"".join(parts)}
<script>
mermaid.initialize({{ startOnLoad: false, theme: 'base', securityLevel: 'loose',
  themeVariables: {{ fontFamily: 'Liberation Sans, DejaVu Sans, sans-serif', fontSize: '20px', primaryColor: '#ffffff', primaryBorderColor: '#a8a29e', lineColor: '#57534e', textColor: '#1c1917' }},
  flowchart: {{ htmlLabels: true, curve: 'basis', nodeSpacing: 18, rankSpacing: 22, padding: 8, wrappingWidth: 230 }}, state: {{ nodeSpacing: 30, rankSpacing: 30 }} }});
window.__mermaidErrors = [];
mermaid.run({{ querySelector: '.mermaid' }}).catch(e => window.__mermaidErrors.push(String(e))).finally(() => {{
  const MM = 96 / 25.4;
  document.querySelectorAll('section.wf').forEach(sec => {{
    const d = sec.querySelector('.diagram'); const c = sec.querySelector('.cols');
    if (d && c && d.getBoundingClientRect().height > 105 * MM) c.style.breakBefore = 'page';
  }});
  window.__mermaidDone = true }});
</script>
</body></html>'''
out = os.path.join(HERE, 'workflows.html')
open(out, 'w').write(doc)
print('areas', len(areas), 'workflows', total_workflows, 'bytes', len(doc))
