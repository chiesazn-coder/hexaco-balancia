"use client";

import { AcademicCapIcon, BookOpenIcon, LanguageIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { LIMITS } from "@/lib/assessment/personal-data";
import { MAKS_BARIS, type NilaiBahasa, type PendidikanFormal, type TingkatPendidikan } from "@/lib/types/personalData";
import { Grid, RowsField, Section, SelectField, TextAreaField, TextField } from "../fields";
import type { StepProps } from "./types";

const TINGKAT: TingkatPendidikan[] = ["SLTP", "SLTA", "Akademi", "Universitas", "Lain-lain"];
const NILAI: { value: NilaiBahasa; label: string }[] = [
  { value: "S", label: "S — Sedang" },
  { value: "B", label: "B — Bagus" },
  { value: "BS", label: "BS — Bagus Sekali" },
];
type FormalField = Exclude<keyof PendidikanFormal, "tingkat">;
const emptyFormal = (tingkat: TingkatPendidikan): PendidikanFormal =>
  ({ tingkat, namaSekolahLokasi: "", tahun: "", gelar: "", bidangStudi: "", yangMembiayai: "" });
const isEmptyFormal = (row: PendidikanFormal) =>
  !row.namaSekolahLokasi && !row.tahun && !row.gelar && !row.bidangStudi && !row.yangMembiayai;

export default function PendidikanStep({ form, update }: StepProps) {
  const p = form.pendidikan;

  // Lima baris tetap (satu per jenjang); hanya baris yang berisi yang disimpan.
  function setFormal(tingkat: TingkatPendidikan, key: FormalField, value: string) {
    update((f) => {
      const current = f.pendidikan.formal.find((row) => row.tingkat === tingkat) ?? emptyFormal(tingkat);
      const next = { ...current, [key]: value };
      const others = f.pendidikan.formal.filter((row) => row.tingkat !== tingkat);
      f.pendidikan.formal = (isEmptyFormal(next) ? others : [...others, next])
        .sort((a, b) => TINGKAT.indexOf(a.tingkat) - TINGKAT.indexOf(b.tingkat));
    });
  }

  return (
    <div className="space-y-6">
      <Section title="Pendidikan Formal" description="Isi jenjang yang pernah Anda tempuh saja; jenjang kosong dilewati." icon={AcademicCapIcon}>
        {TINGKAT.map((tingkat) => {
          const row = p.formal.find((item) => item.tingkat === tingkat) ?? emptyFormal(tingkat);
          return (
            <div key={tingkat} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">{tingkat}</p>
              <div className="space-y-5">
                <TextField label="Nama sekolah dan lokasi" value={row.namaSekolahLokasi} max={LIMITS.name} onChange={(v) => setFormal(tingkat, "namaSekolahLokasi", v)} />
                <Grid>
                  <TextField label="Tahun" value={row.tahun} max={LIMITS.short} placeholder="Mis. 2015–2018" onChange={(v) => setFormal(tingkat, "tahun", v)} />
                  <TextField label="Gelar" value={row.gelar} max={LIMITS.short} onChange={(v) => setFormal(tingkat, "gelar", v)} />
                  <TextField label="Bidang studi" value={row.bidangStudi} max={LIMITS.name} onChange={(v) => setFormal(tingkat, "bidangStudi", v)} />
                  <TextField label="Yang membiayai" value={row.yangMembiayai} max={LIMITS.name} onChange={(v) => setFormal(tingkat, "yangMembiayai", v)} />
                </Grid>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Kursus & Pelatihan" description="Kursus atau pelatihan di luar sekolah formal." icon={BookOpenIcon}>
        <RowsField
          label="Kursus yang pernah diikuti"
          items={p.kursus}
          max={MAKS_BARIS.kursus}
          addLabel="Tambah kursus"
          empty={() => ({ bidang: "", tahun: "", lamanya: "", penyelenggaraTempat: "", yangMembiayai: "" })}
          onChange={(kursus) => update((f) => { f.pendidikan.kursus = kursus; })}
          renderItem={(item, set) => (
            <>
              <TextField label="Bidang" value={item.bidang} max={LIMITS.name} onChange={(bidang) => set({ ...item, bidang })} />
              <Grid>
                <TextField label="Tahun" value={item.tahun} max={LIMITS.short} onChange={(tahun) => set({ ...item, tahun })} />
                <TextField label="Lamanya" value={item.lamanya} max={LIMITS.short} placeholder="Mis. 3 bulan" onChange={(lamanya) => set({ ...item, lamanya })} />
                <TextField label="Penyelenggara/tempat" value={item.penyelenggaraTempat} max={LIMITS.name} onChange={(penyelenggaraTempat) => set({ ...item, penyelenggaraTempat })} />
                <TextField label="Yang membiayai" value={item.yangMembiayai} max={LIMITS.name} onChange={(yangMembiayai) => set({ ...item, yangMembiayai })} />
              </Grid>
            </>
          )}
        />
      </Section>

      <Section title="Pengalaman Belajar" description="Hal yang paling dan kurang memuaskan selama sekolah." icon={LightBulbIcon}>
        <TextAreaField label="Pengalaman pendidikan yang paling memuaskan" value={p.palingPuas} onChange={(v) => update((f) => { f.pendidikan.palingPuas = v; })} />
        <TextAreaField label="Pengalaman pendidikan yang paling tidak memuaskan" value={p.palingTidakPuas} onChange={(v) => update((f) => { f.pendidikan.palingTidakPuas = v; })} />
      </Section>

      <Section title="Bahasa Asing" description="Nilai: S = Sedang, B = Bagus, BS = Bagus Sekali." icon={LanguageIcon}>
        <RowsField
          label="Bahasa asing yang dikuasai"
          items={p.bahasaAsing}
          max={MAKS_BARIS.bahasaAsing}
          addLabel="Tambah bahasa"
          empty={() => ({ bahasa: "", lisan: null, tertulis: null, keterangan: "" })}
          onChange={(bahasaAsing) => update((f) => { f.pendidikan.bahasaAsing = bahasaAsing; })}
          renderItem={(item, set) => (
            <>
              <TextField label="Bahasa" value={item.bahasa} max={LIMITS.name} onChange={(bahasa) => set({ ...item, bahasa })} />
              <Grid>
                <SelectField label="Lisan" value={item.lisan} options={NILAI} onChange={(lisan) => set({ ...item, lisan })} />
                <SelectField label="Tertulis" value={item.tertulis} options={NILAI} onChange={(tertulis) => set({ ...item, tertulis })} />
              </Grid>
              <TextField label="Keterangan" value={item.keterangan} max={LIMITS.note} onChange={(keterangan) => set({ ...item, keterangan })} />
            </>
          )}
        />
      </Section>
    </div>
  );
}
