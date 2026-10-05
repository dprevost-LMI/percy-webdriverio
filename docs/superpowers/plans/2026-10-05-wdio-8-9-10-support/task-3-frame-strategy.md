# Task 3: Frame Strategy for Cross-Origin Iframes (Classic and v10 BiDi)

Read [README.md](README.md) (Global Constraints, Review Focus 1–3) first.

**Why:** In a WebdriverIO 10 BiDi session (the default for Firefox and Chrome), `browser.switchFrame` throws: "`switchFrame` was removed for WebDriver BiDi sessions in WebdriverIO v10. Call `frame()` on the browsing context …". `processFrameTree` catches the error, so `corsIframes` is always missing on v10, with no visible error. v8, v9 and v10 Classic sessions must keep the `switchFrame` path.

**Approach:** Add a frame strategy object with two methods. The Classic strategy switches the session into the frame and back. The context strategy gets a child `BrowsingContext` and needs no switch back. `processFrameTree` runs `execute` and `$$` on a *scope* (the browser for Classic, a `BrowsingContext` for BiDi). Select the strategy by feature detection.

**Files:**
- Modify: `index.js` — `getIframeMeta` (`:43-72`), `processFrameTree` (`:151-267`), `captureSerializedDOM` (`:271-334`), exports (`:408-414`); add `classicFrameStrategy`, `contextFrameStrategy`, `createFrameStrategy`
- Test: `test/iframe-helpers.test.js` (unit, mocks)
- Test: `test/index.test.js` (new `describe('cross-origin iframes in a real browser')`)

**Interfaces:**
- Consumes: Task 2 (v10 installed, so the end-to-end specs exercise BiDi).
- Produces (exported from `index.js` for tests):
  - `classicFrameStrategy(b: WebdriverIO.Browser, log): FrameStrategy` — `enter: async (scope, iframeElement) => { await b.switchFrame(iframeElement); return b; }`, `leave: (depth) => switchToParent(b, log, depth)`.
  - `contextFrameStrategy: FrameStrategy` — `enter: (scope, iframeElement) => scope.frame(iframeElement)`, `leave: async () => true`.
  - `createFrameStrategy(b, log): Promise<{ strategy: FrameStrategy, root: WebdriverIO.Browser | WebdriverIO.BrowsingContext }>`.
  - `FrameStrategy = { enter(scope, iframeElement): Promise<scope>, leave(depth: number): Promise<boolean> }`.
  - `processFrameTree(scope, iframeElement, iframeMeta, depth, ancestorUrls, ctx)` — same positions as today; the first argument is now the parent scope. `ctx.frames?: FrameStrategy`; when missing, use `classicFrameStrategy(scope, ctx.log)`, so existing unit specs keep working unchanged.
  - `getIframeMeta(scope, iframeElement, ignoreSelectors)` — internal, not exported.

- [ ] **Step 1: Add the end-to-end fixture and the capture spec**

In `test/index.test.js` add `describe('cross-origin iframes in a real browser')`. In `beforeAll`, start `http.createServer` with `listen(0)` (all interfaces) and keep `port`. Routes:
- `/child` → `<!doctype html><html><body><p>cors child</p></body></html>`
- `/nested` → `<!doctype html><html><body><p>cors nested</p><iframe src="http://localhost:${port}/child" data-percy-element-id="e2e-leaf"></iframe></body></html>`

The parent page is `helpers.testSnapshotURL` (`localhost:5338`). The child is `http://127.0.0.1:${port}/…`, so it is cross-origin. The leaf (`localhost:${port}`) is cross-origin to the child. Close the server in `afterAll`.

Add the helper `addIframe(src, id)`: `browser.execute` with an `async` function that creates an `iframe`, sets `src` and `data-percy-element-id`, appends it to `body`, and resolves on its `load` event.

```js
it('captures a cross-origin iframe', async () => {
  const requestSpy = spyOn(percySnapshot, 'request').and.callThrough();
  await addIframe(`http://127.0.0.1:${port}/child`, 'e2e-cors');
  await percySnapshot('E2E cross-origin iframe');
  const { corsIframes } = requestSpy.calls.mostRecent().args[0].domSnapshot;
  expect(corsIframes.length).toBe(1);
  expect(corsIframes[0].iframeData.percyElementId).toBe('e2e-cors');
  expect(corsIframes[0].frameUrl).toBe(`http://127.0.0.1:${port}/child`);
  expect(corsIframes[0].iframeSnapshot.html).toContain('cors child');
});
```

- [ ] **Step 2: Add the ignore-selector and nested specs**

```js
it('skips a cross-origin iframe matched by ignoreIframeSelectors', async () => {
  // addIframe(`http://127.0.0.1:${port}/child`, 'e2e-cors')
  // percySnapshot('E2E ignored iframe', { ignoreIframeSelectors: ['[data-percy-element-id="e2e-cors"]'] })
  // expect(domSnapshot.corsIframes).toBeUndefined();
});
it('captures a nested cross-origin iframe', async () => {
  // addIframe(`http://127.0.0.1:${port}/nested`, 'e2e-cors')
  // expect(corsIframes.map((f) => f.iframeData.percyElementId)).toEqual(['e2e-cors', 'e2e-leaf']);
});
```

- [ ] **Step 3: Add the context-restore spec**

```js
it('leaves the session on the top document after the capture', async () => {
  // addIframe(`http://127.0.0.1:${port}/nested`, 'e2e-cors'); await percySnapshot('E2E restore');
  expect(await browser.execute(() => document.URL)).toBe(helpers.testSnapshotURL);
});
```

- [ ] **Step 4: Run the end-to-end specs on v10 and see them fail**

Run: `yarn test`
Expected: FAIL. `captures a cross-origin iframe` and `captures a nested cross-origin iframe` fail with `Cannot read properties of undefined (reading 'length')` (no `corsIframes`). The other two can pass already.

- [ ] **Step 5: Write the unit specs for `createFrameStrategy`**

In `test/iframe-helpers.test.js`, `describe('createFrameStrategy')`:
- `b = { isBidi: false, switchFrame }` → `strategy` is not `contextFrameStrategy`; `root === b`.
- `b = { isBidi: true, switchFrame }` (v9 BiDi, no `browsingContexts`) → Classic; `root === b`.
- `b = { isBidi: true, getWindowHandle: async () => 'ctx-2', browsingContexts: async () => [c1, c2] }` with `c1.contextId = 'ctx-1'`, `c2.contextId = 'ctx-2'` → `strategy === contextFrameStrategy`; `root === c2`.
- Same, but `getWindowHandle` returns `'other'` → `root === c1`.

- [ ] **Step 6: Write the unit specs for the context path**

In `test/iframe-helpers.test.js`, `describe('processFrameTree with contextFrameStrategy')`. Build plain-object mocks:
- `leafCtx = { execute: <1st call resolves undefined, 2nd resolves 'https://leaf.example/', 3rd resolves { html: 'leaf' }>, $$: async () => [] }`
- `childEl = { getAttribute: async (n) => ({ src: 'https://leaf.example/', 'data-percy-element-id': 'leaf' })[n] ?? null }`
- `frameCtx = { execute: <same pattern with 'https://mid.example/' and { html: 'mid' }>, $$: async () => [childEl], frame: jasmine.createSpy('frame').and.resolveTo(leafCtx) }`
- `root = { frame: jasmine.createSpy('frame').and.resolveTo(frameCtx), switchFrame: jasmine.createSpy('switchFrame') }`

```js
const result = await processFrameTree(root, iframeEl, { src: 'https://mid.example/', percyElementId: 'mid' }, 1, new Set(['https://page.example/']),
  { maxFrameDepth: 10, ignoreSelectors: [], options: {}, percyDOMScript: '', log, frames: contextFrameStrategy });
expect(root.frame).toHaveBeenCalledWith(iframeEl);
expect(frameCtx.frame).toHaveBeenCalledWith(childEl);
expect(root.switchFrame).not.toHaveBeenCalled();
expect(result.map((r) => r.iframeData.percyElementId)).toEqual(['mid', 'leaf']);
```

Add one spec where `root.frame` rejects: the result is `[]`, `log.debug` gets `/Failed to process cross-origin iframe/`, and no `percyContextLost` error is thrown (nothing to restore).

Add one `captureSerializedDOM` spec in BiDi mode: `b = { isBidi: true, getWindowHandle, browsingContexts: async () => [root], execute: <serialize → { domSnapshot: {}, url: 'https://page.example/' }>, switchFrame: spy }`, `root.$$` returns `[iframeEl]` with a cross-origin `src` and a `data-percy-element-id`. Expect `domSnapshot.corsIframes.length === 1` and `switchFrame` not called.

- [ ] **Step 7: Run the unit specs and see them fail**

Run: `yarn test`
Expected: FAIL with `createFrameStrategy is not a function` / `contextFrameStrategy` undefined.

- [ ] **Step 8: Implement in `index.js`**

- `createFrameStrategy(b, log)`: if `b.isBidi && typeof b.browsingContexts === 'function'`, get `handle = await b.getWindowHandle()` and `contexts = await b.browsingContexts()`; `root` is the context whose `contextId === handle`, else `contexts[0]`; return the context strategy. Otherwise return `{ strategy: classicFrameStrategy(b, log), root: b }`. (`getWindowHandle()` equals the top-level context id; WebdriverIO 10 uses this itself.)
- `processFrameTree`: `const frames = ctx.frames || classicFrameStrategy(scope, log)`. Replace `await b.switchFrame(iframeElement)` with `const frameScope = await frames.enter(scope, iframeElement)`. Run the three `execute` calls and `$$('iframe')` on `frameScope`. Recurse with `frameScope`. In `finally`, call `frames.leave(depth)` in place of `switchToParent(b, log, depth)`. Keep all `percyContextLost` logic.
- `getIframeMeta(scope, iframeElement, ignoreSelectors)`: replace `iframeElement.execute(function () { this.matches … })` with `scope.execute((el, selectors) => selectors.some((s) => { try { return el.matches(s); } catch (e) { return false; } }), iframeElement, ignoreSelectors)`. An element passed as an argument works on v8, v9 and v10 (v8 has no `element.execute`). Keep the surrounding `try/catch`.
- `captureSerializedDOM`: inside the existing `try`, call `createFrameStrategy(b, log)`, set `ctx.frames = strategy`, query `root.$$('iframe')`, and pass `root` to `getIframeMeta` and `processFrameTree`.
- Export `classicFrameStrategy`, `contextFrameStrategy`, `createFrameStrategy`.
- Update the comment above `switchToParent` to say that it is the Classic `leave`.

- [ ] **Step 9: Run all specs with coverage**

Run: `yarn test:coverage`
Expected: PASS for all specs, including the four end-to-end specs from Steps 1–3 on v10. Coverage 100 %. If a new branch is reachable only in a live browser, cover it with a unit spec; add `/* istanbul ignore */` only with the same reason style as the existing comments.

- [ ] **Step 10: Run the end-to-end specs on v9**

Run: `yarn add --dev --ignore-engines webdriverio@^9 @wdio/cli@^9 @wdio/local-runner@^9 @wdio/jasmine-framework@^9 @wdio/spec-reporter@^9 && yarn test; git checkout package.json yarn.lock && yarn install`
Expected: PASS. (v9 BiDi has no `browsingContexts`, so this proves that the Classic strategy still works there.)

- [ ] **Step 11: Commit**

```bash
git add index.js test/index.test.js test/iframe-helpers.test.js
git commit -m "fix: capture cross-origin iframes through BrowsingContext.frame() in wdio 10 BiDi sessions"
```
