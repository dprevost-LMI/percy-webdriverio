# WebdriverIO 8, 9 and 10 Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@percy/webdriverio` takes correct DOM and cross-origin iframe snapshots on WebdriverIO 8, 9 and 10, and CI proves it on each major.

**Architecture:** Use one code path for all three majors. Use feature detection, not version detection. Replace `executeAsync` (removed in v10) with `execute` and the promise-mode readiness script. Put iframe navigation behind a small "frame strategy" seam: v9 and v10 Classic sessions use `switchFrame`; v8 has no `switchFrame`, so it uses the protocol command `switchToFrame`; a v10 BiDi session uses `WebdriverIO.BrowsingContext.frame()`. Develop on v10. CI installs v8, v9 and v10 in a matrix.

**Tech Stack:** Node.js (CommonJS), WebdriverIO 8/9/10, `@wdio/jasmine-framework` (Jasmine 5 on v8/v9, Jasmine 6 on v10), `@percy/sdk-utils` ^1.32, `@percy/cli` ^1.32, geckodriver + headless Firefox, `tsd`, `nyc`, yarn v1, GitHub Actions.

**Spec:** The user request ("support wdio 8, 9 and 10") plus these two upstream documents. Read both before you start:
- WebdriverIO v10 migration guide: <https://github.com/webdriverio/webdriverio/blob/main/website/docs/v10Migration.md>
- v10 migration skill: <https://github.com/webdriverio/webdriverio/blob/main/.agents/skills/wdio-v10-migration/SKILL.md>

The impact analysis in [analysis.md](analysis.md) maps each item of the guide to this repository.

## Tasks

| # | File | Deliverable |
|---|------|-------------|
| 1 | [task-1-readiness-gate-execute.md](task-1-readiness-gate-execute.md) | The readiness gate uses `execute`, not `executeAsync`. |
| 2 | [task-2-wdio10-toolchain.md](task-2-wdio10-toolchain.md) | The dev toolchain is on WebdriverIO 10, Node 22, Jasmine 6. The peer range is `^8 \|\| ^9 \|\| ^10`. The suite is green on v10. |
| 3 | [task-3-frame-strategy.md](task-3-frame-strategy.md) | Cross-origin iframe capture works in a v10 BiDi session and still works on v8/v9. |
| 4 | [task-4-ci-matrix-and-docs.md](task-4-ci-matrix-and-docs.md) | CI runs the suite on v8, v9 and v10. The README shows the support matrix. |

Do the tasks in this order. Task 3 needs Task 2: its end-to-end tests fail on v10 only.

## Decisions (confirmed by the user on 2026-10-05)

- **D1 – Peer range.** `peerDependencies.webdriverio` is `^8 || ^9 || ^10`. WebdriverIO 6 and 7 are removed. This is a breaking change: release it as `4.0.0`.
- **D2 – `engines.node`.** `>=18`. WebdriverIO 8 also supports Node 16.13, but Node 16 is end of life (September 2023). The release is a major, so the higher floor is acceptable.

## Global Constraints

- Node.js for local development and v10 CI: `>=22.19.0` (WebdriverIO 10 floor).
- `peerDependencies.webdriverio`: `^8 || ^9 || ^10` (see D1).
- `engines.node`: `>=18` (see D2).
- One runtime code path. No `if (major === 10)`. Detect features (`typeof b.browsingContexts === 'function'`, `b.isBidi`).
- Do not call `executeAsync`, `isW3C`, `element.ELEMENT`, `getHTML(boolean)`, `getCookies(string)` or `addCommand(..., true)` anywhere in `index.js`. Call `switchToFrame` only when `switchFrame` is missing (WebdriverIO 8). v9 and v10 always have `switchFrame`, so v10, where `switchToFrame` is not public, never reaches that call.
- Do not set `strictSelectors: false`. The SDK uses `$$` only.
- Every new runtime file goes in `package.json` `files`. (Release 3.3.3 broke because `_iframe_shim.js` was not published.) This plan adds no new runtime file; keep it that way.
- `nyc` coverage stays at 100 % for branches, lines, functions and statements (`.nycrc`).
- A Percy failure never fails the user's test. `percySnapshot` logs the error and resolves.

## Review Focus

1. **Silent degradation.** On v10, `b.executeAsync` is `undefined` and `b.switchFrame` throws in BiDi. Both errors are caught and logged at debug level, so the old code "passes" and sends a snapshot without readiness data or iframes. Expected: readiness data and `corsIframes` are present on v10. Pinned by the end-to-end tests in Task 1 (Step 6) and Task 3 (Steps 1–3).
2. **Frame context is not restored.** After a Classic capture, the session must be back on the top document. If not, the user's next command runs inside an iframe. Expected: `browser.execute(() => document.URL)` after `percySnapshot` returns the page URL. Pinned by Task 3, Step 3.
3. **`ignoreIframeSelectors` in a v10 frame context.** `iframeElement.execute(function () { this.matches(...) })` can return `false` silently in BiDi. Then an iframe the user excluded is captured. Expected: the excluded iframe is not in `corsIframes`. Pinned by Task 3, Step 2.
4. **The CI matrix tests the wrong major.** `yarn add` can resolve a different major, or a cached `node_modules` can win. Then three jobs test v10. Expected: each job fails if `environmentInfo` does not start with `webdriverio/<major>.`. Pinned by Task 4, Step 1.
5. **Version detection on v10.** `webdriverio` 10 has no `./package.json` in `exports`, so `require('webdriverio/package.json')` throws. The fallback must still report `webdriverio/10.x.y`, not `unknown-webdriverio/unknown`. Pinned by Task 4, Step 1 (same assertion).
