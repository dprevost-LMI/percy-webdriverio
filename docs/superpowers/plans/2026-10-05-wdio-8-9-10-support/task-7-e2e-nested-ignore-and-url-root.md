# Task 7: e2e Specs for a Nested Ignored Iframe and the `browser.url()` Root

Read [README.md](README.md) (Review Focus 3) first. Start this task only after the user confirms it.

**Why:** Two behaviors work (checked with a scratch script on v10, BiDi and Classic) but have no automated test:
1. `ignoreIframeSelectors` on a nested iframe. That check runs inside a frame context (`frameScope.execute`). The current e2e spec covers only a top-level iframe, and it does not prove its own cause: it also passes when capture fails for any reason.
2. Capture through the result of `browser.url()` (a `BrowsingContext` in BiDi, the Classic stand-in in Classic), which Task 6 documents.

**Files:**
- Test: `test/index.test.js` (`describe('cross-origin iframes in a real browser')`)

- [ ] **Step 1: Add the fixture route**

Add `/nested-ignore` to the test server: like `/nested`, but the leaf iframe also has `class="no-percy"`.

- [ ] **Step 2: Add the specs**

```js
it('skips a nested cross-origin iframe matched by ignoreIframeSelectors', async () => {
  // addIframe(`http://127.0.0.1:${port}/nested-ignore`, 'e2e-cors')
  // percySnapshot('E2E nested ignore', { ignoreIframeSelectors: ['.no-percy'] })
  // expect(corsIframes.map((f) => f.iframeData.percyElementId)).toEqual(['e2e-cors']);  // parent captured, leaf skipped
});

it('captures through the browsing context that browser.url() returns', async () => {
  // const page = await browser.url(helpers.testSnapshotURL); then addIframe(`http://127.0.0.1:${port}/nested`, 'e2e-cors')
  // if (!page || typeof page !== 'object') { pending('browser.url() returns no context before webdriverio 10'); return; }
  // percySnapshot(page, 'E2E url root')
  // expect(url).toBe(helpers.testSnapshotURL); expect ids toEqual(['e2e-cors', 'e2e-leaf']);
});
```

- [ ] **Step 3: Prove that the nested-ignore spec can fail**

Run once with `ignoreIframeSelectors: []` and see it fail (`['e2e-cors', 'e2e-leaf']`). Put the selector back.

- [ ] **Step 4: Run every CI combination**

v8 (Node 20), v9 and v9 Classic (Node 22), v10 and v10 Classic (Node 24), each with `WDIO_MAJOR` (and `WDIO_CLASSIC=1` for Classic) and `yarn test:coverage`.
Expected: PASS, 100 % coverage. The `browser.url()` spec is pending on v8 and v9.

- [ ] **Step 5: Commit**

```bash
git add test/index.test.js
git commit -m "test: pin nested ignoreIframeSelectors and the browser.url() root in a real browser"
```
