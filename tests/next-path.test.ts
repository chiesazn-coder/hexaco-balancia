import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath, withNext } from "../lib/navigation/next-path";

test("path internal di daftar izin diterima", () => {
  assert.equal(safeNextPath("/test/data-diri"), "/test/data-diri");
});

test("URL luar, skema, dan trik path ditolak", () => {
  const rejected = [
    null, undefined, "", "test/data-diri", "//evil.com", "//evil.com/test/data-diri", "/\\evil.com", "\\\\evil.com",
    "https://evil.com", "http:/evil.com", "javascript:alert(1)", "/javascript:alert(1)", "data:text/html,x",
    "%2F%2Fevil.com", "/%2F%2Fevil.com", "/test/data-diri/../../evil", " /test/data-diri", "/test/data-diri ",
    "/test/data-diri\n", "/test/data-diri?x=1", "/test/data-diri#a", "/test-hub", "/test/papi", "/",
    "/" + "a".repeat(250),
  ];
  for (const value of rejected) assert.equal(safeNextPath(value as string), null, JSON.stringify(value));
});

test("withNext menambahkan parameter hanya bila ada tujuan", () => {
  assert.equal(withNext("/profile", "/test/data-diri"), "/profile?next=%2Ftest%2Fdata-diri");
  assert.equal(withNext("/profile", null), "/profile");
});
