// lib/types/personalData.ts
// Struktur data mengikuti "Formulir Data Personal Calon Karyawan Balancia" (hal 1–4).
// Catatan: Firestore menolak `undefined`, jadi semua field kosong pakai "" / null / [].

export type YaTidak = { ya: boolean | null; keterangan: string };

export type JenisKelamin = "L" | "P";
export type StatusPerkawinan = "bujangan" | "menikah" | "duda_janda";
export type StatusRumah =
  | "rumah_pribadi"
  | "rumah_keluarga_pasangan"
  | "rumah_kontrakan"
  | "pondokan"
  | "rumah_orang_tua";
export type NilaiBahasa = "S" | "B" | "BS"; // Sedang, Bagus, Bagus Sekali
export type LingkunganKerja = "kantor" | "pabrik" | "proyek" | "lapangan";
export type TingkatPendidikan = "SLTP" | "SLTA" | "Akademi" | "Universitas" | "Lain-lain";
export type HubunganSaudara = "ayah" | "kakak" | "adik";

export interface Alamat {
  alamat: string;
  kodePos: string;
}

// ===== I. IDENTITAS PRIBADI =====
export interface IdentitasPribadi {
  namaLengkap: string;
  jenisKelamin: JenisKelamin | null;
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD
  namaPanggilan: string;
  alamatTetap: Alamat;
  teleponRumah: string;
  noHandphone: string;
  noBpjsKetenagakerjaan: string;
  noBpjsKesehatan: string;
  agama: string;
  golonganDarah: string;
  noKtp: string; // 16 digit
  masaBerlakuKtp: string; // "Seumur Hidup" atau YYYY-MM-DD
  noNpwp: string;
  noSim: string;
  jenisSim: string;
  statusPerkawinan: StatusPerkawinan | null;
  tanggalMenikah: string;
  email: string;
  kontakDarurat: {
    namaLengkap: string;
    hubunganKeluarga: string;
    alamatTetap: Alamat;
    teleponRumah: string;
    noHandphone: string;
  };
}

// ===== II. KELUARGA DAN LINGKUNGAN =====
export interface Anak {
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  pendidikan: string;
}

export interface AnggotaKeluarga {
  nama: string;
  hubungan: HubunganSaudara | null;
  umur: number | null;
  pekerjaanPendidikan: string;
}

export interface KeluargaLingkungan {
  pasangan: {
    namaLengkap: string;
    tempatLahir: string;
    tanggalLahir: string;
    pendidikanTerakhir: string;
    pekerjaan: string;
  } | null; // null jika belum menikah
  anak: Anak[]; // maks 5
  ibuKandung: { namaLengkap: string; alamat: Alamat; noTelepon: string };
  keluarga: AnggotaKeluarga[]; // ayah & saudara kandung, maks 7
  masihMendapatBantuan: { ya: boolean | null; dariSiapa: string; bentukDanJumlah: string };
  tanggunganLain: YaTidak; // keterangan = untuk siapa & berapa besarnya
  pernahMeninggalkanKeluarga: YaTidak; // keterangan = keperluan & lama
  statusRumah: StatusRumah | null;
}

// ===== III. RIWAYAT PENDIDIKAN =====
export interface PendidikanFormal {
  tingkat: TingkatPendidikan;
  namaSekolahLokasi: string;
  tahun: string; // mis. "2015-2018"
  gelar: string;
  bidangStudi: string;
  yangMembiayai: string;
}

export interface Kursus {
  bidang: string;
  tahun: string;
  lamanya: string;
  penyelenggaraTempat: string;
  yangMembiayai: string;
}

export interface BahasaAsing {
  bahasa: string;
  lisan: NilaiBahasa | null;
  tertulis: NilaiBahasa | null;
  keterangan: string;
}

export interface RiwayatPendidikan {
  formal: PendidikanFormal[];
  kursus: Kursus[]; // maks 3
  palingPuas: string;
  palingTidakPuas: string;
  bahasaAsing: BahasaAsing[]; // maks 3
}

// ===== IV. RIWAYAT PEKERJAAN =====
export interface PengalamanKerja {
  namaPerusahaan: string;
  dariTahun: string;
  sampaiTahun: string;
  jabatanTerakhir: string;
  gaji: number | null;
  alasanBerhenti: string;
}

export interface RiwayatPekerjaan {
  pengalaman: PengalamanKerja[]; // maks 5, terbaru dulu
  uraianTugas: string;
  jumlahBawahan: number | null;
  pernahMembuatPerubahan: YaTidak;
}

// ===== V. REFERENSI =====
export interface Referensi {
  nama: string;
  jabatan: string;
  alamat: string;
}

// ===== VI. MINAT DAN KONSEP DIRI =====
export interface MinatKonsepDiri {
  jabatanDituju: string;
  alasanJabatan: string;
  pengetahuanJabatan: string;
  lingkunganDisukai: { pilihan: LingkunganKerja[]; alasan: string };
  lingkunganTidakDisukai: { pilihan: LingkunganKerja[]; alasan: string };
  citaCita: string;
  sulitMengambilKeputusan: string;
}

// ===== VII. AKTIVITAS SOSIAL =====
export interface Organisasi {
  nama: string;
  jabatan: string;
  periode: string;
  keterangan: string;
}

export interface AktivitasSosial {
  hobi: string;
  waktuLuang: string;
  pernahKeLuarNegeri: YaTidak; // ke mana, kapan, berapa lama, keperluan
  organisasi: Organisasi[]; // maks 3
  kekuatan: string;
  kelemahan: string;
}

// ===== VIII. INTERN PERUSAHAAN =====
export interface InternPerusahaan {
  gajiDiharapkan: number | null;
  fasilitasDiharapkan: string;
  tanggalMulaiKerja: string;
  bersediaDiLuarKota: YaTidak; // keterangan = alasan bila "Tidak"
  kendaraanDimiliki: string;
  pernahMelamarDiGroup: YaTidak; // keterangan = di mana & kapan
}

// ===== IX. LAIN-LAIN =====
export interface LainLain {
  pernahSakitKeras: YaTidak;
  gangguanJasmani: string;
  kesehatanKeluargaBaik: YaTidak; // keterangan diisi bila "Tidak"
  reputasi: string;
}

// ===== PERNYATAAN (pengganti tanda tangan) =====
export interface Pernyataan {
  setujuKebenaranData: boolean;
  setujuPemrosesanData: boolean; // persetujuan UU PDP
  namaJelas: string;
  kota: string; // default "Jakarta"
  tanggal: string;
}

// ===== DOKUMEN FIRESTORE =====
export interface DataPersonalCalonKaryawan {
  candidateId: string;
  identitas: IdentitasPribadi;
  keluarga: KeluargaLingkungan;
  pendidikan: RiwayatPendidikan;
  pekerjaan: RiwayatPekerjaan;
  referensi: Referensi[]; // maks 3
  minat: MinatKonsepDiri;
  sosial: AktivitasSosial;
  intern: InternPerusahaan;
  lainLain: LainLain;
  pernyataan: Pernyataan;
  hasSubmitted: boolean;
  submittedAt: unknown; // serverTimestamp()
}

// Batas baris tabel sesuai formulir kertas
export const MAKS_BARIS = {
  anak: 5,
  keluarga: 7,
  kursus: 3,
  bahasaAsing: 3,
  pengalaman: 5,
  referensi: 3,
  organisasi: 3,
} as const;

// Urutan langkah wizard
export const LANGKAH_FORM = [
  { key: "identitas", judul: "Identitas Pribadi" },
  { key: "keluarga", judul: "Keluarga dan Lingkungan" },
  { key: "pendidikan", judul: "Riwayat Pendidikan" },
  { key: "pekerjaan", judul: "Riwayat Pekerjaan" },
  { key: "referensi", judul: "Referensi" },
  { key: "minat", judul: "Minat dan Konsep Diri" },
  { key: "sosial", judul: "Aktivitas Sosial" },
  { key: "intern", judul: "Intern Perusahaan" },
  { key: "lainLain", judul: "Lain-lain & Pernyataan" },
] as const;
