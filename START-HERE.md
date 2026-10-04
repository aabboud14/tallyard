# How to use this

This folder is the prompt. It is split into files because a single prompt this size does not survive one read, and Claude Code loses the middle of it.

## To run it

1. Make an empty folder for the project and copy into it: the `brief/` folder, `CLAUDE.md` and `docs/OPEN_QUESTIONS.md`. Keep the structure:

```
your-project/
  CLAUDE.md
  brief/01-BRIEF.md ... 08-TIER2.md
  docs/OPEN_QUESTIONS.md
```

2. Open Claude Code in that folder and send this one line:

> Read brief/01-BRIEF.md, then brief/02 to brief/07 in order, each one in full to its last line. Then carry it out, starting with Phase 0.

That is the whole kickoff. Everything else is in the files.

3. Let it run. It will work through eight phases, committing locally after each one. It will not ask you anything unless npm cannot reach the registry. It will stop at the end of Tier 1 with a report in `docs/EVIDENCE.md`.

4. To see the result: `npm run dev`, or open `dist-single/index.html` from disk after `npm run build:single`. That single file is the one to send to Valerio.

5. For the second run, send: "Read brief/08-TIER2.md and build Tier 2."

## What to change before you run it

- **The product name.** "Tallyard" is a placeholder, held in one constant. Search the brief for it if you want a different one.
- **The demo date** (`05-DESIGN-AND-TECH.md` section 2.5) is fixed at 7 October 2026, the day of your follow-up meeting. Everything is computed from it.
- **The twelve demo steps** (`02-DEMO-PATH.md` section 3) are the acceptance path. If you want a different story, change them there and the expected values in `07-EXAMPLES.md` will need recomputing. Easier to leave them.
- **Scope.** `01-BRIEF.md` section 3 lists what is deliberately left out of the first run. Moving something from `08-TIER2.md` into Tier 1 is a one-line edit, but it costs time in the build.

## If it goes wrong

- If it stops early, send: "Re-read CLAUDE.md and PLAN.md, then continue from the current phase."
- If the numbers on screen do not match `07-EXAMPLES.md`, that is a bug in the build, not in the brief: the examples were computed independently and reproduced before the brief was issued. Send: "Fix the engine, not the test."
- If it starts inventing company names, point it at `06-DATA.md` section A11.
