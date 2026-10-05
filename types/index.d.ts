import { SnapshotOptions } from '@percy/core';

declare global {
  namespace WebdriverIO {
    // WebdriverIO 10 defines BrowsingContext (the result of newWindow() and
    // url() in a BiDi session); this empty declaration merges with it and
    // keeps the overload below valid on WebdriverIO 8 and 9.
    interface BrowsingContext {}
  }
}

export default function percySnapshot(
  browser: WebdriverIO.Browser,
  name: string,
  options?: SnapshotOptions
): Promise<void | { [key: string]: any }>;

export default function percySnapshot(
  context: WebdriverIO.BrowsingContext,
  name: string,
  options?: SnapshotOptions
): Promise<void | { [key: string]: any }>;

export default function percySnapshot(
  name: string,
  options?: SnapshotOptions
): Promise<void | { [key: string]: any }>;
