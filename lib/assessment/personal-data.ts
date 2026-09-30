// Formulir Data Diri calon karyawan: nilai awal, prefill dari profil, batas panjang, dan validasi.
// Dipakai bersama oleh halaman (klien) dan API submit (server). Satu skema, dua mode:
//  - draft: semua field boleh kosong; hanya struktur, tipe, enum, panjang, dan jumlah baris yang diperiksa.
//  - final: field wajib harus terisi; field opsional yang diisi harus berformat benar.
// Objek dengan key di luar skema selalu ditolak agar dokumen tidak bisa disisipi data lain.
import { isValidBirthDate } from "./profile";
import {
  MAKS_BARIS,
  type DataPersonalCalonKaryawan,
  type JenisKelamin,
  type TingkatPendidikan,
} from "../types/personalData";

// Isi formulir yang dikirim kandidat; candidateId, hasSubmitted, dan submittedAt diisi server.
export type PersonalDataForm = Omit<DataPersonalCalonKaryawan, "candidateId" | "hasSubmitted" | "submittedAt">;
export const FORM_SECTIONS = ["identitas", "keluarga", "pendidikan", "pekerjaan", "referensi", "minat", "sosial", "intern", "lainLain", "pernyataan"] as const;

// Draft yang dicadangkan: isi formulir + langkah wizard terakhir.
export type PersonalDataDraft = { step: number; form: PersonalDataForm };
export const WIZARD_STEPS = 9;

// Batas panjang teks (karakter). Dipilih agar ukuran maksimum payload tetap di bawah batas body API 64 KB.
export const LIMITS = {
  name: 100, // nama orang, tempat, hubungan, jabatan, sekolah, perusahaan
  fullName: 200, // nama lengkap kandidat / pernyataan
  short: 50, // agama, gol. darah, jenis SIM, tahun, gelar, lamanya, kendaraan, kota
  address: 300,
  answer: 1000, // jawaban uraian (mis. alasan, cita-cita, kekuatan)
  note: 300, // keterangan pada pertanyaan Ya/Tidak
  email: 200,
  // Nomor (KTP, NPWP, BPJS, HP, telepon, kode pos, SIM) sebelum spasi/titik/tanda hubung dibuang.
  numberInput: 30,
} as const;

// Pengalaman kerja dan pendidikan formal tidak ada di MAKS_BARIS; formal = satu baris per jenjang.
export const MAKS_FORMAL = 5;
const TINGKAT: readonly TingkatPendidikan[] = ["SLTP", "SLTA", "Akademi", "Universitas", "Lain-lain"];

type Mode = "draft" | "final";
type Check = (value: unknown, mode: Mode) => boolean;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (max: number): Check => v => typeof v === "string" && v.length <= max;
// Wajib saat final (setelah trim minimal `min` karakter); saat draft boleh "".
const required = (max: number, min = 1): Check => (v, mode) => str(max)(v, mode) && (mode === "draft" || (v as string).trim().length >= min);
// Opsional: "" selalu sah; bila diisi saat final harus cocok pola (saat draft cukup panjangnya).
const optionalPattern = (max: number, test: (s: string) => boolean): Check => (v, mode) =>
  str(max)(v, mode) && ((v as string) === "" || mode === "draft" || test((v as string).trim()));
const requiredPattern = (max: number, test: (s: string) => boolean): Check => (v, mode) =>
  str(max)(v, mode) && (mode === "draft" || test((v as string).trim()));

const digits = (min: number, max: number) => (s: string) => new RegExp(`^\\d{${min},${max}}$`).test(s);
// Nomor boleh diketik dengan spasi, titik, atau tanda hubung (mis. NPWP "12.345.678.9-012.345");
// validasi dan penyimpanan memakai hasil normalisasi. "+" di depan hanya dipertahankan untuk nomor telepon.
export const normalizeDigits = (s: string) => s.replace(/[\s.\-]/g, "");
export const isPhone = (s: string) => /^\+?\d{10,15}$/.test(normalizeDigits(s));
const isLandline = (s: string) => /^\+?\d{6,15}$/.test(normalizeDigits(s));
const onlyDigits = (min: number, max: number) => (s: string) => digits(min, max)(normalizeDigits(s));
const numberField = (test: (s: string) => boolean, isRequired = false): Check =>
  (isRequired ? requiredPattern : optionalPattern)(LIMITS.numberInput, test);
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export function isCalendarDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const date = optionalPattern(10, isCalendarDate);
const nullableEnum = (values: readonly unknown[]): Check => v => v === null || values.includes(v);
const nullableBool: Check = v => v === null || typeof v === "boolean";
const bool: Check = v => typeof v === "boolean";
const count = (max: number): Check => v => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max);
const shape = (fields: Record<string, Check>): Check => (v, mode) =>
  isObj(v) && Object.keys(v).length === Object.keys(fields).length &&
  Object.entries(fields).every(([key, check]) => Object.hasOwn(v, key) && check(v[key], mode));
const rows = (max: number, item: Check): Check => (v, mode) => Array.isArray(v) && v.length <= max && v.every(x => item(x, mode));
const orNull = (check: Check): Check => (v, mode) => v === null || check(v, mode);
const uniqueEnums = (values: readonly string[]): Check => v =>
  Array.isArray(v) && v.length <= values.length && new Set(v).size === v.length && v.every(x => values.includes(x));

const kodePos = numberField(onlyDigits(5, 5));
const alamat = shape({ alamat: str(LIMITS.address), kodePos });
const yaTidak = shape({ ya: nullableBool, keterangan: str(LIMITS.note) });

// Aturan field identitas yang juga dipakai untuk daftar kesalahan di halaman (lihat personalDataIssues).
const phone = (isRequired: boolean) => numberField(isPhone, isRequired);
const landline = numberField(isLandline);
const FIELD = {
  namaLengkap: required(LIMITS.fullName),
  jenisKelamin: ((v, mode) => (mode === "draft" ? nullableEnum(["L", "P"])(v, mode) : v === "L" || v === "P")) as Check,
  tempatLahir: required(LIMITS.name),
  // Final: tanggal nyata dengan usia 15–70 tahun (aturan yang sama dengan profil).
  tanggalLahir: ((v, mode) => str(10)(v, mode) && (mode === "draft" ? v === "" || isCalendarDate(v as string) : isValidBirthDate(v))) as Check,
  alamatTetap: ((v, mode) => alamat(v, mode) && (mode === "draft" || ((v as { alamat: string }).alamat.trim().length >= 5))) as Check,
  kodePos,
  teleponRumah: landline,
  noHandphone: phone(true),
  noBpjs: numberField(onlyDigits(8, 16)),
  noKtp: numberField(onlyDigits(16, 16), true),
  masaBerlakuKtp: optionalPattern(LIMITS.short, s => s === "Seumur Hidup" || isCalendarDate(s)),
  noNpwp: numberField(s => /^(\d{15}|\d{16})$/.test(normalizeDigits(s))),
  noSim: numberField(onlyDigits(5, 20)),
  tanggal: date,
  email: requiredPattern(LIMITS.email, isEmail),
  kontakNama: required(LIMITS.name),
  kontakHubungan: required(LIMITS.name),
  setuju: ((v, mode) => bool(v, mode) && (mode === "draft" || v === true)) as Check,
  namaJelas: required(LIMITS.fullName),
};

const identitas = shape({
  namaLengkap: FIELD.namaLengkap,
  jenisKelamin: FIELD.jenisKelamin,
  tempatLahir: FIELD.tempatLahir,
  tanggalLahir: FIELD.tanggalLahir,
  namaPanggilan: str(LIMITS.name),
  alamatTetap: FIELD.alamatTetap,
  teleponRumah: FIELD.teleponRumah,
  noHandphone: FIELD.noHandphone,
  noBpjsKetenagakerjaan: FIELD.noBpjs,
  noBpjsKesehatan: FIELD.noBpjs,
  agama: str(LIMITS.short),
  golonganDarah: str(LIMITS.short),
  noKtp: FIELD.noKtp,
  masaBerlakuKtp: FIELD.masaBerlakuKtp,
  noNpwp: FIELD.noNpwp,
  noSim: FIELD.noSim,
  jenisSim: str(LIMITS.short),
  statusPerkawinan: nullableEnum(["bujangan", "menikah", "duda_janda"]),
  tanggalMenikah: date,
  email: FIELD.email,
  kontakDarurat: shape({
    namaLengkap: FIELD.kontakNama,
    hubunganKeluarga: FIELD.kontakHubungan,
    alamatTetap: alamat,
    teleponRumah: landline,
    noHandphone: phone(true),
  }),
});

const keluarga = shape({
  pasangan: orNull(shape({
    namaLengkap: str(LIMITS.name), tempatLahir: str(LIMITS.name), tanggalLahir: date,
    pendidikanTerakhir: str(LIMITS.name), pekerjaan: str(LIMITS.name),
  })),
  anak: rows(MAKS_BARIS.anak, shape({ nama: str(LIMITS.name), tempatLahir: str(LIMITS.name), tanggalLahir: date, pendidikan: str(LIMITS.name) })),
  ibuKandung: shape({ namaLengkap: str(LIMITS.name), alamat, noTelepon: landline }),
  keluarga: rows(MAKS_BARIS.keluarga, shape({
    nama: str(LIMITS.name), hubungan: nullableEnum(["ayah", "kakak", "adik"]), umur: count(120), pekerjaanPendidikan: str(LIMITS.name),
  })),
  masihMendapatBantuan: shape({ ya: nullableBool, dariSiapa: str(LIMITS.name), bentukDanJumlah: str(LIMITS.note) }),
  tanggunganLain: yaTidak,
  pernahMeninggalkanKeluarga: yaTidak,
  statusRumah: nullableEnum(["rumah_pribadi", "rumah_keluarga_pasangan", "rumah_kontrakan", "pondokan", "rumah_orang_tua"]),
});

const nilaiBahasa = nullableEnum(["S", "B", "BS"]);
const pendidikan = shape({
  formal: rows(MAKS_FORMAL, shape({
    tingkat: v => TINGKAT.includes(v as TingkatPendidikan), namaSekolahLokasi: str(LIMITS.name), tahun: str(LIMITS.short),
    gelar: str(LIMITS.short), bidangStudi: str(LIMITS.name), yangMembiayai: str(LIMITS.name),
  })),
  kursus: rows(MAKS_BARIS.kursus, shape({
    bidang: str(LIMITS.name), tahun: str(LIMITS.short), lamanya: str(LIMITS.short),
    penyelenggaraTempat: str(LIMITS.name), yangMembiayai: str(LIMITS.name),
  })),
  palingPuas: str(LIMITS.answer),
  palingTidakPuas: str(LIMITS.answer),
  bahasaAsing: rows(MAKS_BARIS.bahasaAsing, shape({ bahasa: str(LIMITS.name), lisan: nilaiBahasa, tertulis: nilaiBahasa, keterangan: str(LIMITS.note) })),
});

const pekerjaan = shape({
  pengalaman: rows(MAKS_BARIS.pengalaman, shape({
    namaPerusahaan: str(LIMITS.name), dariTahun: str(LIMITS.short), sampaiTahun: str(LIMITS.short),
    jabatanTerakhir: str(LIMITS.name), gaji: count(1_000_000_000_000), alasanBerhenti: str(LIMITS.note),
  })),
  uraianTugas: str(LIMITS.answer),
  jumlahBawahan: count(100_000),
  pernahMembuatPerubahan: yaTidak,
});

const lingkungan = ["kantor", "pabrik", "proyek", "lapangan"] as const;
const pilihanLingkungan = shape({ pilihan: uniqueEnums(lingkungan), alasan: str(LIMITS.answer) });
const minat = shape({
  jabatanDituju: str(LIMITS.name), alasanJabatan: str(LIMITS.answer), pengetahuanJabatan: str(LIMITS.answer),
  lingkunganDisukai: pilihanLingkungan, lingkunganTidakDisukai: pilihanLingkungan,
  citaCita: str(LIMITS.answer), sulitMengambilKeputusan: str(LIMITS.answer),
});

const sosial = shape({
  hobi: str(LIMITS.answer), waktuLuang: str(LIMITS.answer), pernahKeLuarNegeri: yaTidak,
  organisasi: rows(MAKS_BARIS.organisasi, shape({ nama: str(LIMITS.name), jabatan: str(LIMITS.name), periode: str(LIMITS.short), keterangan: str(LIMITS.note) })),
  kekuatan: str(LIMITS.answer), kelemahan: str(LIMITS.answer),
});

const intern = shape({
  gajiDiharapkan: count(1_000_000_000_000), fasilitasDiharapkan: str(LIMITS.answer), tanggalMulaiKerja: date,
  bersediaDiLuarKota: yaTidak, kendaraanDimiliki: str(LIMITS.short), pernahMelamarDiGroup: yaTidak,
});

const lainLain = shape({
  pernahSakitKeras: yaTidak, gangguanJasmani: str(LIMITS.answer), kesehatanKeluargaBaik: yaTidak, reputasi: str(LIMITS.answer),
});

// Final: kedua persetujuan (termasuk UU PDP) wajib dicentang dan nama jelas diisi.
const pernyataan = shape({
  setujuKebenaranData: FIELD.setuju,
  setujuPemrosesanData: FIELD.setuju,
  namaJelas: FIELD.namaJelas,
  kota: str(LIMITS.short),
  tanggal: date,
});

const referensi = rows(MAKS_BARIS.referensi, shape({ nama: str(LIMITS.name), jabatan: str(LIMITS.name), alamat: str(LIMITS.address) }));
const form = shape({ identitas, keluarga, pendidikan, pekerjaan, referensi, minat, sosial, intern, lainLain, pernyataan });

export const validPersonalData = (data: unknown): data is PersonalDataForm => form(data, "final");
export const validPersonalDataDraft = (data: unknown): data is PersonalDataForm => form(data, "draft");
export const validPersonalDataBackup = (data: unknown): data is PersonalDataDraft =>
  isObj(data) && Object.keys(data).length === 2 && Number.isInteger(data.step) &&
  (data.step as number) >= 0 && (data.step as number) < WIZARD_STEPS && validPersonalDataDraft(data.form);

// Hapus spasi, titik, dan tanda hubung dari semua field nomor (dipanggil klien sebelum kirim dan server sebelum simpan).
export function normalizePersonalData(data: PersonalDataForm): PersonalDataForm {
  const d = normalizeDigits;
  const alamatN = (a: PersonalDataForm["identitas"]["alamatTetap"]) => ({ ...a, kodePos: d(a.kodePos) });
  const { identitas: i, keluarga: k } = data;
  return {
    ...data,
    identitas: {
      ...i, alamatTetap: alamatN(i.alamatTetap), teleponRumah: d(i.teleponRumah), noHandphone: d(i.noHandphone),
      noBpjsKetenagakerjaan: d(i.noBpjsKetenagakerjaan), noBpjsKesehatan: d(i.noBpjsKesehatan),
      noKtp: d(i.noKtp), noNpwp: d(i.noNpwp), noSim: d(i.noSim),
      kontakDarurat: {
        ...i.kontakDarurat, alamatTetap: alamatN(i.kontakDarurat.alamatTetap),
        teleponRumah: d(i.kontakDarurat.teleponRumah), noHandphone: d(i.kontakDarurat.noHandphone),
      },
    },
    keluarga: { ...k, ibuKandung: { ...k.ibuKandung, alamat: alamatN(k.ibuKandung.alamat), noTelepon: d(k.ibuKandung.noTelepon) } },
  };
}

// Tanggal hari ini (YYYY-MM-DD) di Asia/Jakarta, untuk tanggal pernyataan.
export const todayInJakarta = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

// Daftar isian yang belum lengkap/tidak valid, dikelompokkan per langkah wizard (0–8).
// Konsisten dengan validPersonalData: bila validator menolak sebuah bagian tanpa field yang cocok di daftar ini,
// tetap muncul satu pesan umum untuk langkah tersebut.
export type PersonalDataIssue = { step: number; label: string };
type IssueRule = [step: number, label: string, get: (f: PersonalDataForm) => unknown, check: Check];
const ISSUE_RULES: IssueRule[] = [
  [0, "Nama lengkap", f => f.identitas.namaLengkap, FIELD.namaLengkap],
  [0, "Jenis kelamin", f => f.identitas.jenisKelamin, FIELD.jenisKelamin],
  [0, "Tempat lahir", f => f.identitas.tempatLahir, FIELD.tempatLahir],
  [0, "Tanggal lahir (usia 15–70 tahun)", f => f.identitas.tanggalLahir, FIELD.tanggalLahir],
  [0, "Alamat tetap (minimal 5 karakter)", f => f.identitas.alamatTetap, FIELD.alamatTetap],
  [0, "Kode pos (5 digit)", f => f.identitas.alamatTetap.kodePos, FIELD.kodePos],
  [0, "Nomor telepon rumah", f => f.identitas.teleponRumah, FIELD.teleponRumah],
  [0, "Nomor handphone (10–15 digit)", f => f.identitas.noHandphone, FIELD.noHandphone],
  [0, "Email", f => f.identitas.email, FIELD.email],
  [0, "Nomor KTP/NIK (16 digit)", f => f.identitas.noKtp, FIELD.noKtp],
  [0, "Masa berlaku KTP", f => f.identitas.masaBerlakuKtp, FIELD.masaBerlakuKtp],
  [0, "Nomor NPWP (15 atau 16 digit)", f => f.identitas.noNpwp, FIELD.noNpwp],
  [0, "Nomor BPJS Ketenagakerjaan (8–16 digit)", f => f.identitas.noBpjsKetenagakerjaan, FIELD.noBpjs],
  [0, "Nomor BPJS Kesehatan (8–16 digit)", f => f.identitas.noBpjsKesehatan, FIELD.noBpjs],
  [0, "Nomor SIM (5–20 digit)", f => f.identitas.noSim, FIELD.noSim],
  [0, "Tanggal menikah", f => f.identitas.tanggalMenikah, FIELD.tanggal],
  [0, "Kontak darurat: nama lengkap", f => f.identitas.kontakDarurat.namaLengkap, FIELD.kontakNama],
  [0, "Kontak darurat: hubungan keluarga", f => f.identitas.kontakDarurat.hubunganKeluarga, FIELD.kontakHubungan],
  [0, "Kontak darurat: kode pos (5 digit)", f => f.identitas.kontakDarurat.alamatTetap.kodePos, FIELD.kodePos],
  [0, "Kontak darurat: nomor telepon rumah", f => f.identitas.kontakDarurat.teleponRumah, FIELD.teleponRumah],
  [0, "Kontak darurat: nomor handphone (10–15 digit)", f => f.identitas.kontakDarurat.noHandphone, FIELD.noHandphone],
  [1, "Ibu kandung: kode pos (5 digit)", f => f.keluarga.ibuKandung.alamat.kodePos, FIELD.kodePos],
  [1, "Ibu kandung: nomor telepon", f => f.keluarga.ibuKandung.noTelepon, FIELD.teleponRumah],
  [8, "Pernyataan kebenaran data", f => f.pernyataan.setujuKebenaranData, FIELD.setuju],
  [8, "Persetujuan pemrosesan data pribadi", f => f.pernyataan.setujuPemrosesanData, FIELD.setuju],
  [8, "Nama jelas", f => f.pernyataan.namaJelas, FIELD.namaJelas],
];
const STEP_SECTIONS: [step: number, check: (f: PersonalDataForm) => boolean][] = [
  [0, f => identitas(f.identitas, "final")], [1, f => keluarga(f.keluarga, "final")], [2, f => pendidikan(f.pendidikan, "final")],
  [3, f => pekerjaan(f.pekerjaan, "final")], [4, f => referensi(f.referensi, "final")], [5, f => minat(f.minat, "final")],
  [6, f => sosial(f.sosial, "final")], [7, f => intern(f.intern, "final")],
  [8, f => lainLain(f.lainLain, "final") && pernyataan(f.pernyataan, "final")],
];
export function personalDataIssues(data: PersonalDataForm): PersonalDataIssue[] {
  const issues = ISSUE_RULES.filter(([, , get, check]) => !check(get(data), "final")).map(([step, label]) => ({ step, label }));
  for (const [step, check] of STEP_SECTIONS) {
    if (!check(data) && !issues.some(issue => issue.step === step)) issues.push({ step, label: "Periksa kembali isian di langkah ini" });
  }
  return issues.sort((a, b) => a.step - b.step);
}

// Ambil hanya bagian formulir dari dokumen tersimpan (tanpa candidateId, hasSubmitted, submittedAt, schemaVersion).
export const formFromStored = (data: Record<string, unknown>) =>
  Object.fromEntries(FORM_SECTIONS.map(key => [key, data[key]]));

const alamatKosong = () => ({ alamat: "", kodePos: "" });
const yaTidakKosong = () => ({ ya: null, keterangan: "" });

export function emptyPersonalData(): PersonalDataForm {
  return {
    identitas: {
      namaLengkap: "", jenisKelamin: null, tempatLahir: "", tanggalLahir: "", namaPanggilan: "", alamatTetap: alamatKosong(),
      teleponRumah: "", noHandphone: "", noBpjsKetenagakerjaan: "", noBpjsKesehatan: "", agama: "", golonganDarah: "",
      noKtp: "", masaBerlakuKtp: "", noNpwp: "", noSim: "", jenisSim: "", statusPerkawinan: null, tanggalMenikah: "", email: "",
      kontakDarurat: { namaLengkap: "", hubunganKeluarga: "", alamatTetap: alamatKosong(), teleponRumah: "", noHandphone: "" },
    },
    keluarga: {
      pasangan: null, anak: [], ibuKandung: { namaLengkap: "", alamat: alamatKosong(), noTelepon: "" }, keluarga: [],
      masihMendapatBantuan: { ya: null, dariSiapa: "", bentukDanJumlah: "" },
      tanggunganLain: yaTidakKosong(), pernahMeninggalkanKeluarga: yaTidakKosong(), statusRumah: null,
    },
    pendidikan: { formal: [], kursus: [], palingPuas: "", palingTidakPuas: "", bahasaAsing: [] },
    pekerjaan: { pengalaman: [], uraianTugas: "", jumlahBawahan: null, pernahMembuatPerubahan: yaTidakKosong() },
    referensi: [],
    minat: {
      jabatanDituju: "", alasanJabatan: "", pengetahuanJabatan: "",
      lingkunganDisukai: { pilihan: [], alasan: "" }, lingkunganTidakDisukai: { pilihan: [], alasan: "" },
      citaCita: "", sulitMengambilKeputusan: "",
    },
    sosial: { hobi: "", waktuLuang: "", pernahKeLuarNegeri: yaTidakKosong(), organisasi: [], kekuatan: "", kelemahan: "" },
    intern: {
      gajiDiharapkan: null, fasilitasDiharapkan: "", tanggalMulaiKerja: "",
      bersediaDiLuarKota: yaTidakKosong(), kendaraanDimiliki: "", pernahMelamarDiGroup: yaTidakKosong(),
    },
    lainLain: { pernahSakitKeras: yaTidakKosong(), gangguanJasmani: "", kesehatanKeluargaBaik: yaTidakKosong(), reputasi: "" },
    pernyataan: { setujuKebenaranData: false, setujuPemrosesanData: false, namaJelas: "", kota: "Jakarta", tanggal: "" },
  };
}

const GENDER_CODE: Record<string, JenisKelamin> = { "Laki-laki": "L", Perempuan: "P" };

// Isi awal dari profil asesmen (hexacoCandidates) dan email akun login (email tidak bisa diubah di UI).
export function prefillFromProfile(profile: Record<string, unknown> | null | undefined, accountEmail: string): PersonalDataForm {
  const data = emptyPersonalData();
  const nama = typeof profile?.nama === "string" ? profile.nama.trim().slice(0, LIMITS.fullName) : "";
  data.identitas.namaLengkap = nama;
  data.identitas.jenisKelamin = GENDER_CODE[String(profile?.jenisKelamin)] ?? null;
  data.identitas.tanggalLahir = typeof profile?.tanggalLahir === "string" && isCalendarDate(profile.tanggalLahir) ? profile.tanggalLahir : "";
  data.identitas.email = accountEmail;
  data.pernyataan.namaJelas = nama;
  return data;
}

export const sameEmail = (a: unknown, b: unknown) =>
  typeof a === "string" && typeof b === "string" && a.trim().toLowerCase() === b.trim().toLowerCase();
