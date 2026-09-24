// DISC — Person Analysis (Form A)
// 24 kelompok × 4 pernyataan. Kandidat memilih 1 M (paling menggambarkan)
// dan 1 L (paling tidak menggambarkan) per kelompok; M ≠ L.
// Nomor pernyataan 1–4 mengikuti urutan dari atas ke bawah di lembar asli.
// Tidak ada scoring key: yang disimpan hanya nomor pernyataan M dan L.

export type DiscStatements = readonly [string, string, string, string];

export interface DiscGroup {
  no: number;
  statements: DiscStatements;
}

export const DISC_GROUPS: readonly DiscGroup[] = [
  {
    no: 1,
    statements: [
      "Mudah bergaul, ramah, mudah setuju",
      "Mempercayai, percaya pada orang lain",
      "Petualang, suka mengambil resiko",
      "Penuh toleransi, menghormati orang lain",
    ],
  },
  {
    no: 2,
    statements: [
      "Yang penting adalah hasil",
      "Kerjakan dengan benar. Ketepatan sangat penting",
      "Buat agar menyenangkan",
      "Kerjakan bersama-sama",
    ],
  },
  {
    no: 3,
    statements: [
      "Pendidikan, kebudayaan",
      "Prestasi, penghargaan",
      "Keselamatan, keamanan",
      "Sosial, pertemuan kelompok",
    ],
  },
  {
    no: 4,
    statements: [
      "Lembut, tertutup",
      "Visionary/pandangan ke masa depan",
      "Pusat perhatian, suka bersosialisasi",
      "Pendamai, membawa ketenangan",
    ],
  },
  {
    no: 5,
    statements: [
      "Menahan diri, bisa hidup tanpa memiliki",
      "Membeli karena dorongan hasrat/impulse",
      "Akan menunggu, tanpa tekanan",
      "Akan membeli apa yang diinginkan",
    ],
  },
  {
    no: 6,
    statements: [
      "Mengambil kendali, bersikap langsung/direct",
      "Suka bergaul, antusias",
      "Mudah ditebak, konsisten",
      "Waspada, berhati-hati",
    ],
  },
  {
    no: 7,
    statements: [
      "Menyemangati orang lain",
      "Berusaha mencapai kesempurnaan",
      "Menjadi bagian dari tim/kelompok",
      "Ingin menetapkan goal/tujuan",
    ],
  },
  {
    no: 8,
    statements: [
      "Bersahabat, mudah bergaul",
      "Unik, bosan pada rutinitas",
      "Aktif melakukan perubahan",
      "Ingin segala sesuatu akurat dan pasti",
    ],
  },
  {
    no: 9,
    statements: [
      "Sulit dikalahkan/ditundukkan",
      "Melaksanakan sesuai perintah",
      "Bersemangat, riang",
      "Ingin keteraturan. Rapi",
    ],
  },
  {
    no: 10,
    statements: [
      "Menjadi frustasi",
      "Memendam perasaan dalam hati",
      "Menyampaikan sudut pandang pribadi",
      "Berani menghadapi oposisi",
    ],
  },
  {
    no: 11,
    statements: [
      "Mengalah, tidak suka pertentangan",
      "Penuh dengan hal-hal kecil/detail",
      "Berubah pada menit-menit terakhir",
      "Mendesak/memaksa, agak kasar",
    ],
  },
  {
    no: 12,
    statements: [
      "Saya akan pimpin mereka",
      "Saya akan ikut/mengikuti",
      "Saya akan pengaruhi/bujuk mereka",
      "Saya akan mendapatkan fakta-faktanya",
    ],
  },
  {
    no: 13,
    statements: [
      "Hidup/lincah, banyak bicara",
      "Cepat, penuh keyakinan",
      "Berusaha menjaga keseimbangan",
      "Berusaha patuh pada peraturan",
    ],
  },
  {
    no: 14,
    statements: [
      "Ingin kemajuan/peningkatan",
      "Puas dengan keadaan. Tenang/mudah puas",
      "Menunjukkan perasaan dengan terbuka",
      "Rendah hati, sederhana",
    ],
  },
  {
    no: 15,
    statements: [
      "Memikirkan orang lain dahulu",
      "Suka bersaing/kompetitif. Suka tantangan",
      "Optimis, berpikir positif",
      "Sistematis, berpikir logis",
    ],
  },
  {
    no: 16,
    statements: [
      "Mengelola waktu dengan efisien",
      "Sering terburu-buru, merasa ditekan",
      "Hal-hal sosial adalah penting",
      "Suka menyelesaikan hal yang sudah dimulai",
    ],
  },
  {
    no: 17,
    statements: [
      "Tenang, pendiam, tertutup",
      "Gembira, bebas, riang",
      "Menyenangkan, baik hati",
      "Menyolok, berani",
    ],
  },
  {
    no: 18,
    statements: [
      "Menyenangkan orang lain, ramah, penurut",
      "Tertawa lepas, hidup",
      "Pemberani, tegas",
      "Pendiam, tertutup, tenang",
    ],
  },
  {
    no: 19,
    statements: [
      "Menolak perubahan yang mendadak",
      "Cenderung terlalu banyak berjanji",
      "Mundur apabila berada di bawah tekanan",
      "Tidak takut untuk berkelahi",
    ],
  },
  {
    no: 20,
    statements: [
      "Menyediakan waktu untuk orang lain",
      "Merencanakan masa depan, bersiap-siap",
      "Menuju petualangan baru",
      "Menerima penghargaan atas pencapaian target",
    ],
  },
  {
    no: 21,
    statements: [
      "Ingin wewenang/kekuasaan lebih",
      "Ingin kesempatan baru",
      "Menghindari perselisihan/konflik apapun",
      "Ingin arahan yang jelas",
    ],
  },
  {
    no: 22,
    statements: [
      "Penyemangat/pendukung yang baik",
      "Pendengar yang baik",
      "Penganalisa yang baik",
      "Pendelegasi yang baik/pandai membagi tugas",
    ],
  },
  {
    no: 23,
    statements: [
      "Peraturan perlu diuji",
      "Peraturan membuat menjadi adil",
      "Peraturan membuat menjadi membosankan",
      "Peraturan membuat menjadi aman",
    ],
  },
  {
    no: 24,
    statements: [
      "Dapat dipercaya dan diandalkan",
      "Kreatif, unik",
      "Berorientasi pada hasil/profit/untung",
      "Memegang teguh standar yang tinggi, akurat",
    ],
  },
] as const;

export const DISC_TOTAL_GROUPS = DISC_GROUPS.length; // 24
