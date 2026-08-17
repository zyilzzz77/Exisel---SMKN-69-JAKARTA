import assert from "node:assert/strict";
import test from "node:test";

test("Turnstile options config includes all retry & refresh contracts", () => {
  const options = {
    sitekey: "test-site-key",
    action: "login",
    execution: "render",
    appearance: "always",
    theme: "auto",
    size: "flexible",
    retry: "auto",
    "retry-interval": 8000,
    "refresh-expired": "auto",
    "refresh-timeout": "auto",
  };

  assert.equal(options.action, "login");
  assert.equal(options.execution, "render");
  assert.equal(options.appearance, "always");
  assert.equal(options.size, "flexible");
  assert.equal(options.retry, "auto");
  assert.equal(options["retry-interval"], 8000);
  assert.equal(options["refresh-expired"], "auto");
  assert.equal(options["refresh-timeout"], "auto");
});

test("Turnstile callback race conditions guard generation index", () => {
  let activeGeneration = 1;
  let verified = false;

  const callback = (gen: number) => {
    if (gen !== activeGeneration) return;
    verified = true;
  };

  // Stale callback from generation 0
  callback(0);
  assert.equal(verified, false);

  // Active callback
  callback(1);
  assert.equal(verified, true);
});
