# Platform workflows document

`../Tallyard-platform-workflows.pdf` documents every workflow in the platform as a simple diagram with steps, rules and notifications, as built on 15 October 2026 after round 2. Each section was written from the code and then checked against it.

Sources: one JSON file per section in `areas/` (diagrams in Mermaid) and `appendix.json` (gaps found while documenting).

To rebuild, from this folder: install Mermaid next to the scripts (`npm install mermaid@11.4.1`), then

```
node validate.mjs areas/02-architect.json   # check a section's diagrams
python3 build.py                            # writes workflows.html
node render.mjs "$PWD/workflows.html" "$PWD/workflows.pdf"
```

`render.mjs` and `validate.mjs` use Playwright from `platform/node_modules` and Chromium at `/opt/pw-browsers`.
