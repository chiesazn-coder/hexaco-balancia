// Tes Bahasa Cinta (Love Language)
// 30 nomor × 2 pernyataan. Kandidat memilih 1 pernyataan per nomor.
// Setiap pernyataan punya huruf kategori A–E sesuai lembar asli.
// Urutan pernyataan per nomor mengikuti lembar asli (atas → bawah).
// Huruf TIDAK ditampilkan ke kandidat; yang disimpan adalah huruf pilihan.
//
// Kategori (untuk tampilan hasil di dashboard):
//   A = Kata-kata Pujian (Words of Affirmation)
//   B = Waktu Berkualitas (Quality Time)
//   C = Menerima Hadiah (Receiving Gifts)
//   D = Tindakan Melayani (Acts of Service)
//   E = Sentuhan Fisik (Physical Touch)

export type LoveLanguageLetter = "A" | "B" | "C" | "D" | "E";

export interface LoveLanguageOption {
  letter: LoveLanguageLetter;
  text: string;
}

export interface LoveLanguageItem {
  no: number;
  options: readonly [LoveLanguageOption, LoveLanguageOption];
}

export const LOVE_LANGUAGE_CATEGORIES: Record<LoveLanguageLetter, string> = {
  A: "Kata-kata Pujian",
  B: "Waktu Berkualitas",
  C: "Menerima Hadiah",
  D: "Tindakan Melayani",
  E: "Sentuhan Fisik",
};

export const LOVE_LANGUAGE_ITEMS: readonly LoveLanguageItem[] = [
  { no: 1, options: [
    { letter: "A", text: "Saya suka menerima catatan dari pengakuan positif." },
    { letter: "E", text: "Saya suka berpelukan." },
  ] },
  { no: 2, options: [
    { letter: "B", text: "Saya suka menghabiskan waktu dengan orang terdekat." },
    { letter: "D", text: "Saya merasa dicintai ketika seseorang membantu saya." },
  ] },
  { no: 3, options: [
    { letter: "C", text: "Saya suka ketika orang memberi saya hadiah." },
    { letter: "B", text: "Saya suka berkunjung santai dengan teman-teman dan orang yang dicintai." },
  ] },
  { no: 4, options: [
    { letter: "D", text: "Saya merasa dicintai ketika orang membantu saya." },
    { letter: "E", text: "Saya merasa dicintai ketika orang memeluk/mengusap pundak/kepala saya." },
  ] },
  { no: 5, options: [
    { letter: "E", text: "Saya merasa dicintai ketika seseorang yang saya cintai atau kagumi menempatkan lengan di pundak saya." },
    { letter: "C", text: "Saya merasa dicintai ketika saya menerima hadiah dari seseorang yang saya cintai atau kagumi." },
  ] },
  { no: 6, options: [
    { letter: "B", text: "Saya menyukai pergi dengan teman-teman dan orang yang dicintai." },
    { letter: "E", text: "Saya menyukai tos atau memegang tangan dengan orang yang spesial bagi saya." },
  ] },
  { no: 7, options: [
    { letter: "C", text: "Simbol cinta yang nampak (contoh: hadiah) adalah sangat penting untuk saya." },
    { letter: "A", text: "Saya merasa dicintai ketika orang mengakui saya." },
  ] },
  { no: 8, options: [
    { letter: "E", text: "Saya menyukai duduk dekat orang yang membuat saya nyaman." },
    { letter: "A", text: "Saya menyukai orang memberitahu saya cantik/ganteng." },
  ] },
  { no: 9, options: [
    { letter: "B", text: "Saya suka menghabiskan waktu dengan teman-teman dan orang yang dicintai." },
    { letter: "C", text: "Saya suka menerima hadiah kecil dari teman-teman dan orang yang dicintai." },
  ] },
  { no: 10, options: [
    { letter: "A", text: "Kata-kata penerimaan adalah penting bagi saya." },
    { letter: "D", text: "Saya tahu seseorang mencintai saya ketika dia membantu saya." },
  ] },
  { no: 11, options: [
    { letter: "B", text: "Saya suka bersama dan mengerjakan hal-hal dengan teman-teman dan orang yang dicintai." },
    { letter: "A", text: "Saya suka ketika kata-kata baik dibicarakan kepada saya." },
  ] },
  { no: 12, options: [
    { letter: "D", text: "Apa yang seseorang lakukan memengaruhi saya lebih dari apa yang dia katakan." },
    { letter: "E", text: "Pelukan membuat saya merasa terhubung dan dihargai." },
  ] },
  { no: 13, options: [
    { letter: "A", text: "Saya lebih senang pujian dan mencoba untuk menghindari kritik." },
    { letter: "C", text: "Beberapa hadiah kecil lebih berarti bagi saya dibandingkan satu hadiah besar." },
  ] },
  { no: 14, options: [
    { letter: "B", text: "Saya merasa dekat dengan seseorang ketika kami sedang berbicara atau sedang mengerjakan sesuatu bersama." },
    { letter: "E", text: "Saya merasa lebih dekat dengan teman-teman dan orang yang dicintai ketika mereka sering merangkul/memeluk saya." },
  ] },
  { no: 15, options: [
    { letter: "A", text: "Saya suka orang memuji prestasi saya." },
    { letter: "D", text: "Saya tahu orang mencintai saya ketika mereka mengerjakan hal-hal untuk saya yang tidak mereka nikmati ketika mengerjakannya." },
  ] },
  { no: 16, options: [
    { letter: "E", text: "Saya suka diusap pundak saat teman atau orang terkasih lewat." },
    { letter: "B", text: "Saya suka ketika orang mendengarkan saya dan tertarik pada apa yang saya ucapkan." },
  ] },
  { no: 17, options: [
    { letter: "D", text: "Saya merasa dicintai ketika teman-teman dan orang yang dicintai membantu saya dengan pekerjaan atau proyek." },
    { letter: "C", text: "Saya sungguh menikmati menerima hadiah dari teman-teman dan orang yang dicintai." },
  ] },
  { no: 18, options: [
    { letter: "A", text: "Saya suka orang yang memuji penampilan saya." },
    { letter: "B", text: "Saya merasa dicintai ketika orang menghabiskan waktu untuk memahami perasaan saya." },
  ] },
  { no: 19, options: [
    { letter: "E", text: "Saya merasa aman ketika orang spesial sedang memeluk saya." },
    { letter: "D", text: "Tindakan melayani membuat saya merasa dicintai." },
  ] },
  { no: 20, options: [
    { letter: "D", text: "Saya menghargai banyak hal yang orang spesial kerjakan untuk saya." },
    { letter: "C", text: "Saya suka menerima hadiah yang orang spesial buat untuk saya." },
  ] },
  { no: 21, options: [
    { letter: "B", text: "Saya sungguh menikmati perasaan yang saya dapatkan ketika seseorang memberi saya perhatian penuh." },
    { letter: "D", text: "Saya sungguh menikmati perasaan yang saya dapatkan ketika seseorang membantu saya membuat keputusan." },
  ] },
  { no: 22, options: [
    { letter: "C", text: "Saya merasa dicintai ketika seseorang merayakan hari ulang tahun saya dengan hadiah." },
    { letter: "A", text: "Saya merasa dicintai ketika seseorang merayakan hari ulang tahun saya dengan kata-kata yang penuh makna." },
  ] },
  { no: 23, options: [
    { letter: "C", text: "Saya tahu seseorang memikirkan saya ketika dia memberi saya hadiah." },
    { letter: "D", text: "Saya merasa dicintai ketika seseorang membantu saya dengan pekerjaan rumah tangga." },
  ] },
  { no: 24, options: [
    { letter: "B", text: "Saya menghargai ketika seseorang mendengarkan dengan sabar dan tidak menyela saya berbicara." },
    { letter: "C", text: "Saya menghargai ketika seseorang mengingat hari spesial dengan hadiah." },
  ] },
  { no: 25, options: [
    { letter: "D", text: "Saya senang mengetahui orang-orang terkasih cukup peduli untuk membantu tugas sehari-hari saya." },
    { letter: "B", text: "Saya menikmati perjalanan panjang dengan seseorang yang spesial bagi saya." },
  ] },
  { no: 26, options: [
    { letter: "E", text: "Saya menikmati pelukan atau dipeluk oleh orang-orang yang dekat dengan saya." },
    { letter: "C", text: "Saya menikmati menerima hadiah tanpa alasan khusus." },
  ] },
  { no: 27, options: [
    { letter: "A", text: "Saya senang diberi tahu bahwa saya dihargai." },
    { letter: "B", text: "Saya suka seseorang melihat saya ketika kami berbicara." },
  ] },
  { no: 28, options: [
    { letter: "C", text: "Hadiah dari teman atau orang terkasih selalu spesial bagi saya." },
    { letter: "E", text: "Saya merasa senang ketika seorang teman atau orang yang saya kasihi memeluk saya." },
  ] },
  { no: 29, options: [
    { letter: "D", text: "Saya merasa dicintai ketika seseorang dengan antusias mengerjakan tugas yang saya minta." },
    { letter: "A", text: "Saya merasa dicintai ketika saya diberi tahu betapa saya dibutuhkan." },
  ] },
  { no: 30, options: [
    { letter: "E", text: "Saya perlu diusap pundak/dipeluk setiap hari." },
    { letter: "A", text: "Saya membutuhkan kata-kata penyemangat setiap hari." },
  ] },
] as const;

export const LOVE_LANGUAGE_TOTAL_ITEMS = LOVE_LANGUAGE_ITEMS.length; // 30