import assert from "node:assert/strict";
import { test } from "node:test";
import { LIMITS, MAKS_FORMAL, emptyPersonalData, validPersonalDataBackup, validPersonalDataDraft, type PersonalDataForm } from "../lib/assessment/personal-data";
import { bodyLimit } from "../lib/server/assessment-http";
import { MAKS_BARIS } from "../lib/types/personalData";

// Formulir dengan setiap teks sepanjang batasnya dan setiap tabel sebanyak baris maksimum.
function maximalForm(ch: string): PersonalDataForm {
  const s = (n: number) => ch.repeat(n);
  const L = LIMITS;
  const num = s(L.numberInput);
  const alamat = () => ({ alamat: s(L.address), kodePos: num });
  const yt = () => ({ ya: true, keterangan: s(L.note) });
  const rows = <T>(n: number, row: () => T) => Array.from({ length: n }, row);
  const f = emptyPersonalData();
  f.identitas = {
    ...f.identitas,
    namaLengkap: s(L.fullName), tempatLahir: s(L.name), namaPanggilan: s(L.name), alamatTetap: alamat(),
    teleponRumah: num, noHandphone: num, noBpjsKetenagakerjaan: num, noBpjsKesehatan: num, agama: s(L.short), golonganDarah: s(L.short),
    noKtp: num, masaBerlakuKtp: s(L.short), noNpwp: num, noSim: num, jenisSim: s(L.short), email: s(L.email),
    kontakDarurat: { namaLengkap: s(L.name), hubunganKeluarga: s(L.name), alamatTetap: alamat(), teleponRumah: num, noHandphone: num },
  };
  f.keluarga = {
    pasangan: { namaLengkap: s(L.name), tempatLahir: s(L.name), tanggalLahir: "2000-01-01", pendidikanTerakhir: s(L.name), pekerjaan: s(L.name) },
    anak: rows(MAKS_BARIS.anak, () => ({ nama: s(L.name), tempatLahir: s(L.name), tanggalLahir: "2000-01-01", pendidikan: s(L.name) })),
    ibuKandung: { namaLengkap: s(L.name), alamat: alamat(), noTelepon: num },
    keluarga: rows(MAKS_BARIS.keluarga, () => ({ nama: s(L.name), hubungan: "kakak" as const, umur: 120, pekerjaanPendidikan: s(L.name) })),
    masihMendapatBantuan: { ya: true, dariSiapa: s(L.name), bentukDanJumlah: s(L.note) },
    tanggunganLain: yt(), pernahMeninggalkanKeluarga: yt(), statusRumah: "rumah_orang_tua",
  };
  const tingkat = ["SLTP", "SLTA", "Akademi", "Universitas", "Lain-lain"] as const;
  f.pendidikan = {
    formal: tingkat.slice(0, MAKS_FORMAL).map((t) => ({ tingkat: t, namaSekolahLokasi: s(L.name), tahun: s(L.short), gelar: s(L.short), bidangStudi: s(L.name), yangMembiayai: s(L.name) })),
    kursus: rows(MAKS_BARIS.kursus, () => ({ bidang: s(L.name), tahun: s(L.short), lamanya: s(L.short), penyelenggaraTempat: s(L.name), yangMembiayai: s(L.name) })),
    palingPuas: s(L.answer), palingTidakPuas: s(L.answer),
    bahasaAsing: rows(MAKS_BARIS.bahasaAsing, () => ({ bahasa: s(L.name), lisan: "BS" as const, tertulis: "BS" as const, keterangan: s(L.note) })),
  };
  f.pekerjaan = {
    pengalaman: rows(MAKS_BARIS.pengalaman, () => ({ namaPerusahaan: s(L.name), dariTahun: s(L.short), sampaiTahun: s(L.short), jabatanTerakhir: s(L.name), gaji: 1_000_000_000_000, alasanBerhenti: s(L.note) })),
    uraianTugas: s(L.answer), jumlahBawahan: 100_000, pernahMembuatPerubahan: yt(),
  };
  f.referensi = rows(MAKS_BARIS.referensi, () => ({ nama: s(L.name), jabatan: s(L.name), alamat: s(L.address) }));
  const semua = ["kantor", "pabrik", "proyek", "lapangan"] as const;
  f.minat = {
    jabatanDituju: s(L.name), alasanJabatan: s(L.answer), pengetahuanJabatan: s(L.answer),
    lingkunganDisukai: { pilihan: [...semua], alasan: s(L.answer) }, lingkunganTidakDisukai: { pilihan: [...semua], alasan: s(L.answer) },
    citaCita: s(L.answer), sulitMengambilKeputusan: s(L.answer),
  };
  f.sosial = {
    hobi: s(L.answer), waktuLuang: s(L.answer), pernahKeLuarNegeri: yt(),
    organisasi: rows(MAKS_BARIS.organisasi, () => ({ nama: s(L.name), jabatan: s(L.name), periode: s(L.short), keterangan: s(L.note) })),
    kekuatan: s(L.answer), kelemahan: s(L.answer),
  };
  f.intern = { gajiDiharapkan: 1_000_000_000_000, fasilitasDiharapkan: s(L.answer), tanggalMulaiKerja: "2026-10-01", bersediaDiLuarKota: yt(), kendaraanDimiliki: s(L.short), pernahMelamarDiGroup: yt() };
  f.lainLain = { pernahSakitKeras: yt(), gangguanJasmani: s(L.answer), kesehatanKeluargaBaik: yt(), reputasi: s(L.answer) };
  f.pernyataan = { setujuKebenaranData: true, setujuPemrosesanData: true, namaJelas: s(L.fullName), kota: s(L.short), tanggal: "2026-09-30" };
  return f;
}

test("formulir Data Diri terbesar tetap di bawah batas body API, juga dengan karakter 3-byte", () => {
  for (const ch of ["a", "é", "€"]) {
    const form = maximalForm(ch);
    // Bila validator draft menolak, formulir uji ini tidak lagi maksimal/sah dan angka di bawah tidak bermakna.
    assert.ok(validPersonalDataDraft(form), ch);
    assert.ok(validPersonalDataBackup({ step: 8, form }), ch);
    const submit = Buffer.byteLength(JSON.stringify({ answers: form }));
    const backup = Buffer.byteLength(JSON.stringify({ revision: 1_000_000, data: { step: 8, form } }));
    assert.ok(submit < bodyLimit("data-diri"), ch + " submit " + submit);
    assert.ok(backup < bodyLimit("data-diri"), ch + " backup " + backup);
  }
});
