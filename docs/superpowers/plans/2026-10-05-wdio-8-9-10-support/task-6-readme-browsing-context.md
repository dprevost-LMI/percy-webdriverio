# Task 6: README Example for a Browsing Context

Read [README.md](README.md) first.

**Why:** The README says "give a browsing context, for example the result of `browser.newWindow()`". In WebdriverIO 10, `newWindow()` returns `WebdriverIO.BrowsingContext` only in a BiDi session; in a Classic session it returns `{ handle, type }` (and switches the session to the new window). So:
- TypeScript 6 and 7 reject `percySnapshot(tab, …)` with TS2769 (`BrowsingContext | { handle, type }` matches no overload).
- At runtime in a Classic session, the SDK logs "Could not take DOM snapshot" and takes no snapshot.

`browser.url()` returns a `BrowsingContext` in BiDi and a Classic stand-in in a Classic session. Both work with `percySnapshot` (checked on v10 in BiDi and Classic), and the type is `WebdriverIO.BrowsingContext` in both.

**Files:**
- Modify: `README.md` (the paragraph after the Compatibility table)
- Test: `types/consumer/runner.ts`

**Interfaces:**
- Consumes: Task 5 (`yarn test:types:consumer`).

- [ ] **Step 1: Put the current README example in the consumer check**

Add to `types/consumer/runner.ts`, as the README has it:
```ts
const tab = await browser.newWindow('https://example.com', { type: 'tab' });
await percySnapshot(tab, 'Second tab');
```

- [ ] **Step 2: Run it and see it fail**

Run: `yarn test:types:consumer`
Expected: FAIL with TS2769 on the `percySnapshot(tab, …)` line.

- [ ] **Step 3: Change the README**

Replace the paragraph with: in WebdriverIO 10 you can give a browsing context as the first argument; the result of `browser.url()` works in BiDi and Classic sessions (example: `const page = await browser.url('https://example.com'); await percySnapshot(page, 'Example page');`); in a BiDi session the result of `browser.newWindow()` is also a browsing context (a Classic session switches to the new window, so use `browser`).

Replace the Step 1 lines in `types/consumer/runner.ts` with the new README example, exactly as written.

- [ ] **Step 4: Run it and see it pass**

Run: `yarn test:types:consumer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md types/consumer/runner.ts
git commit -m "docs: show browser.url() as the browsing context example"
```
