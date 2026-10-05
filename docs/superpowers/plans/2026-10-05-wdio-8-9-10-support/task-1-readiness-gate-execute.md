# Task 1: Readiness Gate Through `execute`

Read [README.md](README.md) (Global Constraints, Review Focus) first.

**Why:** WebdriverIO 10 removes `browser.executeAsync`. Today the readiness gate calls it. On v10 the call fails, `runReadinessGate` catches the error, and the snapshot has no readiness data. `execute` with a script that returns a promise works on v8, v9 and v10 (see [analysis.md](analysis.md), "Readiness script modes").

**Files:**
- Modify: `index.js:355-366` (readiness gate call and its comment)
- Test: `test/index.test.js:352-447` (`describe('readiness gate')`) and one new spec in `describe('percySnapshot')`

**Interfaces:**
- Consumes: `utils.runReadinessGate(evalScript: (script: string) => Promise<any>, snapshotOptions, { callback: boolean, log })` from `@percy/sdk-utils`. With `callback: false` the script is one expression that evaluates to the `PercyDOM.waitForReady(cfg)` promise, with no `return`.
- Produces: nothing new for later tasks. After this task, `index.js` contains no `executeAsync`.

- [x] **Step 1: Change the readiness-gate tests to expect `execute`**

In `test/index.test.js`, in `buildBrowser`, remove `executeAsync` and `executeAsyncImpl`. Add a `readinessImpl` option. `execute` sends a call whose first argument is a string that contains `PercyDOM.waitForReady` to `readinessImpl` (default `Promise.resolve()`), and records it in a `readinessCalls` array. Other calls keep the current behavior. Return `{ readinessCalls, executeCalls }`.

Rename and rewrite the five specs:

```js
it('calls execute with a promise-returning waitForReady script before serialize', async () => {
  const { readinessCalls, executeCalls } = buildBrowser({ readinessImpl: () => Promise.resolve({ ok: true }) });
  await percySnapshot('readiness-happy-path');
  expect(readinessCalls.length).toBe(1);
  expect(readinessCalls[0].length).toBe(1);                       // no extra args
  expect(readinessCalls[0][0]).toMatch(/^return \(/);              // execute needs an explicit return
  expect(readinessCalls[0][0]).not.toContain('arguments[arguments.length - 1]');
  const serializeIndex = executeCalls.findIndex((a) => typeof a[0] === 'function');
  const readinessIndex = executeCalls.findIndex((a) => typeof a[0] === 'string' && a[0].includes('PercyDOM.waitForReady'));
  expect(readinessIndex).toBeLessThan(serializeIndex);
});
// 'inlines per-snapshot readiness config as JSON into the script' — same assertions on readinessCalls[0][0]:
//   toContain('"preset":"strict"'), toContain('"stabilityWindowMs":500')
// 'skips the readiness script when preset is disabled' — readinessCalls.length === 0
// 'still serializes when the readiness script rejects' — readinessImpl rejects new Error('readiness boom')
// 'still serializes when the readiness script rejects with a non-Error' — readinessImpl rejects 'plain-string-rejection'
```

Change the forward-compat polyfill at the top of the file (`test/index.test.js:10-35`) only if it breaks. It already forwards `callback`.

- [x] **Step 2: Add an end-to-end readiness spec**

In `describe('percySnapshot')`, after the spec `passes options to the DOM serialization and captures domSnapshot and url`:

```js
it('attaches readiness diagnostics from the real browser', async () => {
  const requestSpy = spyOn(percySnapshot, 'request').and.callThrough();
  await percySnapshot('Readiness diagnostics');
  const { domSnapshot } = requestSpy.calls.mostRecent().args[0];
  expect(domSnapshot.readiness_diagnostics).toEqual(jasmine.any(Object));
});
```

- [x] **Step 3: Run the tests and see them fail**

Run: `yarn test`
Expected: FAIL. The five readiness specs fail with `readinessCalls.length` `0`, because the code still calls `executeAsync` (on the mock, `b.executeAsync is not a function`, caught). The end-to-end spec passes on v9 (still installed); it is the guard for Task 2.

- [x] **Step 4: Change `index.js:362-366`**

Call `utils.runReadinessGate((script) => b.execute(`return (${script});`), options, { callback: false, log })`. Keep the parentheses: the script starts with a newline, and `return` followed by a newline returns `undefined`. Replace the comment at `index.js:355-361`: say that the promise-mode script works with `execute` on WebdriverIO 8, 9 and 10, and that v10 removed `executeAsync`.

- [x] **Step 5: Run the tests and see them pass**

Run: `yarn test:coverage`
Expected: PASS, all specs. Coverage 100 % (no new branch in `index.js`).

- [x] **Step 6: Check that no `executeAsync` stays**

Run: `grep -n "executeAsync" index.js`
Expected: no output.

- [x] **Step 7: Commit**

```bash
git add index.js test/index.test.js
git commit -m "fix: run readiness gate through execute (executeAsync is removed in wdio 10)"
```
