import { prefillFromProfile, type PersonalDataForm } from "../../lib/assessment/personal-data";

const year = new Date().getFullYear();

// Formulir minimal yang lolos submit: hanya field wajib yang diisi.
export function completeForm(email = "uji@example.com"): PersonalDataForm {
  const form = prefillFromProfile({ nama: "Calon Uji", jenisKelamin: "Perempuan", tanggalLahir: `${year - 28}-03-04` }, email);
  form.identitas.tempatLahir = "Jakarta";
  form.identitas.alamatTetap.alamat = "Jl. Merdeka No. 1";
  form.identitas.noHandphone = "0812-3456-7890";
  form.identitas.noKtp = "3171234567890001";
  form.identitas.kontakDarurat = { ...form.identitas.kontakDarurat, namaLengkap: "Ibu Uji", hubunganKeluarga: "Ibu", noHandphone: "+6281234567890" };
  form.pernyataan = { ...form.pernyataan, setujuKebenaranData: true, setujuPemrosesanData: true };
  return form;
}
