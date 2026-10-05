# Task 4: CI Matrix for WebdriverIO 8, 9 and 10, and README

Read [README.md](README.md) (Global Constraints, Review Focus 4–5) first.

**Why:** A support claim needs proof on each major. Today CI tests only v9. The matrix must also prove that each job really installed the major it names.

**Files:**
- Modify: `.github/workflows/test.yml` (matrix and install step)
- Modify: `.github/workflows/typecheck.yml` (matrix and install step)
- Test: `test/index.test.js` (one new spec)
- Modify: `README.md` (compatibility section, standalone example)

**Interfaces:**
- Consumes: Task 2 (the five dev package names; v10 in `yarn.lock`), Task 3 (end-to-end iframe specs).
- Produces: CI jobs named `Test (wdio 8)`, `Test (wdio 9)`, `Test (wdio 10, node 22)`, `Test (wdio 10, node 24)`. The `WDIO_MAJOR` environment variable in the test step.

- [ ] **Step 1: Add the version spec**

In `test/index.test.js`, in `describe('percySnapshot')`:

```js
it('reports the installed webdriverio version as environmentInfo', async () => {
  const requestSpy = spyOn(percySnapshot, 'request').and.callThrough();
  await percySnapshot('Environment info');
  const { environmentInfo } = requestSpy.calls.mostRecent().args[0];
  expect(environmentInfo).toMatch(/^webdriverio\/\d+\.\d+\.\d+/);
  if (process.env.WDIO_MAJOR) {
    expect(environmentInfo).toMatch(new RegExp(`^webdriverio/${process.env.WDIO_MAJOR}\\.`));
  }
});
```

Run: `WDIO_MAJOR=10 yarn test` → PASS. Run: `WDIO_MAJOR=9 yarn test` → FAIL on this spec only (proves the guard works).

- [ ] **Step 2: Change `test.yml` to a matrix**

```yaml
name: Test (wdio ${{ matrix.wdio }}${{ matrix.wdio == 10 && format(', node {0}', matrix.node) || '' }})
strategy:
  fail-fast: false
  matrix:
    include:
      - { wdio: 8,  node: 20 }
      - { wdio: 9,  node: 20 }
      - { wdio: 10, node: 22 }
      - { wdio: 10, node: 24 }
```

- Add `wdio-${{ matrix.wdio }}` to the cache `key` and `restore-keys`.
- Replace `- run: yarn` with two steps:
  - `if: matrix.wdio == 10` → `yarn install --frozen-lockfile`
  - `if: matrix.wdio != 10` → `yarn add --dev --ignore-engines webdriverio@^${{ matrix.wdio }} @wdio/cli@^${{ matrix.wdio }} @wdio/local-runner@^${{ matrix.wdio }} @wdio/jasmine-framework@^${{ matrix.wdio }} @wdio/spec-reporter@^${{ matrix.wdio }}`
- Set `env: WDIO_MAJOR: ${{ matrix.wdio }}` on the `yarn test:coverage` step.
- Keep the Firefox-nightly step, the `workflow_dispatch` branch check and the `@percy/cli` git setup unchanged. Keep `persist-credentials: false`.

- [ ] **Step 3: Change `typecheck.yml` the same way**

Use the matrix `wdio: [8, 9, 10]` with `node: 22`, the same two install steps, and `yarn test:types`. Add `persist-credentials: false` to its checkout.

- [ ] **Step 4: Run each major locally**

For `N` in `8` and `9`:
```bash
yarn add --dev --ignore-engines webdriverio@^N @wdio/cli@^N @wdio/local-runner@^N @wdio/jasmine-framework@^N @wdio/spec-reporter@^N
WDIO_MAJOR=N yarn test:coverage && yarn test:types
git checkout package.json yarn.lock && yarn install
```
Then `WDIO_MAJOR=10 yarn test:coverage && yarn test:types`.
Expected: PASS on all three, with 100 % coverage. On v8, if a spec fails only because of a v8 API gap, fix `index.js` with feature detection (Global Constraints), not with a version check.

- [ ] **Step 5: Update `README.md`**

- Add `## Compatibility` after `## Installation`: a table with `@percy/webdriverio 4.x` → WebdriverIO 8, 9, 10; `3.x` → WebdriverIO 6, 7, 8, 9. Say that WebdriverIO sets the Node.js floor (v10 needs Node.js 22.19.0 or later). Say that cross-origin iframes work in Classic and BiDi sessions.
- In the standalone example, change `percySnapshot(browser, 'WebdriverIO at DuckDuckGo');` to `await percySnapshot(...)`.

- [ ] **Step 6: Search for v10 leftovers in the whole repository**

Run: `git grep -nE "executeAsync|switchToFrame|isW3C|\.ELEMENT\b|jasmineNodeOpts|multiremote|tagExpression|getHTML\((true|false)\)" -- ':!docs' ':!yarn.lock'`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/test.yml .github/workflows/typecheck.yml test/index.test.js README.md
git commit -m "ci: test against webdriverio 8, 9 and 10; document compatibility"
```

- [ ] **Step 8: Ask the user, then open the PR**

Ask the user before you push. In the PR description, list D1/D2 and the release version (`4.0.0` for D1 as planned). Expected after the push: the four Test jobs, three Typecheck jobs, Lint and Pack are green.
