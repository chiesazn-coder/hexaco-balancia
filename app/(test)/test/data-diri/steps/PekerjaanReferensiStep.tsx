"use client";

import { BriefcaseIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { LIMITS } from "@/lib/assessment/personal-data";
import { MAKS_BARIS } from "@/lib/types/personalData";
import { CountField, Grid, MoneyField, RowsField, Section, TextAreaField, TextField, YaTidakField } from "../fields";
import type { StepProps } from "./types";

export function PekerjaanStep({ form, update }: StepProps) {
  const p = form.pekerjaan;
  return (
    <div className="space-y-6">
      <Section title="Pengalaman Kerja" description="Mulai dari pekerjaan terakhir. Lewati bila belum pernah bekerja." icon={BriefcaseIcon}>
        <RowsField
          label="Riwayat pekerjaan"
          items={p.pengalaman}
          max={MAKS_BARIS.pengalaman}
          addLabel="Tambah pengalaman kerja"
          empty={() => ({ namaPerusahaan: "", dariTahun: "", sampaiTahun: "", jabatanTerakhir: "", gaji: null, alasanBerhenti: "" })}
          onChange={(pengalaman) => update((f) => { f.pekerjaan.pengalaman = pengalaman; })}
          renderItem={(item, set) => (
            <>
              <TextField label="Nama perusahaan" value={item.namaPerusahaan} max={LIMITS.name} onChange={(namaPerusahaan) => set({ ...item, namaPerusahaan })} />
              <Grid>
                <TextField label="Dari tahun" value={item.dariTahun} max={LIMITS.short} inputMode="numeric" onChange={(dariTahun) => set({ ...item, dariTahun })} />
                <TextField label="Sampai tahun" value={item.sampaiTahun} max={LIMITS.short} placeholder="Mis. 2024 atau Sekarang" onChange={(sampaiTahun) => set({ ...item, sampaiTahun })} />
                <TextField label="Jabatan terakhir" value={item.jabatanTerakhir} max={LIMITS.name} onChange={(jabatanTerakhir) => set({ ...item, jabatanTerakhir })} />
                <MoneyField label="Gaji terakhir" suffix="/ bulan" value={item.gaji} onChange={(gaji) => set({ ...item, gaji })} />
              </Grid>
              <TextAreaField label="Alasan berhenti" value={item.alasanBerhenti} max={LIMITS.note} rows={2} onChange={(alasanBerhenti) => set({ ...item, alasanBerhenti })} />
            </>
          )}
        />
      </Section>

      <Section title="Tugas & Tanggung Jawab" description="Peran Anda di pekerjaan terakhir." icon={ClipboardDocumentListIcon}>
        <TextAreaField label="Uraian tugas pada pekerjaan terakhir" value={p.uraianTugas} rows={4} onChange={(v) => update((f) => { f.pekerjaan.uraianTugas = v; })} />
        <CountField label="Jumlah bawahan" value={p.jumlahBawahan} max={100_000} suffix="orang" onChange={(v) => update((f) => { f.pekerjaan.jumlahBawahan = v; })} />
        <YaTidakField
          label="Apakah Saudara pernah membuat perubahan/perbaikan di tempat kerja?"
          detailLabel="Jelaskan perubahan yang dibuat"
          value={p.pernahMembuatPerubahan}
          onChange={(v) => update((f) => { f.pekerjaan.pernahMembuatPerubahan = v; })}
        />
      </Section>
    </div>
  );
}

export function ReferensiStep({ form, update }: StepProps) {
  return (
    <Section title="Referensi" description="Orang yang dapat memberi keterangan tentang Anda, bukan keluarga." icon={ChatBubbleLeftRightIcon}>
      <RowsField
        label="Daftar referensi"
        items={form.referensi}
        max={MAKS_BARIS.referensi}
        addLabel="Tambah referensi"
        empty={() => ({ nama: "", jabatan: "", alamat: "" })}
        onChange={(referensi) => update((f) => { f.referensi = referensi; })}
        renderItem={(item, set) => (
          <>
            <Grid>
              <TextField label="Nama" value={item.nama} max={LIMITS.name} onChange={(nama) => set({ ...item, nama })} />
              <TextField label="Jabatan" value={item.jabatan} max={LIMITS.name} onChange={(jabatan) => set({ ...item, jabatan })} />
            </Grid>
            <TextAreaField label="Alamat/kontak" value={item.alamat} max={LIMITS.address} rows={2} onChange={(alamat) => set({ ...item, alamat })} />
          </>
        )}
      />
    </Section>
  );
}
