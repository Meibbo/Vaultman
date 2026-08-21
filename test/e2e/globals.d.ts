/**
 * The E2E suite runs under wdio with the mocha framework, and both provide
 * their API through globals and through an ambient namespace rather than a
 * plain module export: `@wdio/globals` types `expect` as
 * `ExpectWebdriverIO.Expect`, which only exists once `expect-webdriverio`'s
 * declarations are loaded. `tsconfig.json` sets no `types` array, and adding
 * one would narrow what every other file gets, so the references live here
 * instead -- next to the only suite that needs them.
 *
 * This replaces the hand-written `mocha-globals.d.ts` shim, which declared
 * `describe`/`it` but not `expect`, so every assertion in the suite linted as
 * an unsafe call on `any`.
 */
/// <reference types="mocha" />
/// <reference types="expect-webdriverio" />
/// <reference types="@wdio/globals/types" />
