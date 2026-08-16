import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalAppOrigin, sanitizeInternalRedirect } from "./url";

test("getCanonicalAppOrigin mengembalikan NEXT_PUBLIC_APP_URL jika valid", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://exisel.web.id";
  const origin = getCanonicalAppOrigin();
  assert.equal(origin, "https://exisel.web.id");
});

test("sanitizeInternalRedirect mengarahkan relative path ke canonical origin", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://exisel.web.id";
  assert.equal(sanitizeInternalRedirect("/register/student"), "https://exisel.web.id/register/student");
  assert.equal(sanitizeInternalRedirect("/dashboard"), "https://exisel.web.id/dashboard");
  assert.equal(sanitizeInternalRedirect("/pending"), "https://exisel.web.id/pending");
});

test("sanitizeInternalRedirect menolak path berbahaya dan fallback ke origin root", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://exisel.web.id";
  assert.equal(sanitizeInternalRedirect("https://evil.com"), "https://exisel.web.id/");
  assert.equal(sanitizeInternalRedirect("//evil.com"), "https://exisel.web.id/");
  assert.equal(sanitizeInternalRedirect("javascript:alert(1)"), "https://exisel.web.id/");
});

test("getCanonicalAppOrigin fallback ke X-Forwarded-Host jika env tidak ada", () => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.APP_URL;
  const mockReq = new Request("http://0.0.0.0:3000/api/auth/google/callback", {
    headers: {
      "x-forwarded-host": "exisel.web.id",
      "x-forwarded-proto": "https",
    },
  });
  const origin = getCanonicalAppOrigin(mockReq);
  assert.equal(origin, "https://exisel.web.id");
});
