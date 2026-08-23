# File ownership — how parallel agents avoid colliding

Agents porting blocks run **concurrently**. Collisions are prevented structurally,
not by convention: every writable path has exactly one owner, and the files that
several blocks would otherwise touch were all written **before** any agent started.

## The rule

> An agent may create or modify files **only** inside the one directory it owns.
> Everything else in the repo is **read-only** to it.

An agent that believes it needs a change outside its directory must **stop and
report it** in its final message. It must not make the edit. The orchestrator
applies cross-cutting changes serially.

## Ownership table

| Agent | Exclusive write access | Source of truth (read-only) |
|---|---|---|
| `block-01-preloader`   | `src/components/Preloader/`     | `legacy/index.html` 15–173 |
| `block-02-hero`        | `src/components/Hero/`          | `legacy/index.html` 176–692 |
| `block-03-markettape`  | `src/components/MarketTape/`    | `legacy/index.html` 695–1000 |
| `block-04-vsl`         | `src/components/Vsl/`           | `legacy/index.html` 1003–1299 |
| `block-05-questions`   | `src/components/ThreeQuestions/`| `legacy/index.html` 1302–1682 |
| `block-06-phones`      | `src/components/Phones/`        | `legacy/index.html` 1685–2771 |
| `block-07-social`      | `src/components/SocialIntel/`   | `legacy/index.html` 2774–3979 |
| `block-08-congress`    | `src/components/Congress/`      | `legacy/index.html` 3982–4498 |
| `block-09-pricing`     | `src/components/Pricing/`       | `legacy/index.html` 4501–4828 |
| `block-10-footer`      | `src/components/Footer/`        | `legacy/index.html` 4831–5088 |

## Off-limits to every block agent

These are shared. They were finalised before fan-out precisely so that no two
agents ever contend for them.

```
src/app/page.tsx          composition root — imports all ten blocks
src/app/layout.tsx        <html>/<body>, fonts, metadata
src/app/globals.css       the only global stylesheet (4 rules)
src/hooks/**              useInViewReveal, useMediaQuery, useReducedMotion
src/lib/**                pricing catalog, stripe client
src/types/**              global.d.ts
public/**                 assets — already extracted and named
legacy/**                 FROZEN baseline. Never write. Never edit.
package.json, tsconfig.json, next.config.ts, scripts/**, tests/**
```

### Why `public/` in particular

Blocks 06 and 08 **share two portraits** — `donald-j-trump.jpg` and
`cleo-fields.jpg` each appear in both. If both agents extracted their own
images, they would write the same paths concurrently. All 13 occurrences were
therefore extracted up front into 10 files by `scripts/extract-assets.mjs`;
agents only *reference* `/img/...` paths.

## Shared-code policy

If two blocks need the same helper, they **each keep their own copy** inside their
own directory. Duplication across block boundaries is correct here — a shared
module would be a write-contention point and a fidelity coupling. The only shared
code is what already exists in `src/hooks/`, created before fan-out.

This applies especially to `@keyframes`: duplicate them into each module that
references one. CSS Modules hashes keyframe names per file, so a cross-module
reference silently resolves to nothing.

## Definition of done, per agent

1. `src/components/<Owned>/<Name>.tsx` and `<Name>.module.css` exist.
2. `pnpm typecheck` passes.
3. Every `id` present in the block's legacy line range is present in the JSX,
   spelled identically.
4. Every effect that starts a timer, rAF, listener or observer returns a teardown.
5. No `dangerouslySetInnerHTML`, no `suppressHydrationWarning`.
6. The agent's final report lists: ids emitted, cleanup functions added, anything
   it could not port faithfully, and any change it wanted to make outside its
   directory.
