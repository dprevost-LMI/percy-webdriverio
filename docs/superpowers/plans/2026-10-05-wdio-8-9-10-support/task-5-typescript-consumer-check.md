# Task 5: TypeScript Consumer Check (TypeScript 6, WebdriverIO 10)

Read [README.md](README.md) (Global Constraints) first.

**Why:** WebdriverIO 10 types target TypeScript 6.0.3 (`typeScriptVersion`). TypeScript 6 loads no `@types/*` package by default and is `strict` by default. The only type check today is `tsd`, which bundles TypeScript 5.9 and checks `types/index.test-d.ts` in isolation. No check compiles the public types the way a WebdriverIO 10 user does. The second audit found a README example that fails in such a project (TS2769), and no check caught it.

**Approach:** A small TypeScript project in `types/consumer/` that imports `@percy/webdriverio` from `types/index.d.ts` (through `paths`) and uses it as a testrunner user and as a standalone user do. It uses the `types` list that the v10 guide gives for Jasmine. It runs only against WebdriverIO 10, because it uses v10 APIs (`browser.url()` returns a `BrowsingContext`).

**Files:**
- Create: `types/consumer/tsconfig.json`, `types/consumer/runner.ts`, `types/consumer/standalone.ts`
- Modify: `package.json` (`scripts.test:types:consumer`, `devDependencies.typescript`)
- Modify: `.github/workflows/typecheck.yml` (one step, v10 job only)

**Interfaces:**
- Produces: `yarn test:types:consumer` (`tsc -p types/consumer`). Task 6 adds the README example to `types/consumer/runner.ts`.
- `package.json` `files` does not change: `types/consumer/` is not published.

- [ ] **Step 1: Write the consumer project**

`types/consumer/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["es2024", "dom"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node", "jasmine", "@wdio/globals/types", "@wdio/jasmine-framework"],
    "paths": { "@percy/webdriverio": ["../index.d.ts"] }
  },
  "include": ["*.ts"]
}
```

`types/consumer/runner.ts` (testrunner globals): `percySnapshot('name')`, `percySnapshot('name', { widths: [1000] })`, `percySnapshot(browser, 'name')`, and `percySnapshot(await browser.url('https://example.com'), 'name')`. Add two `// @ts-expect-error` lines: `percySnapshot(browser, 'name', { foo: 'bar' })` and `percySnapshot(browser)`.

`types/consumer/standalone.ts`: `const b = await remote({ capabilities: { browserName: 'chrome' } }); await percySnapshot(b, 'name');` (import `remote` from `webdriverio`).

- [ ] **Step 2: Run it with the current TypeScript and see it fail**

Run: `npx tsc -p types/consumer`
Expected: FAIL. The repo has `typescript@^5.6.3`, which does not accept `target: es2024` (needs 5.7) and is older than the 6.0.3 that WebdriverIO 10 types target.

- [ ] **Step 3: Use TypeScript 6 and add the script**

`devDependencies.typescript` → `^6.0.3`. `scripts.test:types:consumer` → `tsc -p types/consumer`. Run `yarn install`.

- [ ] **Step 4: Run it and see it pass**

Run: `yarn test:types:consumer`
Expected: PASS, no output. Also run `yarn test:types` (tsd) → PASS, and `yarn lint` → 0 errors.

- [ ] **Step 5: Prove that the check reports errors**

Delete one `// @ts-expect-error` line, run `yarn test:types:consumer`, and see TS2353 (or TS2554). Put the line back.

- [ ] **Step 6: Run it in CI**

In `typecheck.yml`, after `yarn test:types`, add a step `if: ${{ matrix.wdio == 10 }}` that runs `yarn test:types:consumer`.

- [ ] **Step 7: Commit**

```bash
git add types/consumer package.json yarn.lock .github/workflows/typecheck.yml
git commit -m "test: type-check the public types in a TypeScript 6 consumer project"
```
