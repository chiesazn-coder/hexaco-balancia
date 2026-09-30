import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  LIMITS,
  MAKS_FORMAL,
  emptyPersonalData,
  normalizePersonalData,
  personalDataIssues,
  todayInJakarta,
  prefillFromProfile,
  sameEmail,
  validPersonalData,
  validPersonalDataBackup,
  validPersonalDataDraft,
  type PersonalDataForm,
} from "../lib/assessment/personal-data";
import { COLLECTIONS, PSYCH_TESTS, isCompletedSession, validAnswers, validDraft } from "../lib/assessment/validation";
import { MAKS_BARIS } from "../lib/types/personalData";
import { completeForm } from "./fixtures/personal-data";

const year = new Date().getFullYear();

const edit = (change: (form: PersonalDataForm) => void) => { const form = completeForm(); change(form); return form; };

describe("prefill dari profil", () => {
  test("memetakan nama, L/P, tanggal lahir, dan email akun", () => {
    const form = prefillFromProfile({ nama: "  Budi  ", jenisKelamin: "Laki-laki", tanggalLahir: "1998-05-10" }, "budi@example.com");
    assert.equal(form.identitas.namaLengkap, "Budi");
    assert.equal(form.identitas.jenisKelamin, "L");
    assert.equal(form.identitas.tanggalLahir, "1998-05-10");
    assert.equal(form.identitas.email, "budi@example.com");
    assert.equal(form.pernyataan.namaJelas, "Budi");
    assert.equal(prefillFromProfile({ jenisKelamin: "Perempuan" }, "x@y.id").identitas.jenisKelamin, "P");
  });

  test("profil kosong atau nilai tak dikenal menghasilkan field kosong", () => {
    const form = prefillFromProfile(null, "x@y.id");
    assert.equal(form.identitas.jenisKelamin, null);
    assert.equal(form.identitas.tanggalLahir, "");
    assert.equal(prefillFromProfile({ jenisKelamin: "L", tanggalLahir: "2001-02-30" }, "x@y.id").identitas.tanggalLahir, "");
    assert.ok(validPersonalDataDraft(form));
  });
});

describe("validasi draft", () => {
  test("formulir kosong sah sebagai draft, tidak sah untuk dikirim", () => {
    assert.ok(validPersonalDataDraft(emptyPersonalData()));
    assert.equal(validPersonalData(emptyPersonalData()), false);
  });

  test("draft menolak key asing, tipe salah, teks terlalu panjang, dan baris berlebih", () => {
    assert.equal(validPersonalDataDraft({ ...emptyPersonalData(), status: "submitted" }), false);
    assert.equal(validPersonalDataDraft(edit(f => { (f.identitas as unknown as Record<string, unknown>).gaji = 1; })), false);
    assert.equal(validPersonalDataDraft(edit(f => { (f.identitas as unknown as Record<string, unknown>).noKtp = 3171; })), false);
    assert.equal(validPersonalDataDraft(edit(f => { f.sosial.hobi = "x".repeat(LIMITS.answer + 1); })), false);
    assert.equal(validPersonalDataDraft(edit(f => { f.keluarga.anak = Array(MAKS_BARIS.anak + 1).fill({ nama: "", tempatLahir: "", tanggalLahir: "", pendidikan: "" }); })), false);
    assert.equal(validPersonalDataDraft(edit(f => { f.pendidikan.formal = Array(MAKS_FORMAL + 1).fill({ tingkat: "SLTA", namaSekolahLokasi: "", tahun: "", gelar: "", bidangStudi: "", yangMembiayai: "" }); })), false);
    assert.equal(validPersonalDataDraft(edit(f => { f.minat.lingkunganDisukai.pilihan = ["kantor", "kantor"]; })), false);
  });

  test("cadangan wizard berisi langkah 0–8 dan formulir", () => {
    assert.ok(validPersonalDataBackup({ step: 0, form: emptyPersonalData() }));
    assert.ok(validPersonalDataBackup({ step: 8, form: emptyPersonalData() }));
    assert.equal(validPersonalDataBackup({ step: 9, form: emptyPersonalData() }), false);
    assert.equal(validPersonalDataBackup({ step: 0, form: emptyPersonalData(), extra: 1 }), false);
    assert.ok(validDraft("data-diri", { step: 2, form: completeForm() }));
  });
});

describe("validasi kirim", () => {
  test("formulir dengan semua field wajib lolos", () => {
    assert.ok(validPersonalData(completeForm()));
    assert.ok(validAnswers("data-diri", completeForm()));
  });

  const wajib: [string, (f: PersonalDataForm) => void][] = [
    ["nama lengkap", f => { f.identitas.namaLengkap = "   "; }],
    ["jenis kelamin", f => { f.identitas.jenisKelamin = null; }],
    ["tempat lahir", f => { f.identitas.tempatLahir = ""; }],
    ["tanggal lahir", f => { f.identitas.tanggalLahir = ""; }],
    ["alamat tetap", f => { f.identitas.alamatTetap.alamat = "Jl"; }],
    ["no. HP", f => { f.identitas.noHandphone = ""; }],
    ["email", f => { f.identitas.email = ""; }],
    ["no. KTP", f => { f.identitas.noKtp = ""; }],
    ["nama kontak darurat", f => { f.identitas.kontakDarurat.namaLengkap = ""; }],
    ["hubungan kontak darurat", f => { f.identitas.kontakDarurat.hubunganKeluarga = ""; }],
    ["HP kontak darurat", f => { f.identitas.kontakDarurat.noHandphone = ""; }],
    ["persetujuan kebenaran data", f => { f.pernyataan.setujuKebenaranData = false; }],
    ["persetujuan pemrosesan data (UU PDP)", f => { f.pernyataan.setujuPemrosesanData = false; }],
    ["nama jelas pernyataan", f => { f.pernyataan.namaJelas = ""; }],
  ];
  for (const [label, change] of wajib) {
    test(`ditolak bila ${label} kosong/tidak dicentang`, () => assert.equal(validPersonalData(edit(change)), false));
  }

  test("format field wajib", () => {
    assert.equal(validPersonalData(edit(f => { f.identitas.noKtp = "317123456789000"; })), false, "KTP 15 digit");
    assert.equal(validPersonalData(edit(f => { f.identitas.noKtp = "31712345678900012"; })), false, "KTP 17 digit");
    assert.equal(validPersonalData(edit(f => { f.identitas.noKtp = "3171/2345/6789/0001"; })), false, "KTP dengan garis miring");
    assert.equal(validPersonalData(edit(f => { f.identitas.noHandphone = "08123"; })), false, "HP terlalu pendek");
    assert.equal(validPersonalData(edit(f => { f.identitas.noHandphone = "0812abc7890"; })), false, "HP berisi huruf");
    assert.ok(validPersonalData(edit(f => { f.identitas.noHandphone = "+62 812 3456 7890"; })), "HP dengan +62 dan spasi");
    assert.equal(validPersonalData(edit(f => { f.identitas.email = "bukan-email"; })), false);
    assert.equal(validPersonalData(edit(f => { f.identitas.tanggalLahir = `${year - 10}-01-01`; })), false, "usia di bawah 15");
    assert.equal(validPersonalData(edit(f => { f.identitas.jenisKelamin = "Laki-laki" as never; })), false);
  });

  test("field opsional: kosong boleh, diisi harus berformat benar", () => {
    assert.ok(validPersonalData(edit(f => { f.identitas.noBpjsKesehatan = "12345678"; f.identitas.noBpjsKetenagakerjaan = "1234567890123456"; })));
    assert.equal(validPersonalData(edit(f => { f.identitas.noBpjsKesehatan = "1234567"; })), false, "BPJS 7 digit");
    assert.equal(validPersonalData(edit(f => { f.identitas.noBpjsKetenagakerjaan = "12345678901234567"; })), false, "BPJS 17 digit");
    assert.ok(validPersonalData(edit(f => { f.identitas.noNpwp = "123456789012345"; })), "NPWP 15 digit");
    assert.ok(validPersonalData(edit(f => { f.identitas.noNpwp = "1234567890123456"; })), "NPWP 16 digit");
    assert.equal(validPersonalData(edit(f => { f.identitas.noNpwp = "12345678901234"; })), false, "NPWP 14 digit");
    assert.equal(validPersonalData(edit(f => { f.identitas.alamatTetap.kodePos = "1234"; })), false, "kode pos 4 digit");
    assert.ok(validPersonalData(edit(f => { f.identitas.masaBerlakuKtp = "Seumur Hidup"; })));
    assert.equal(validPersonalData(edit(f => { f.identitas.masaBerlakuKtp = "selamanya"; })), false);
    assert.equal(validPersonalData(edit(f => { f.keluarga.keluarga = [{ nama: "A", hubungan: "kakak", umur: -1, pekerjaanPendidikan: "" }]; })), false, "umur negatif");
    assert.equal(validPersonalData(edit(f => { f.intern.tanggalMulaiKerja = "2026-13-01"; })), false, "tanggal tidak ada");
    // Draft boleh menyimpan isian yang belum berformat benar selama kandidat masih mengetik.
    assert.ok(validPersonalDataDraft(edit(f => { f.identitas.noKtp = "3171"; f.identitas.noNpwp = "12"; })));
  });
});

describe("status selesai dan daftar tes", () => {
  test("dokumen tersimpan dianggap selesai hanya bila milik kandidat dan hasSubmitted", () => {
    const stored = { ...completeForm(), candidateId: "u1", hasSubmitted: true, submittedAt: { seconds: 1 }, schemaVersion: 1 };
    assert.ok(isCompletedSession("data-diri", stored, "u1"));
    assert.equal(isCompletedSession("data-diri", stored, "u2"), false);
    assert.equal(isCompletedSession("data-diri", { ...stored, hasSubmitted: false }, "u1"), false);
    // Batas usia tidak berlaku untuk data yang sudah tersimpan.
    assert.ok(isCompletedSession("data-diri", { ...stored, identitas: { ...stored.identitas, tanggalLahir: "1940-01-01" } }, "u1"));
  });

  test("Data Diri punya koleksi sendiri dan tidak termasuk tes psikologi", () => {
    assert.equal(COLLECTIONS["data-diri"], "personalDataSessions");
    assert.equal((PSYCH_TESTS as readonly string[]).includes("data-diri"), false);
    assert.deepEqual([...PSYCH_TESTS].sort(), ["disc", "hexaco", "ist", "kraepelin", "love-language", "papi"]);
  });

  test("perbandingan email tidak peka huruf besar dan spasi", () => {
    assert.ok(sameEmail(" Uji@Example.com ", "uji@example.com"));
    assert.equal(sameEmail("uji@example.com", undefined), false);
    assert.equal(sameEmail("a@example.com", "b@example.com"), false);
  });
});

describe("nomor dengan spasi, titik, dan tanda hubung", () => {
  test("diterima saat validasi", () => {
    assert.ok(validPersonalData(edit(f => { f.identitas.noNpwp = "12.345.678.9-012.345"; })), "NPWP format resmi");
    assert.ok(validPersonalData(edit(f => { f.identitas.noKtp = "3171 2345 6789 0001"; })), "NIK dengan spasi");
    assert.ok(validPersonalData(edit(f => { f.identitas.noKtp = "3171-2345-6789-0001"; })), "NIK dengan tanda hubung");
    assert.ok(validPersonalData(edit(f => { f.identitas.noBpjsKesehatan = "0001.2345.678"; f.identitas.alamatTetap.kodePos = "12 345"; })));
    assert.ok(validPersonalData(edit(f => { f.identitas.noHandphone = "+62 812-3456-7890"; f.identitas.noSim = "1234-5678-9012"; })));
    assert.equal(validPersonalData(edit(f => { f.identitas.noNpwp = "12.345.678.9-012.34"; })), false, "NPWP 14 digit setelah dinormalisasi");
  });

  test("disimpan sebagai digit saja; + di depan nomor HP dipertahankan", () => {
    const form = normalizePersonalData(edit(f => {
      f.identitas.noNpwp = "12.345.678.9-012.345";
      f.identitas.noKtp = "3171 2345 6789 0001";
      f.identitas.noHandphone = "+62 812-3456-7890";
      f.identitas.alamatTetap.kodePos = "12 345";
      f.identitas.kontakDarurat.noHandphone = "0812.3456.7890";
      f.keluarga.ibuKandung.noTelepon = "(021) 555-1234".replace(/[()]/g, "");
    }));
    assert.equal(form.identitas.noNpwp, "123456789012345");
    assert.equal(form.identitas.noKtp, "3171234567890001");
    assert.equal(form.identitas.noHandphone, "+6281234567890");
    assert.equal(form.identitas.alamatTetap.kodePos, "12345");
    assert.equal(form.identitas.kontakDarurat.noHandphone, "081234567890");
    assert.equal(form.keluarga.ibuKandung.noTelepon, "0215551234");
    assert.ok(validPersonalData(form));
  });
});

describe("batas jawaban uraian", () => {
  test("1000 karakter diterima, 1001 ditolak", () => {
    assert.equal(LIMITS.answer, 1000);
    assert.ok(validPersonalData(edit(f => { f.sosial.hobi = "x".repeat(1000); })));
    assert.equal(validPersonalData(edit(f => { f.sosial.hobi = "x".repeat(1001); })), false);
  });
});

describe("daftar kesalahan per langkah", () => {
  test("formulir lengkap tidak punya kesalahan", () => {
    assert.deepEqual(personalDataIssues(completeForm()), []);
  });

  test("formulir kosong menunjukkan field wajib di langkah 1 dan pernyataan di langkah 9", () => {
    const issues = personalDataIssues(emptyPersonalData());
    assert.ok(issues.some(i => i.step === 0 && i.label.startsWith("Nomor KTP")));
    assert.ok(issues.some(i => i.step === 0 && i.label.startsWith("Nomor handphone")));
    assert.ok(issues.some(i => i.step === 8 && i.label === "Persetujuan pemrosesan data pribadi"));
    assert.deepEqual(issues.map(i => i.step), [...issues.map(i => i.step)].sort((a, b) => a - b), "urut per langkah");
  });

  test("selalu sejalan dengan validator server", () => {
    const cases: ((f: PersonalDataForm) => void)[] = [
      f => { f.identitas.noKtp = "123"; },
      f => { f.identitas.noNpwp = "12"; },
      f => { f.identitas.alamatTetap.kodePos = "1"; },
      f => { f.identitas.email = "x"; },
      f => { f.pernyataan.namaJelas = ""; },
      f => { f.keluarga.anak = [{ nama: "A", tempatLahir: "", tanggalLahir: "2020-02-31", pendidikan: "" }]; },
      f => { f.intern.tanggalMulaiKerja = "bukan tanggal"; },
      f => { f.keluarga.ibuKandung.noTelepon = "12"; },
      f => { f.identitas.noHandphone = "0812 3456 7890"; },
    ];
    for (const change of cases) {
      const form = edit(change);
      assert.equal(personalDataIssues(form).length === 0, validPersonalData(form), JSON.stringify(personalDataIssues(form)));
    }
  });

  test("tanggal pernyataan memakai zona waktu Asia/Jakarta", () => {
    assert.equal(todayInJakarta(new Date("2026-09-28T20:00:00Z")), "2026-09-29");
    assert.equal(todayInJakarta(new Date("2026-09-28T10:00:00Z")), "2026-09-28");
  });
});
