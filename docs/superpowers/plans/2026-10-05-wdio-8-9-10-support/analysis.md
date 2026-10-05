# Impact Analysis: WebdriverIO v10 Guide Applied to This Repository

Date: 2026-10-05. Repository state: `master` at `24af5c6` (release 3.3.4).

## Current state

| Item | Value | Location |
|------|-------|----------|
| Runtime code | `index.js` (415 lines), `_iframe_shim.js` | CommonJS |
| Peer range | `~6 \|\| ~7 \|\| ~8 \|\| ~ 9` | `package.json` |
| Dev WebdriverIO | `^9.2.1` (`webdriverio`, `@wdio/cli`, `@wdio/local-runner`, `@wdio/jasmine-framework`, `@wdio/spec-reporter`) | `package.json` |
| Node.js | `engines >=14`; `.nvmrc` 16; `.node-version` 16.9.1; CI Node 20 | stale for wdio 9 (needs 18.20) |
| Test runner | `percy exec --testing -- wdio wdio.conf.js`, Jasmine, headless Firefox | `wdio.conf.js` |
| CI | Test, Typecheck, Lint, Pack (Node 20 only, wdio 9 only) | `.github/workflows/` |

Latest published versions on 2026-10-05: `webdriverio` 8.46.0, 9.32.0, 10.0.0. `webdriverio@10` needs Node `>=22.19.0`. `@wdio/jasmine-framework@10` uses Jasmine 6.

## Breaking changes that affect this repository

| Guide item | Where in this repo | Effect today on v10 | Task |
|------------|--------------------|---------------------|------|
| `executeAsync` removed | `index.js:362-366` (`runReadinessGate((script) => b.executeAsync(script), …, { callback: true })`) | `b.executeAsync` is not a function. `runReadinessGate` catches the error. The snapshot has no `readiness_diagnostics` and readiness never waits. **Silent.** | 1 |
| `switchFrame` throws in a BiDi session; use `BrowsingContext.frame()` | `index.js:168` (`b.switchFrame(iframeElement)`), `index.js:140` (`b.switchFrame(null)`) | v10 Firefox and Chrome sessions are BiDi by default. Every cross-origin iframe capture throws and is caught. `corsIframes` is always missing. **Silent.** | 3 |
| `switchToFrame` not public | `index.js` `switchSessionFrame` calls it only when `switchFrame` is missing (WebdriverIO 8) | none: v9 and v10 have `switchFrame` | 4 |
| Node.js `>=22.19.0` | `.nvmrc`, `.node-version`, workflows | `yarn` fails on engines | 2 |
| Jasmine 6: sync matchers are sync again; unawaited failures now fail the spec | `test/*.test.js` | Specs with a hidden failure in v9 now fail. Fix the test or the code, not the `expect`. | 2 |
| `jasmineNodeOpts`, `failFast`, `stopSpecOnExpectationFailure` | not used in `wdio.conf.js` | none | – |
| Capability `specs` / `exclude` | not used | none | – |
| Strict `$` | SDK uses `$$('iframe')` only; tests use no `$` | none | – |
| `$$` returns `ElementArray`; `for...of` needs an awaited list | `index.js:212`, `index.js:288` await the list first | none | – |
| `isW3C`, `ELEMENT`, `getHTML(bool)`, `getCookies(string)`, `addCommand(…, true)`, `newWindow` options, `throttle`, `touchAction`, `uploadFile`, `multiremote` names | not used | none | – |
| `webdriverio` `exports` has no `./package.json` | `index.js:11-30` | First `require` throws; the existing fallback (`require.resolve('webdriverio')` + `../package.json`) must work. Not yet tested on v10. | 4 |
| TypeScript: `typeScriptVersion` 6.0.3; `Element` type export removed | `types/index.d.ts` uses only global `WebdriverIO.Browser` | `tsd` bundles TypeScript 5.9; v10 lib types can fail to compile. | 2 |
| ESLint 10 for `eslint-plugin-wdio` | plugin not used | none (ESLint 9 upgrade is optional, out of scope) | – |
| Display server (`@wdio/xvfb` → `@wdio/display-server`) | headless Firefox, no `autoXvfb` | none | – |
| Appium 3 | not used; Automate/App sessions are rejected by the SDK | none | – |

## APIs the SDK uses and their status in v8, v9 and v10

| API | v8 | v9 | v10 Classic | v10 BiDi |
|-----|----|----|-------------|----------|
| `browser.call(fn)` | yes | yes | yes | yes |
| `browser.execute(string)` with `return <promise>` | awaits the promise (W3C Execute Script) | yes | yes | yes (`new Function(script)`, `awaitPromise: true`) |
| `browser.executeAsync` | yes | yes | **removed** | **removed** |
| `browser.$$('iframe')` | array | array | `ElementArray` | `ElementArray` |
| `element.getAttribute` | yes | yes | yes | yes |
| `element.execute(fn)` with `this` = element | no (caught) | yes | yes | yes (verify, Review Focus 3) |
| `browser.switchFrame(element \| null)` | **no** (added in v9; v8 has only the protocol command `switchToFrame`) | yes | yes | **throws** |
| `browser.switchToFrame(element \| null)` | yes | yes | not public | not public |
| `browser.switchToParentFrame` | yes | yes | yes | not usable with BiDi contexts |
| `browser.browsingContexts()` | no | no | throws (not BiDi) | yes |
| `BrowsingContext.frame(element)` / `.execute` / `.$$` | no | no | no | yes |
| `browser.getWindowHandle()` | yes | yes | yes | yes (equals the top-level context id; wdio itself uses this) |

## Readiness script modes (from `@percy/sdk-utils` 1.32.11)

- `waitForReadyScript(cfg, { callback: true })` uses `arguments[arguments.length - 1]`. It needs `executeAsync`.
- `waitForReadyScript(cfg, { callback: false })` is one expression that evaluates to the `PercyDOM.waitForReady(cfg)` promise. It has no `return`. Wrap it as `` `return (${script});` `` for `execute`. `execute` awaits the returned promise on all majors.
