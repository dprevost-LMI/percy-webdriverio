# Task 2: Move the Dev Toolchain to WebdriverIO 10

Read [README.md](README.md) (Global Constraints, Decisions D1 and D2) first.

**Why:** Development and the default CI job run on the newest major. WebdriverIO 10 needs Node.js `>=22.19.0` and brings Jasmine 6. The published peer range must accept v10.

**Files:**
- Modify: `package.json` (`peerDependencies`, `engines`, `devDependencies`)
- Modify: `yarn.lock` (generated)
- Modify: `.nvmrc`, `.node-version`
- Modify: `tsconfig.json` (only if Step 5 needs it)
- Modify: `.github/workflows/test.yml`, `typecheck.yml`, `lint.yml`, `pack.yml` (`node-version` only)
- Modify: `test/index.test.js`, `test/iframe-helpers.test.js` (only specs that Jasmine 6 shows as broken)

**Interfaces:**
- Consumes: Task 1 (no `executeAsync` in `index.js`).
- Produces: a v10 dev environment. Task 3 runs its end-to-end specs on it. Task 4 overrides the five `@wdio`/`webdriverio` dev packages per CI job, so keep exactly these five names: `webdriverio`, `@wdio/cli`, `@wdio/local-runner`, `@wdio/jasmine-framework`, `@wdio/spec-reporter`.

- [x] **Step 1: Set the Node.js version**

Write `22` in `.nvmrc` and `22.19.0` in `.node-version`. Run `nvm use` (or your version manager).
Run: `node -v`
Expected: `v22.19.0` or a later 22.x / 24.x.

- [x] **Step 2: Change `package.json`**

- `peerDependencies.webdriverio`: `^8 || ^9 || ^10`
- `engines.node`: `>=18`
- `devDependencies`: `webdriverio`, `@wdio/cli`, `@wdio/local-runner`, `@wdio/jasmine-framework`, `@wdio/spec-reporter` → `^10.0.0`; `jasmine` → `^6.0.0`; `tsd` → `^0.33.0`.

Run: `yarn install`
Expected: no engine error. `node -e "console.log(require(require('path').dirname(require.resolve('webdriverio')) + '/../package.json').version)"` prints `10.x.y`.

- [x] **Step 3: Run the suite on v10**

Run: `yarn test`
Expected: PASS for every spec. The spec `attaches readiness diagnostics from the real browser` (Task 1) passes on v10.

If a spec fails, find which class of failure it is and fix it as follows. Do not set `strictSelectors: false`. Do not change `expect(...)` to `expectAsync(...)` to hide a failure.
- A sync Jasmine matcher that did not `await` now fails at once (Jasmine 6). The spec had a hidden failure on v9. Fix the test data or the code, as the migration guide says ("Jasmine" section).
- `browser = null` / `browser = { … }` does not change the global. Add `function setBrowser(value) { Object.defineProperty(globalThis, 'browser', { value, writable: true, configurable: true }); }` at the top of `test/index.test.js` and use it in `beforeEach`/`afterEach` and in `buildBrowser`.
- A leftover-option message from the "Verify" list of the v10 skill (for example `jasmineNodeOpts`). Apply the replacement from the skill table.

- [x] **Step 4: Run coverage**

Run: `yarn test:coverage`
Expected: PASS. `nyc` reports 100 % for all four metrics.

- [x] **Step 5: Run the type tests**

Run: `yarn test:types`
Expected: PASS. If `tsd` reports errors inside `node_modules/webdriverio` or `node_modules/@wdio/*` (their types target TypeScript 6.0.3; `tsd` 0.33 bundles 5.9), add `"skipLibCheck": true` to `compilerOptions` in `tsconfig.json` and run again. Errors in `types/index.d.ts` or `types/index.test-d.ts` are real: fix them. Do not remove an `expectError` line.

- [x] **Step 6: Run lint and the pack smoke test**

Run: `yarn lint`
Expected: no errors.

Run:
```bash
TARBALL="$PWD/$(npm pack --silent)"; D=$(mktemp -d); (cd "$D" && npm init -y >/dev/null && npm install --no-audit --no-fund "$TARBALL" >/dev/null && node -e "require('@percy/webdriverio'); console.log('ok')"); rm -f "$TARBALL"
```
Expected: `ok`.

- [x] **Step 7: Set Node 22 in CI**

In `test.yml` set `matrix.node: [22]`. In `typecheck.yml`, `lint.yml` and `pack.yml` set `node-version: 22`. Change nothing else; Task 4 builds the version matrix.

- [x] **Step 8: Commit**

```bash
git add package.json yarn.lock .nvmrc .node-version tsconfig.json .github/workflows test/
git commit -m "chore: develop against webdriverio 10 and Node 22; peer range ^8 || ^9 || ^10"
```
