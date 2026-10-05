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

| # | File | Deliverable | Status |
|---|------|-------------|--------|
| 1 | [task-1-readiness-gate-execute.md](task-1-readiness-gate-execute.md) | The readiness gate uses `execute`, not `executeAsync`. | Done (`1e8c769`) |
| 2 | [task-2-wdio10-toolchain.md](task-2-wdio10-toolchain.md) | The dev toolchain is on WebdriverIO 10, Node 22, Jasmine 6. The peer range is `^8 \|\| ^9 \|\| ^10`. The suite is green on v10. | Done (`3433cf5`) |
| 3 | [task-3-frame-strategy.md](task-3-frame-strategy.md) | Cross-origin iframe capture works in a v10 BiDi session and still works on v8/v9. | Done (`7c5f666`, `e36710f`) |
| 4 | [task-4-ci-matrix-and-docs.md](task-4-ci-matrix-and-docs.md) | CI runs the suite on v8, v9 and v10. The README shows the support matrix. | Done (`55aceba`, `8060610`) |
| 5 | [task-5-typescript-consumer-check.md](task-5-typescript-consumer-check.md) | A TypeScript 6 consumer project type-checks the public types against WebdriverIO 10, in CI. | Done (`8b0f7f2`) |
| 6 | [task-6-readme-browsing-context.md](task-6-readme-browsing-context.md) | The README example for a browsing context compiles and works in BiDi and Classic sessions. | Done (`e38eedf`) |
| 7 | [task-7-e2e-nested-ignore-and-url-root.md](task-7-e2e-nested-ignore-and-url-root.md) | e2e specs pin `ignoreIframeSelectors` on a nested iframe and capture through the result of `browser.url()`. | Done (`75a4805`) |

Do the tasks in this order. Task 3 needs Task 2: its end-to-end tests fail on v10 only. Tasks 5–7 come from the second v10 audit (2026-10-05). Task 6 needs Task 5: the consumer check is its failing test.

## Changes made outside the tasks

| Change | Why | Commits |
|--------|-----|---------|
| WebdriverIO 8 uses `switchToFrame` when `switchFrame` is missing. | v8 has no `switchFrame`; found by the v8 run in Task 4. analysis.md was wrong. | `55aceba`, `2fa771a` |
| `percySnapshot` accepts a WebdriverIO 10 `BrowsingContext` (type overload included). | Final review: in v10 BiDi, `switchWindow` throws and `percySnapshot(context)` threw `b.call is not a function`. | `d7847b0`, `969367b` |
| CI runs v9 and v10 also in a WebDriver Classic session (`WDIO_CLASSIC=1`). | Final review: no CI job ran `switchFrame` in a Classic session. | `d0c2d8d`, `c745fb6`, `7f69e35` |
| One Node version per major: v8 on Node 20, v9 on Node 22, v10 on Node 24. | User request. | `7f69e35` |

### Current CI test matrix

| Job | WebdriverIO | Node.js | Session |
|-----|-------------|---------|---------|
| `Test (wdio 8)` | `^8` | 20 | Classic (default) |
| `Test (wdio 9)` | `^9` | 22 | BiDi (default) |
| `Test (wdio 9, classic)` | `^9` | 22 | Classic |
| `Test (wdio 10)` | `^10` | 24 | BiDi (default) |
| `Test (wdio 10, classic)` | `^10` | 24 | Classic |

Typecheck runs `tsd` on v8, v9 and v10, and the TypeScript 6 consumer check on v10 (Node 22).

## Open items (user decision)

From the second v10 audit. Not planned as tasks until the user decides.

- **O1 – First CI run.** Nothing is pushed, so the Linux-only v10 behavior (display server start, the `firefox-nightly` CI step with v8 and v10) is not proved. Needs a push.
- **O2 – ESLint 10.** Done on the separate branch `chore/eslint-10` (`d0a6879`, based on this branch), at the user's request. ESLint 10 applies `test/eslint.config.mjs` to the specs; the 6 errors it found are dead code in test stubs, not bugs, so nothing is backported. ESLint 9 is end of life (2026-08-06). v10 needs ESLint 10 only for `eslint-plugin-wdio`, which this repo does not use.
- **O3 – Remove `geckodriver`.** Done: hooks and `geckodriver@3` removed; the session already used WebdriverIO's own driver. `wdio.conf.js` starts a geckodriver in `onPrepare` that WebdriverIO does not use (WebdriverIO starts its own driver since 8.14).
- **O4 – Release 4.0.0.** Bump the version and write the release note (WebdriverIO 6 and 7 dropped, Node.js below 18 dropped).

From the third v10 audit (2026-10-05):

- **O5 – Dependabot group for WebdriverIO.** Done: `.github/dependabot.yml` group `webdriverio`. Dependabot updates `webdriverio` and each `@wdio/*` package in a separate PR. The v10 skill wants them in one change. A `groups` entry for `webdriverio` and `@wdio/*` keeps them together.
- **O6 – Issue template.** `.github/ISSUE_TEMPLATE/bug_report.md` does not ask for the WebdriverIO version or the session protocol (BiDi or Classic). The SDK behavior now depends on both.
- **O7 – `injectGlobals: false`.** `percySnapshot('name')` reads the global `browser`. Without globals it throws `ReferenceError: browser is not defined`, not the SDK message. Same on v8 and v9, so not a v10 change.

Checked in the third audit, no action: the guide and the skill have not changed; no leftover message from the skill's Verify list and no deprecation warning for an SDK command in v10 BiDi or Classic runs (`--logLevel warn`); the release workflow installs no dependencies, so the v10 Node floor does not affect it; the v10 codemod (skill step 8) does not exist in `@wdio/codemod` 0.12.0 or its repository, and the repo has none of the three legacy forms it rewrites.

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
