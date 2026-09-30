import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { postLoginDestination } from "../lib/assessment/progress";
import { DATA_DIRI_PATH, afterRegisterDestination, guardRedirect, type GuardedPage } from "../lib/navigation/guards";
import { safeNextPath } from "../lib/navigation/next-path";

const NEXT_DATA_DIRI = "?next=%2Ftest%2Fdata-diri";
const signedIn = (profileComplete: boolean, extra: { allTestsDone?: boolean; next?: string | null } = {}) =>
  ({ signedIn: true as const, profileComplete, ...extra });

describe("tabel pengalihan: login", () => {
  test("profil lengkap -> beranda, atau ?next= yang sah", () => {
    assert.equal(postLoginDestination(true, null), "/beranda");
    assert.equal(postLoginDestination(true, safeNextPath(DATA_DIRI_PATH)), DATA_DIRI_PATH);
  });

  test("?next= yang tidak sah diabaikan", () => {
    assert.equal(postLoginDestination(true, safeNextPath("https://evil.com")), "/beranda");
    assert.equal(postLoginDestination(true, safeNextPath("/test-hub")), "/beranda");
  });

  test("profil belum lengkap -> profil, membawa ?next=", () => {
    assert.equal(postLoginDestination(false, null), "/profile");
    assert.equal(postLoginDestination(false, DATA_DIRI_PATH), "/profile" + NEXT_DATA_DIRI);
  });

  test("daftar akun baru -> profil, membawa ?next=", () => {
    assert.equal(afterRegisterDestination(null), "/profile");
    assert.equal(afterRegisterDestination(DATA_DIRI_PATH), "/profile" + NEXT_DATA_DIRI);
  });

  test("kandidat yang sudah menyelesaikan semua tes masuk ke beranda (bukan hub/thankyou yang logout)", () => {
    // Tujuan setelah login tidak bergantung pada status tes sama sekali.
    assert.equal(postLoginDestination(true, null), "/beranda");
  });
});

describe("tabel pengalihan: halaman profil", () => {
  test("belum login -> login", () => {
    assert.equal(guardRedirect("profile", { signedIn: false }), "/login");
  });

  test("profil belum lengkap -> tetap di profil", () => {
    assert.equal(guardRedirect("profile", signedIn(false)), null);
    assert.equal(guardRedirect("profile", signedIn(false, { next: DATA_DIRI_PATH })), null);
  });

  test("profil lengkap (dibuka atau baru disimpan) -> ?next= atau beranda", () => {
    assert.equal(guardRedirect("profile", signedIn(true)), "/beranda");
    assert.equal(guardRedirect("profile", signedIn(true, { next: null })), "/beranda");
    assert.equal(guardRedirect("profile", signedIn(true, { next: DATA_DIRI_PATH })), DATA_DIRI_PATH);
  });
});

describe("tabel pengalihan: beranda", () => {
  test("belum login -> login", () => {
    assert.equal(guardRedirect("beranda", { signedIn: false }), "/login");
  });

  test("profil belum lengkap -> profil", () => {
    assert.equal(guardRedirect("beranda", signedIn(false)), "/profile");
  });

  test("profil lengkap -> tetap di beranda, juga bila semua tes selesai (tanpa logout)", () => {
    assert.equal(guardRedirect("beranda", signedIn(true)), null);
    assert.equal(guardRedirect("beranda", signedIn(true, { allTestsDone: true })), null);
    assert.equal(guardRedirect("beranda", signedIn(true, { allTestsDone: false })), null);
  });
});

describe("tabel pengalihan: hub", () => {
  test("belum login -> login", () => {
    assert.equal(guardRedirect("test-hub", { signedIn: false }), "/login");
  });

  test("profil belum lengkap -> profil (sebelum status tes dibaca)", () => {
    assert.equal(guardRedirect("test-hub", signedIn(false)), "/profile");
    assert.equal(guardRedirect("test-hub", signedIn(false, { allTestsDone: true })), "/profile");
  });

  test("masih ada tes -> tetap di hub; semua selesai -> halaman terima kasih", () => {
    assert.equal(guardRedirect("test-hub", signedIn(true)), null);
    assert.equal(guardRedirect("test-hub", signedIn(true, { allTestsDone: false })), null);
    assert.equal(guardRedirect("test-hub", signedIn(true, { allTestsDone: true })), "/thankyou");
  });
});

describe("tabel pengalihan: formulir Data Diri", () => {
  test("belum login -> login dengan ?next=/test/data-diri", () => {
    assert.equal(guardRedirect("data-diri", { signedIn: false }), "/login" + NEXT_DATA_DIRI);
  });

  test("profil belum lengkap -> profil dengan ?next=/test/data-diri", () => {
    assert.equal(guardRedirect("data-diri", signedIn(false)), "/profile" + NEXT_DATA_DIRI);
  });

  test("profil lengkap -> tetap di formulir, apa pun status tes", () => {
    for (const allTestsDone of [undefined, false, true]) assert.equal(guardRedirect("data-diri", signedIn(true, { allTestsDone })), null);
  });

  test("alur lengkap dari halaman terima kasih: login -> (profil) -> formulir", () => {
    const next = safeNextPath(new URLSearchParams(NEXT_DATA_DIRI).get("next"));
    assert.equal(next, DATA_DIRI_PATH);
    assert.equal(postLoginDestination(true, next), DATA_DIRI_PATH);
    const toProfile = postLoginDestination(false, next);
    assert.equal(toProfile, "/profile" + NEXT_DATA_DIRI);
    assert.equal(guardRedirect("profile", signedIn(true, { next })), DATA_DIRI_PATH);
  });
});

test("tidak ada halaman yang mengalihkan ke dirinya sendiri", () => {
  const paths: Record<GuardedPage, string> = { beranda: "/beranda", "test-hub": "/test-hub", profile: "/profile", "data-diri": DATA_DIRI_PATH };
  for (const page of Object.keys(paths) as GuardedPage[]) {
    for (const profileComplete of [true, false]) for (const allTestsDone of [true, false]) for (const next of [null, DATA_DIRI_PATH]) {
      const target = guardRedirect(page, signedIn(profileComplete, { allTestsDone, next }));
      assert.notEqual(target?.split("?")[0], paths[page], JSON.stringify({ page, profileComplete, allTestsDone, next }));
    }
  }
});
