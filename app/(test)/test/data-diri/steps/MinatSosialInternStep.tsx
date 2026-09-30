"use client";

import { BanknotesIcon, BuildingOffice2Icon, FlagIcon, MapIcon, PuzzlePieceIcon, ScaleIcon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { LIMITS } from "@/lib/assessment/personal-data";
import { MAKS_BARIS, type LingkunganKerja } from "@/lib/types/personalData";
import { DateField, Grid, MoneyField, RowsField, Section, TextAreaField, TextField, YaTidakField } from "../fields";
import type { StepProps } from "./types";

const LINGKUNGAN: { value: LingkunganKerja; label: string }[] = [
  { value: "kantor", label: "Kantor" },
  { value: "pabrik", label: "Pabrik" },
  { value: "proyek", label: "Proyek" },
  { value: "lapangan", label: "Lapangan" },
];

function LingkunganField({ label, value, onChange }: {
  label: string; value: { pilihan: LingkunganKerja[]; alasan: string }; onChange: (value: { pilihan: LingkunganKerja[]; alasan: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">{label}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LINGKUNGAN.map((option) => {
            const checked = value.pilihan.includes(option.value);
            return (
              <label key={option.value} className={"flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-4 text-sm font-semibold transition focus-within:ring-4 focus-within:ring-blue-100 " + (checked ? "border-primary bg-blue-50 text-primary" : "border-slate-300 bg-white text-slate-700 hover:border-primary")}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange({
                    ...value,
                    // Urutan pilihan mengikuti urutan opsi agar data konsisten.
                    pilihan: LINGKUNGAN.map((o) => o.value).filter((v) => (v === option.value ? !checked : value.pilihan.includes(v))),
                  })}
                  className="h-4 w-4 accent-[#063b82]"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <TextAreaField label="Alasan" value={value.alasan} rows={2} onChange={(alasan) => onChange({ ...value, alasan })} />
    </div>
  );
}

export function MinatStep({ form, update }: StepProps) {
  const m = form.minat;
  return (
    <div className="space-y-6">
      <Section title="Jabatan yang Dilamar" description="Posisi yang Anda tuju dan alasannya." icon={FlagIcon}>
        <TextField label="Jabatan yang dituju" value={m.jabatanDituju} max={LIMITS.name} onChange={(v) => update((f) => { f.minat.jabatanDituju = v; })} />
        <TextAreaField label="Mengapa Saudara memilih jabatan tersebut?" value={m.alasanJabatan} onChange={(v) => update((f) => { f.minat.alasanJabatan = v; })} />
        <TextAreaField label="Apa yang Saudara ketahui tentang jabatan tersebut?" value={m.pengetahuanJabatan} onChange={(v) => update((f) => { f.minat.pengetahuanJabatan = v; })} />
      </Section>
      <Section title="Lingkungan Kerja" description="Boleh pilih lebih dari satu." icon={BuildingOffice2Icon}>
        <LingkunganField label="Lingkungan kerja yang disukai" value={m.lingkunganDisukai} onChange={(v) => update((f) => { f.minat.lingkunganDisukai = v; })} />
        <LingkunganField label="Lingkungan kerja yang tidak disukai" value={m.lingkunganTidakDisukai} onChange={(v) => update((f) => { f.minat.lingkunganTidakDisukai = v; })} />
      </Section>
      <Section title="Konsep Diri" description="Cita-cita dan cara Anda mengambil keputusan." icon={SparklesIcon}>
        <TextAreaField label="Cita-cita Saudara" value={m.citaCita} onChange={(v) => update((f) => { f.minat.citaCita = v; })} />
        <TextAreaField label="Dalam hal apa Saudara sulit mengambil keputusan?" value={m.sulitMengambilKeputusan} onChange={(v) => update((f) => { f.minat.sulitMengambilKeputusan = v; })} />
      </Section>
    </div>
  );
}

export function SosialStep({ form, update }: StepProps) {
  const s = form.sosial;
  return (
    <div className="space-y-6">
      <Section title="Kegiatan" description="Hobi, waktu luang, dan perjalanan." icon={PuzzlePieceIcon}>
        <TextAreaField label="Hobi" value={s.hobi} rows={2} onChange={(v) => update((f) => { f.sosial.hobi = v; })} />
        <TextAreaField label="Bagaimana Saudara mengisi waktu luang?" value={s.waktuLuang} rows={2} onChange={(v) => update((f) => { f.sosial.waktuLuang = v; })} />
        <YaTidakField
          label="Apakah Saudara pernah ke luar negeri?"
          detailLabel="Ke mana, kapan, berapa lama, dan untuk keperluan apa"
          value={s.pernahKeLuarNegeri}
          onChange={(v) => update((f) => { f.sosial.pernahKeLuarNegeri = v; })}
        />
      </Section>
      <Section title="Organisasi" description="Organisasi yang pernah atau sedang Anda ikuti." icon={UserGroupIcon}>
        <RowsField
          label="Organisasi yang pernah/sedang diikuti"
          items={s.organisasi}
          max={MAKS_BARIS.organisasi}
          addLabel="Tambah organisasi"
          empty={() => ({ nama: "", jabatan: "", periode: "", keterangan: "" })}
          onChange={(organisasi) => update((f) => { f.sosial.organisasi = organisasi; })}
          renderItem={(item, set) => (
            <>
              <TextField label="Nama organisasi" value={item.nama} max={LIMITS.name} onChange={(nama) => set({ ...item, nama })} />
              <Grid>
                <TextField label="Jabatan" value={item.jabatan} max={LIMITS.name} onChange={(jabatan) => set({ ...item, jabatan })} />
                <TextField label="Periode" value={item.periode} max={LIMITS.short} placeholder="Mis. 2019–2021" onChange={(periode) => set({ ...item, periode })} />
              </Grid>
              <TextField label="Keterangan" value={item.keterangan} max={LIMITS.note} onChange={(keterangan) => set({ ...item, keterangan })} />
            </>
          )}
        />
      </Section>
      <Section title="Kekuatan & Kelemahan" description="Gambaran jujur tentang diri Anda." icon={ScaleIcon}>
        <TextAreaField label="Kekuatan Saudara" value={s.kekuatan} onChange={(v) => update((f) => { f.sosial.kekuatan = v; })} />
        <TextAreaField label="Kelemahan Saudara" value={s.kelemahan} onChange={(v) => update((f) => { f.sosial.kelemahan = v; })} />
      </Section>
    </div>
  );
}

export function InternStep({ form, update }: StepProps) {
  const n = form.intern;
  return (
    <div className="space-y-6">
      <Section title="Harapan Kerja" description="Gaji, fasilitas, dan kapan Anda dapat mulai bekerja." icon={BanknotesIcon}>
        <Grid>
          <MoneyField label="Gaji yang diharapkan" suffix="/ bulan" value={n.gajiDiharapkan} onChange={(v) => update((f) => { f.intern.gajiDiharapkan = v; })} />
          <DateField label="Tanggal mulai dapat bekerja" value={n.tanggalMulaiKerja} onChange={(v) => update((f) => { f.intern.tanggalMulaiKerja = v; })} />
        </Grid>
        <TextAreaField label="Fasilitas yang diharapkan" value={n.fasilitasDiharapkan} rows={2} onChange={(v) => update((f) => { f.intern.fasilitasDiharapkan = v; })} />
      </Section>
      <Section title="Penempatan & Riwayat Lamaran" description="Kesediaan ditempatkan, kendaraan, dan lamaran sebelumnya." icon={MapIcon}>
        <YaTidakField
          label="Apakah Saudara bersedia ditempatkan di luar kota?"
          detailLabel="Alasan bila tidak bersedia"
          detailWhen={false}
          value={n.bersediaDiLuarKota}
          onChange={(v) => update((f) => { f.intern.bersediaDiLuarKota = v; })}
        />
        <TextField label="Kendaraan yang dimiliki" value={n.kendaraanDimiliki} max={LIMITS.short} placeholder="Mis. Motor" onChange={(v) => update((f) => { f.intern.kendaraanDimiliki = v; })} />
        <YaTidakField
          label="Apakah Saudara pernah melamar di perusahaan dalam grup ini?"
          detailLabel="Di mana dan kapan"
          value={n.pernahMelamarDiGroup}
          onChange={(v) => update((f) => { f.intern.pernahMelamarDiGroup = v; })}
        />
      </Section>
    </div>
  );
}
