"use client";

import { DocumentCheckIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { isoToDisplay } from "@/lib/assessment/date-input";
import { LIMITS } from "@/lib/assessment/personal-data";
import { Grid, Section, TextAreaField, TextField, YaTidakField, fieldError } from "../fields";
import type { StepProps } from "./types";

const DECLARATION =
  "Dengan ini saya menyatakan bahwa data pribadi ini sah dan dapat dipertanggungjawabkan. Apabila terdapat pemalsuan atau manipulasi data, hal tersebut dikategorikan sebagai pelanggaran berat yang dapat berakibat pemutusan hubungan kerja sesuai peraturan perusahaan.";
const CONSENT_TRUTH = "Saya menyatakan data yang saya isi benar dan dapat dipertanggungjawabkan.";
const CONSENT_PDP =
  "Saya menyetujui PT Balancia Sukses Mendunia memproses data pribadi saya untuk keperluan rekrutmen dan administrasi kepegawaian, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.";

function Consent({ checked, onChange, text, error }: { checked: boolean; onChange: (checked: boolean) => void; text: string; error?: string }) {
  return (
    <div>
      <label className={"flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 text-slate-700 transition " + (error ? "border-red-400" : checked ? "border-primary bg-blue-50/50" : "border-slate-300 hover:border-primary")}>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-invalid={error ? true : undefined} className="mt-1 h-5 w-5 shrink-0 accent-[#063b82]" />
        <span>{text}<span className="text-red-600" aria-hidden="true"> *</span></span>
      </label>
      {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function LainLainStep({ form, update, issues }: StepProps) {
  const l = form.lainLain;
  const p = form.pernyataan;
  return (
    <div className="space-y-6">
      <Section title="Kesehatan & Reputasi" description="Riwayat kesehatan Anda dan keluarga." icon={ShieldCheckIcon}>
        <YaTidakField
          label="Apakah Saudara pernah sakit keras/dirawat di rumah sakit?"
          detailLabel="Sakit apa dan kapan"
          value={l.pernahSakitKeras}
          onChange={(v) => update((f) => { f.lainLain.pernahSakitKeras = v; })}
        />
        <TextAreaField label="Gangguan jasmani yang dimiliki (bila ada)" value={l.gangguanJasmani} rows={2} onChange={(v) => update((f) => { f.lainLain.gangguanJasmani = v; })} />
        <YaTidakField
          label="Apakah kesehatan keluarga Saudara dalam keadaan baik?"
          detailLabel="Keterangan bila tidak"
          detailWhen={false}
          value={l.kesehatanKeluargaBaik}
          onChange={(v) => update((f) => { f.lainLain.kesehatanKeluargaBaik = v; })}
        />
        <TextAreaField label="Bagaimana reputasi Saudara di lingkungan tempat tinggal/kerja?" value={l.reputasi} rows={2} onChange={(v) => update((f) => { f.lainLain.reputasi = v; })} />
      </Section>

      <Section title="Pernyataan" description="Baca, lalu centang kedua pernyataan sebelum mengirim." icon={DocumentCheckIcon}>
        <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{DECLARATION}</p>
        <Consent checked={p.setujuKebenaranData} text={CONSENT_TRUTH} error={fieldError(issues, "Pernyataan kebenaran data", p.setujuKebenaranData)} onChange={(v) => update((f) => { f.pernyataan.setujuKebenaranData = v; })} />
        <Consent checked={p.setujuPemrosesanData} text={CONSENT_PDP} error={fieldError(issues, "Persetujuan pemrosesan data pribadi", p.setujuPemrosesanData)} onChange={(v) => update((f) => { f.pernyataan.setujuPemrosesanData = v; })} />
        <TextField label="Nama jelas" required value={p.namaJelas} max={LIMITS.fullName} placeholder="Sesuai KTP" error={fieldError(issues, "Nama jelas", p.namaJelas.trim())} onChange={(v) => update((f) => { f.pernyataan.namaJelas = v; })} />
        <Grid>
          <TextField label="Kota" value={p.kota} max={LIMITS.short} onChange={(v) => update((f) => { f.pernyataan.kota = v; })} />
          <TextField label="Tanggal" readOnly value={isoToDisplay(p.tanggal)} max={10} hint="Diisi otomatis saat formulir dikirim." onChange={() => undefined} />
        </Grid>
      </Section>
    </div>
  );
}
