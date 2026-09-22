export type OptionKey = "a" | "b" | "c" | "d" | "e";
export type Options = Record<OptionKey, string>;

// Soal pilihan ganda A–E. text: SE & AN. letter: ME (huruf awal kata yang dihafal). WA tidak punya text.
export interface ChoiceQuestion {
  id: number;
  text?: string;
  letter?: string;
  options: Options;
  answer: OptionKey;
}

// Soal deret angka (ZR): jawaban diketik.
export interface ZrQuestion {
  id: number;
  sequence: number[];
  answer: number;
}

// Soal GE (Gemeinsamkeiten — mencari kata yang mencakup dua kata): jawaban bebas, dinilai manual oleh HR.
export interface GeQuestion {
  id: number;
  wordA: string;
  wordB: string;
}

// Soal RA (Rechenaufgaben — soal hitungan cerita): jawaban angka diketik, dinilai manual oleh HR.
export interface RaQuestion {
  id: number;
  text: string;
}

// Soal FA (Figurenauswahl — menyusun potongan menjadi bentuk utuh), berbasis gambar: dinilai manual oleh HR.
// imageSet menentukan gambar pilihan jawaban (fa-set1.png untuk soal 117–128, fa-set2.png untuk 129–136).
export interface FaQuestion {
  id: number;
  imageSet: 1 | 2;
}

// Soal WU (Würfelaufgaben — kubus mana yang sama dengan kubus referensi), berbasis gambar: dinilai manual oleh HR.
export interface WuQuestion {
  id: number;
}

const opts = (a: string, b: string, c: string, d: string, e: string): Options => ({ a, b, c, d, e });

// SE — Satzergänzung, soal 1–20
export const SE_QUESTIONS: ChoiceQuestion[] = [
  { id: 1, text: "Pengaruh seseorang terhadap orang lain seharusnya bergantung pada …..", options: opts("kekuasaan", "bujukan", "kekayaan", "keberanian", "kewibawaan"), answer: "e" },
  { id: 2, text: "Lawannya \"hemat\" ialah ……", options: opts("murah", "kikir", "boros", "bernilai", "kaya"), answer: "c" },
  { id: 3, text: "………. tidak termasuk cuaca", options: opts("angin puyuh", "halilintar", "salju", "gempa bumi", "kabut"), answer: "d" },
  { id: 4, text: "Lawannya \"setia\" ialah ……", options: opts("cinta", "benci", "persahabatan", "khianat", "permusuhan"), answer: "d" },
  { id: 5, text: "Seekor kuda selalu mempunyai ……", options: opts("kandang", "ladam", "pelana", "kuku", "surai"), answer: "d" },
  { id: 6, text: "Seorang paman …… lebih tua dari kemenakannya.", options: opts("jarang", "biasanya", "selalu", "tidak pernah", "kadang-kadang"), answer: "b" },
  { id: 7, text: "Pada jumlah yang sama, nilai kalori yang tertinggi terdapat pada ……", options: opts("ikan", "daging", "lemak", "tahu", "sayuran"), answer: "c" },
  { id: 8, text: "Pada suatu pertandingan selalu terdapat ……", options: opts("lawan", "wasit", "penonton", "sorak", "kemenangan"), answer: "a" },
  { id: 9, text: "Suatu pernyataan yang belum dipastikan dikatakan sebagai pernyataan yang …..", options: opts("paradoks", "tergesa-gesa", "mempunyai arti rangkap", "menyesatkan", "hipotesis"), answer: "e" },
  { id: 10, text: "Pada sepatu selalu terdapat ……", options: opts("kulit", "sol", "tali sepatu", "gesper", "lidah"), answer: "b" },
  { id: 11, text: "Suatu …… tidak menyangkut persoalan pencegahan kecelakaan.", options: opts("lampu lalu lintas", "kacamata pelindung", "kotak PPPK", "tanda peringatan", "palang kereta api"), answer: "c" },
  { id: 12, text: "Mata uang logam Rp 50,- tahun 1991, garis tengahnya ialah …… mm.", options: opts("17", "29", "25", "20", "15"), answer: "d" },
  { id: 13, text: "Seseorang yang bersikap menyangsikan setiap kemajuan ialah seorang yang …..", options: opts("demokratis", "radikal", "liberal", "konservatif", "anarkis"), answer: "d" },
  { id: 14, text: "Lawannya \"tidak pernah\" ialah ……", options: opts("sering", "kadang-kadang", "jarang", "kerap kali", "selalu"), answer: "e" },
  { id: 15, text: "Jarak antara Jakarta – Surabaya kira-kira …… Km", options: opts("650", "1000", "800", "600", "950"), answer: "c" },
  { id: 16, text: "Untuk dapat membuat nada yang rendah dan mendalam, kita memerlukan banyak ….", options: opts("kekuatan", "peranan", "ayunan", "berat", "suara"), answer: "d" },
  { id: 17, text: "Ayah …… lebih berpengalaman dari pada anaknya", options: opts("selalu", "biasanya", "jauh", "jarang", "pada dasarnya"), answer: "b" },
  { id: 18, text: "Diantara kota-kota berikut ini, maka kota ….. letaknya paling selatan.", options: opts("Jakarta", "Bandung", "Cirebon", "Semarang", "Surabaya"), answer: "e" },
  { id: 19, text: "Jika kita mengetahui jumlah presentase nomor-nomor lotere yang tidak menang, maka kita dapat menghitung …..", options: opts("jumlah nomor yang menang", "pajak lotere", "kemungkinan menang", "jumlah pengikut", "tinggi keuntungan"), answer: "c" },
  { id: 20, text: "Seorang anak yang berumur 10 tahun tingginya rata-rata …… cm", options: opts("150", "130", "110", "105", "115"), answer: "e" },
];

// WA — Wortauswahl, soal 21–40 (pilih satu kata yang TIDAK termasuk kelompok)
export const WA_QUESTIONS: ChoiceQuestion[] = [
  { id: 21, options: opts("lingkungan", "panah", "elips", "busur", "lengkungan"), answer: "a" },
  { id: 22, options: opts("mengetuk", "memaki", "menjahit", "menggergaji", "memukul"), answer: "b" },
  { id: 23, options: opts("lebar", "keliling", "luas", "isi", "panjang"), answer: "b" },
  { id: 24, options: opts("mengikat", "menyatukan", "melepaskan", "mengaitkan", "melekatkan"), answer: "c" },
  { id: 25, options: opts("arah", "timur", "perjalanan", "tujuan", "selatan"), answer: "c" },
  { id: 26, options: opts("jarak", "perpisahan", "tugas", "batas", "perceraian"), answer: "c" },
  { id: 27, options: opts("saringan", "kelambu", "payung", "tapisan", "jala"), answer: "c" },
  { id: 28, options: opts("putih", "pucat", "buram", "kasar", "berkilauan"), answer: "d" },
  { id: 29, options: opts("otobis", "pesawat terbang", "sepeda motor", "sepeda", "kapal api"), answer: "d" },
  { id: 30, options: opts("biola", "seruling", "klarinet", "terompet", "saxophon"), answer: "a" },
  { id: 31, options: opts("bergelombang", "kasar", "berduri", "licin", "lurus"), answer: "c" },
  { id: 32, options: opts("jam", "kompas", "penunjuk jalan", "bintang pari", "arah"), answer: "e" },
  { id: 33, options: opts("kebijaksanaan", "pendidikan", "perencanaan", "penempatan", "pengerahan"), answer: "a" },
  { id: 34, options: opts("bermotor", "berjalan", "berlayar", "bersepeda", "berkuda"), answer: "a" },
  { id: 35, options: opts("gambar", "lukisan", "potret", "patung", "ukiran"), answer: "d" },
  { id: 36, options: opts("panjang", "lonjong", "runcing", "bulat", "bersudut"), answer: "c" },
  { id: 37, options: opts("kunci", "palang pintu", "gerendel", "gunting", "obeng"), answer: "d" },
  { id: 38, options: opts("jembatan", "batas", "perkawinan", "pagar", "masyarakat"), answer: "e" },
  { id: 39, options: opts("mengetam", "menasehati", "mengasah", "melicinkan", "menggosok"), answer: "b" },
  { id: 40, options: opts("batu", "baja", "bulu", "karet", "kayu"), answer: "c" },
];

// AN — Analogien, soal 41–60
export const AN_QUESTIONS: ChoiceQuestion[] = [
  { id: 41, text: "Menemukan : menghilangkan = Mengingat : ?", options: opts("menghapal", "mengenai", "melupakan", "berpikir", "memimpikan"), answer: "c" },
  { id: 42, text: "Bunga : jambangan = Burung : ?", options: opts("sarang", "langit", "pagar", "pohon", "sangkar"), answer: "e" },
  { id: 43, text: "Kereta api : rel = Otobis : ?", options: opts("roda", "poros", "ban", "jalan raya", "kecepatan"), answer: "d" },
  { id: 44, text: "Perak : emas = Cincin : ?", options: opts("arloji", "berlian", "permata", "gelang", "platina"), answer: "d" },
  { id: 45, text: "Lingkaran : bola = Bujur sangkar : ?", options: opts("bentuk", "gambar", "segi empat", "kubus", "piramida"), answer: "d" },
  { id: 46, text: "Saran : kepustakaan = Merundingkan : ?", options: opts("menawarkan", "menentukan", "menilai", "menimbang", "merenungkan"), answer: "d" },
  { id: 47, text: "Lidah : asam = Hidung : ?", options: opts("mencium", "bernapas", "mengecap", "tengik", "asin"), answer: "d" },
  { id: 48, text: "Darah : pembuluh = Air : ?", options: opts("pintu air", "sungai", "talang", "hujan", "ember"), answer: "b" },
  { id: 49, text: "Saraf : penyalur = Pupil : ?", options: opts("penyinaran", "mata", "melihat", "cahaya", "pelindung"), answer: "e" },
  { id: 50, text: "Pengantar surat : pengantar telegram = Pandai besi : ?", options: opts("palu godam", "pedagang besi", "api", "tukang emas", "besi tempa"), answer: "d" },
  { id: 51, text: "Buta : warna = Tuli : ?", options: opts("pendengaran", "mendengar", "nada", "kata", "telinga"), answer: "c" },
  { id: 52, text: "Makanan : bumbu = Ceramah : ?", options: opts("penghinaan", "pidato", "kelakar", "kesan", "ayat"), answer: "c" },
  { id: 53, text: "Marah : emosi = Duka cita : ?", options: opts("suka cita", "sakit hati", "suasana hati", "sedih", "rindu"), answer: "c" },
  { id: 54, text: "Mantel : jubah = wool : ?", options: opts("bahan sandang", "domba", "sutra", "jas", "tekstil"), answer: "c" },
  { id: 55, text: "Ketinggian puncak : tekanan udara = ketinggian nada : ?", options: opts("garpu tala", "sopran", "nyanyian", "panjang senar", "suara"), answer: "d" },
  { id: 56, text: "Negara : revolusi = Hidup : ?", options: opts("biologi", "keturunan", "mutasi", "seleksi", "ilmu hewan"), answer: "c" },
  { id: 57, text: "Kekurangan : penemuan = Panas : ?", options: opts("haus", "khatulistiwa", "es", "matahari", "dingin"), answer: "e" },
  { id: 58, text: "Kayu : diketam = Besi : ?", options: opts("dipalu", "digergaji", "dituang", "dikikir", "ditempa"), answer: "d" },
  { id: 59, text: "Olahragawan : lembing = Cendekiawan : ?", options: opts("perpustakaan", "penelitian", "karya", "studi", "mikroskop"), answer: "e" },
  { id: 60, text: "Keledai : kuda pacuan = Pembakaran : ?", options: opts("pemadam api", "obor", "letupan", "korek api", "lautan api"), answer: "c" },
];

// GE — Gemeinsamkeiten, soal 61–76 (jawaban bebas: satu kata yang mencakup kedua kata)
export const GE_QUESTIONS: GeQuestion[] = [
  { id: 61, wordA: "mawar", wordB: "melati" },
  { id: 62, wordA: "mata", wordB: "telinga" },
  { id: 63, wordA: "gula", wordB: "intan" },
  { id: 64, wordA: "hujan", wordB: "salju" },
  { id: 65, wordA: "pengantar surat", wordB: "telepon" },
  { id: 66, wordA: "kamera", wordB: "kacamata" },
  { id: 67, wordA: "lambung", wordB: "usus" },
  { id: 68, wordA: "banyak", wordB: "sedikit" },
  { id: 69, wordA: "telur", wordB: "benih" },
  { id: 70, wordA: "bendera", wordB: "lencana" },
  { id: 71, wordA: "rumput", wordB: "gajah" },
  { id: 72, wordA: "ember", wordB: "kantong" },
  { id: 73, wordA: "awal", wordB: "akhir" },
  { id: 74, wordA: "kikir", wordB: "boros" },
  { id: 75, wordA: "penawaran", wordB: "permintaan" },
  { id: 76, wordA: "atas", wordB: "bawah" },
];

// RA — Rechenaufgaben, soal 77–96 (jawaban angka diketik)
export const RA_QUESTIONS: RaQuestion[] = [
  { id: 77, text: "Jika seorang anak memiliki 50 rupiah dan memberikan 15 rupiah kepada orang lain, berapa rupiahkah yang masih tinggal padanya?" },
  { id: 78, text: "Berapa km-kah yang dapat ditempuh oleh kereta api dalam waktu 7 jam, jika kecepatannya 40 km/jam?" },
  { id: 79, text: "15 peti buah-buahan beratnya 250 kg dan setiap peti kosong beratnya 3 kg, berapakah berat buah-buahan itu?" },
  { id: 80, text: "Seseorang mempunyai persediaan rumput yang cukup untuk 7 ekor kuda selama 78 hari. Berapa harikah persediaan itu cukup untuk 21 ekor kuda?" },
  { id: 81, text: "3 batang coklat harganya Rp 5,- Berapa batangkah yang dapat kita beli dengan Rp 50,-?" },
  { id: 82, text: "Seseorang dapat berjalan 1,75 m dalam waktu ¼ detik. Berapakah meterkah yang dapat ia tempuh dalam waktu 10 detik?" },
  { id: 83, text: "Jika sebuah batu terletak 15 m di sebelah selatan dari sebatang pohon dan pohon itu berada 30 m di sebelah selatan dari sebuah rumah, berapa meterkah jarak antara batu dan rumah itu?" },
  { id: 84, text: "Jika 4½ m bahan sandang harganya Rp 90,- berapakah rupiahkah harganya 2½ m?" },
  { id: 85, text: "7 orang dapat menyelesaikan sesuatu pekerjaan dalam 6 hari. Berapa orangkah yang diperlukan untuk menyelesaikan pekerjaan itu dalam setengah hari?" },
  { id: 86, text: "Karena dipanaskan, kawat yang panjangnya 48 cm akan mengembang menjadi 52 cm. Setelah pemanasan, berapakah panjangnya kawat yang berukuran 72 cm?" },
  { id: 87, text: "Suatu pabrik dapat menghasilkan 304 batang pensil dalam waktu 8 jam. Berapa batangkah dihasilkan dalam waktu setengah jam?" },
  { id: 88, text: "Untuk suatu campuran diperlukan 2 bagian perak dan 3 bagian timah. Berapa gramkah perak yang diperlukan untuk mendapatkan campuran itu yang beratnya 15 gram?" },
  { id: 89, text: "Untuk setiap Rp 3,- yang dimiliki Sidin, Hamid memiliki Rp 5,- Jika mereka bersama mempunyai Rp 120,- berapa rupiahkah yang dimiliki Hamid?" },
  { id: 90, text: "Mesin A menenun 60 m kain, sedangkan mesin B menenun 40 m. Berapa meterkah yang ditenun mesin A, jika mesin B menenun 60 m?" },
  { id: 91, text: "Seseorang membelikan 1/10 dari uangnya untuk perangko dan 4 kali jumlah itu untuk alat tulis. Sisa uangnya masih Rp 60,- Berapa rupiahkah uang semula?" },
  { id: 92, text: "Di dalam dua peti terdapat 43 piring. Di dalam peti yang satu terdapat 9 piring lebih banyak dari pada di dalam peti yang lain. Berapa buah piring terdapat di dalam peti yang lebih kecil?" },
  { id: 93, text: "Suatu lembaran kain yang panjangnya 60 cm harus dibagikan sedemikian rupa sehingga panjangnya satu bagian ialah 2/3 dari bagian yang lain. Berapa panjangnya bagian yang terpendek?" },
  { id: 94, text: "Suatu perusahaan mengekspor ¾ dari hasil produksinya dan menjual 4/5 dari sisa itu dalam negeri. Berapa % kah hasil produksi yang masih tinggal?" },
  { id: 95, text: "Jika suatu botol berisi anggur hanya 7/8 bagian dan harganya ialah Rp 84,- berapakah harga anggur itu jika botol itu hanya terisi ½ penuh?" },
  { id: 96, text: "Di dalam suatu keluarga setiap anak perempuan mempunyai jumlah saudara laki-laki yang sama dengan jumlah saudara perempuan dan setiap anak laki-laki mempunyai dua kali lebih banyak saudara perempuan dari pada saudara laki-laki. Berapa anak laki-lakikah yang terdapat di dalam keluarga tersebut?" },
];

// ZR — Zahlenreihen, soal 97–116 (jawaban diketik)
export const ZR_QUESTIONS: ZrQuestion[] = [
  { id: 97, sequence: [6, 9, 12, 15, 18, 21, 24], answer: 27 },
  { id: 98, sequence: [15, 16, 18, 19, 21, 22, 24], answer: 25 },
  { id: 99, sequence: [19, 18, 22, 21, 25, 24, 28], answer: 27 },
  { id: 100, sequence: [16, 12, 17, 13, 18, 14, 19], answer: 15 },
  { id: 101, sequence: [2, 4, 8, 10, 20, 22, 44], answer: 46 },
  { id: 102, sequence: [15, 13, 16, 12, 17, 11, 18], answer: 10 },
  { id: 103, sequence: [25, 22, 11, 33, 30, 15, 45], answer: 42 },
  { id: 104, sequence: [49, 51, 54, 27, 9, 11, 14], answer: 7 },
  { id: 105, sequence: [2, 3, 1, 3, 4, 2, 4], answer: 5 },
  { id: 106, sequence: [19, 17, 20, 16, 21, 15, 22], answer: 14 },
  { id: 107, sequence: [94, 92, 46, 44, 22, 20, 10], answer: 8 },
  { id: 108, sequence: [5, 8, 9, 8, 11, 12, 11], answer: 14 },
  { id: 109, sequence: [12, 15, 19, 23, 28, 33, 39], answer: 45 },
  { id: 110, sequence: [7, 5, 10, 7, 21, 17, 68], answer: 63 },
  { id: 111, sequence: [11, 15, 18, 9, 13, 16, 8], answer: 12 },
  { id: 112, sequence: [3, 8, 15, 24, 35, 48, 63], answer: 80 },
  { id: 113, sequence: [4, 5, 7, 4, 8, 13, 7], answer: 14 },
  { id: 114, sequence: [8, 5, 15, 18, 6, 3, 9], answer: 12 },
  { id: 115, sequence: [15, 6, 18, 10, 30, 23, 69], answer: 63 },
  { id: 116, sequence: [5, 35, 28, 4, 11, 77, 70], answer: 10 },
];

// FA — Figurenauswahl, soal 117–136 (pilihan ganda A–E, berbasis gambar). Gambar pilihan jawaban dan gambar
// soal ada di public/ist/; lihat FA_QUESTION_IMAGE / FA_ANSWER_IMAGE di halaman tes.
export const FA_QUESTIONS: FaQuestion[] = [
  { id: 117, imageSet: 1 },
  { id: 118, imageSet: 1 },
  { id: 119, imageSet: 1 },
  { id: 120, imageSet: 1 },
  { id: 121, imageSet: 1 },
  { id: 122, imageSet: 1 },
  { id: 123, imageSet: 1 },
  { id: 124, imageSet: 1 },
  { id: 125, imageSet: 1 },
  { id: 126, imageSet: 1 },
  { id: 127, imageSet: 1 },
  { id: 128, imageSet: 1 },
  { id: 129, imageSet: 2 },
  { id: 130, imageSet: 2 },
  { id: 131, imageSet: 2 },
  { id: 132, imageSet: 2 },
  { id: 133, imageSet: 2 },
  { id: 134, imageSet: 2 },
  { id: 135, imageSet: 2 },
  { id: 136, imageSet: 2 },
];

// WU — Würfelaufgaben, soal 137–156 (pilihan ganda A–E, berbasis gambar). Gambar referensi dan gambar
// soal ada di public/ist/; lihat WU_QUESTION_IMAGE di halaman tes.
export const WU_QUESTIONS: WuQuestion[] = [
  { id: 137 }, { id: 138 }, { id: 139 }, { id: 140 }, { id: 141 },
  { id: 142 }, { id: 143 }, { id: 144 }, { id: 145 }, { id: 146 },
  { id: 147 }, { id: 148 }, { id: 149 }, { id: 150 }, { id: 151 },
  { id: 152 }, { id: 153 }, { id: 154 }, { id: 155 }, { id: 156 },
];

// ME — Merkaufgaben. Fase 1: daftar kata yang dihafal (3 menit).
export const ME_WORDS: { category: string; words: string[] }[] = [
  { category: "BUNGA", words: ["SOKA", "LARAT", "FLAMBOYAN", "YASMIN", "DAHLIA"] },
  { category: "PERKAKAS", words: ["WAJAN", "JARUM", "KIKIR", "CANGKUL", "PALU"] },
  { category: "BURUNG", words: ["ITIK", "ELANG", "WALET", "TEKUKUR", "NURI"] },
  { category: "KESENIAN", words: ["QUINTET", "ARCA", "OPERA", "UKIRAN", "GAMELAN"] },
  { category: "BINATANG", words: ["RUSA", "MUSANG", "BERUANG", "HARIMAU", "ZEBRA"] },
];

// Pilihan jawaban ME selalu sama: golongan kata (urutan a–e mengikuti kunci jawaban).
const ME_OPTIONS = opts("Bunga", "Perkakas", "Burung", "Kesenian", "Binatang");

// ME fase 2, soal 157–176: kata mana yang berawalan huruf ini, dan termasuk golongan apa?
export const ME_QUESTIONS: ChoiceQuestion[] = [
  { id: 157, letter: "A", options: ME_OPTIONS, answer: "d" }, // ARCA
  { id: 158, letter: "B", options: ME_OPTIONS, answer: "e" }, // BERUANG
  { id: 159, letter: "C", options: ME_OPTIONS, answer: "b" }, // CANGKUL
  { id: 160, letter: "D", options: ME_OPTIONS, answer: "a" }, // DAHLIA
  { id: 161, letter: "E", options: ME_OPTIONS, answer: "c" }, // ELANG
  { id: 162, letter: "F", options: ME_OPTIONS, answer: "a" }, // FLAMBOYAN
  { id: 163, letter: "G", options: ME_OPTIONS, answer: "d" }, // GAMELAN
  { id: 164, letter: "H", options: ME_OPTIONS, answer: "e" }, // HARIMAU
  { id: 165, letter: "I", options: ME_OPTIONS, answer: "c" }, // ITIK
  { id: 166, letter: "J", options: ME_OPTIONS, answer: "b" }, // JARUM
  { id: 167, letter: "K", options: ME_OPTIONS, answer: "b" }, // KIKIR
  { id: 168, letter: "L", options: ME_OPTIONS, answer: "a" }, // LARAT
  { id: 169, letter: "M", options: ME_OPTIONS, answer: "e" }, // MUSANG
  { id: 170, letter: "N", options: ME_OPTIONS, answer: "c" }, // NURI
  { id: 171, letter: "O", options: ME_OPTIONS, answer: "d" }, // OPERA
  { id: 172, letter: "P", options: ME_OPTIONS, answer: "b" }, // PALU
  { id: 173, letter: "R", options: ME_OPTIONS, answer: "e" }, // RUSA
  { id: 174, letter: "S", options: ME_OPTIONS, answer: "a" }, // SOKA
  { id: 175, letter: "T", options: ME_OPTIONS, answer: "c" }, // TEKUKUR
  { id: 176, letter: "U", options: ME_OPTIONS, answer: "d" }, // UKIRAN
];
