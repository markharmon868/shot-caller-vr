import test from "node:test";
import assert from "node:assert/strict";

import { resolveAppMode } from "../src/routing.ts";

const desktopUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
const questUserAgent = "Mozilla/5.0 OculusBrowser/27.3.0.9.47";

test("desktop without a scene defaults to intake", () => {
  const mode = resolveAppMode(new URL("https://shot-caller.local/"), desktopUserAgent);
  assert.equal(mode, "intake");
});

test("desktop with a scene defaults to editor", () => {
  const mode = resolveAppMode(new URL("https://shot-caller.local/?scene=abc123"), desktopUserAgent);
  assert.equal(mode, "editor");
});

test("headset with a scene defaults to stage4-xr", () => {
  const mode = resolveAppMode(new URL("https://shot-caller.local/?scene=abc123"), questUserAgent);
  assert.equal(mode, "stage4-xr");
});

test("headset without a scene gets the empty XR shell", () => {
  const mode = resolveAppMode(new URL("https://shot-caller.local/"), questUserAgent);
  assert.equal(mode, "headset-empty");
});

test("explicit stage4-xr without a scene still blocks on headset", () => {
  const mode = resolveAppMode(new URL("https://shot-caller.local/?mode=stage4-xr"), questUserAgent);
  assert.equal(mode, "headset-empty");
});

test("explicit viewer mode remains reachable", () => {
  const mode = resolveAppMode(new URL("https://shot-caller.local/?mode=viewer&scene=abc123"), desktopUserAgent);
  assert.equal(mode, "viewer");
});
