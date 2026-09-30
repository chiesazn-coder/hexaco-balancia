"use client";

import { HeartIcon, HomeIcon, UserGroupIcon, UserIcon, UsersIcon } from "@heroicons/react/24/outline";
import { LIMITS } from "@/lib/assessment/personal-data";
import { MAKS_BARIS, type HubunganSaudara, type StatusRumah } from "@/lib/types/personalData";
import { ChoiceField, CountField, DateField, Grid, NumberIdField, RowsField, Section, SelectField, TextAreaField, TextField, YaTidakField, fieldError } from "../fields";
import type { StepProps } from "./types";

const HUBUNGAN: { value: HubunganSaudara; label: string }[] = [
  { value: "ayah", label: "Ayah" },
  { value: "kakak", label: "Kakak" },
  { value: "adik", label: "Adik" },
];
const STATUS_RUMAH: { value: StatusRumah; label: string }[] = [
  { value: "rumah_pribadi", label: "Rumah pribadi" },
  { value: "rumah_keluarga_pasangan", label: "Rumah keluarga istri/suami" },
  { value: "rumah_kontrakan", label: "Rumah kontrakan" },
  { value: "pondokan", label: "Pondokan" },
  { value: "rumah_orang_tua", label: "Rumah orang tua" },
];

export default function KeluargaStep({ form, update, issues }: StepProps) {
  const k = form.keluarga;
  const pasangan = k.pasangan;
  return (
    <div className="space-y-6">
      <Section title="Istri/Suami" description="Diisi bila Anda sudah menikah." icon={HeartIcon}>
        {pasangan ? (
          <>
            <TextField label="Nama lengkap" value={pasangan.namaLengkap} max={LIMITS.name} onChange={(v) => update((f) => { f.keluarga.pasangan!.namaLengkap = v; })} />
            <Grid>
              <TextField label="Tempat lahir" value={pasangan.tempatLahir} max={LIMITS.name} onChange={(v) => update((f) => { f.keluarga.pasangan!.tempatLahir = v; })} />
              <DateField label="Tanggal lahir" value={pasangan.tanggalLahir} onChange={(v) => update((f) => { f.keluarga.pasangan!.tanggalLahir = v; })} />
              <TextField label="Pendidikan terakhir" value={pasangan.pendidikanTerakhir} max={LIMITS.name} onChange={(v) => update((f) => { f.keluarga.pasangan!.pendidikanTerakhir = v; })} />
              <TextField label="Pekerjaan" value={pasangan.pekerjaan} max={LIMITS.name} onChange={(v) => update((f) => { f.keluarga.pasangan!.pekerjaan = v; })} />
            </Grid>
          </>
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Terbuka bila status pernikahan di langkah Identitas Diri adalah Menikah.</p>
        )}
      </Section>

      <Section title="Anak-anak" description="Anak kandung, mulai dari yang tertua." icon={UserGroupIcon}>
        <RowsField
          label="Data anak"
          items={k.anak}
          max={MAKS_BARIS.anak}
          addLabel="Tambah anak"
          empty={() => ({ nama: "", tempatLahir: "", tanggalLahir: "", pendidikan: "" })}
          onChange={(anak) => update((f) => { f.keluarga.anak = anak; })}
          renderItem={(item, set) => (
            <>
              <TextField label="Nama" value={item.nama} max={LIMITS.name} onChange={(nama) => set({ ...item, nama })} />
              <Grid>
                <TextField label="Tempat lahir" value={item.tempatLahir} max={LIMITS.name} onChange={(tempatLahir) => set({ ...item, tempatLahir })} />
                <DateField label="Tanggal lahir" value={item.tanggalLahir} onChange={(tanggalLahir) => set({ ...item, tanggalLahir })} />
              </Grid>
              <TextField label="Pendidikan" value={item.pendidikan} max={LIMITS.name} onChange={(pendidikan) => set({ ...item, pendidikan })} />
            </>
          )}
        />
      </Section>

      <Section title="Ibu Kandung" description="Nama dan kontak ibu kandung Anda." icon={UserIcon}>
        <TextField label="Nama lengkap" value={k.ibuKandung.namaLengkap} max={LIMITS.name} onChange={(v) => update((f) => { f.keluarga.ibuKandung.namaLengkap = v; })} />
        <TextAreaField label="Alamat" value={k.ibuKandung.alamat.alamat} max={LIMITS.address} rows={2} onChange={(v) => update((f) => { f.keluarga.ibuKandung.alamat.alamat = v; })} />
        <Grid>
          <NumberIdField label="Kode pos" value={k.ibuKandung.alamat.kodePos} placeholder="5 digit" error={fieldError(issues, "Ibu kandung: kode pos (5 digit)", k.ibuKandung.alamat.kodePos)} onChange={(v) => update((f) => { f.keluarga.ibuKandung.alamat.kodePos = v; })} />
          <NumberIdField label="Nomor telepon" tel value={k.ibuKandung.noTelepon} placeholder="Opsional" error={fieldError(issues, "Ibu kandung: nomor telepon", k.ibuKandung.noTelepon)} onChange={(v) => update((f) => { f.keluarga.ibuKandung.noTelepon = v; })} />
        </Grid>
      </Section>

      <Section title="Ayah & Saudara Kandung" description="Ayah, kakak, dan adik kandung Anda." icon={UsersIcon}>
        <RowsField
          label="Anggota keluarga"
          items={k.keluarga}
          max={MAKS_BARIS.keluarga}
          addLabel="Tambah anggota keluarga"
          empty={() => ({ nama: "", hubungan: null, umur: null, pekerjaanPendidikan: "" })}
          onChange={(keluarga) => update((f) => { f.keluarga.keluarga = keluarga; })}
          renderItem={(item, set) => (
            <>
              <TextField label="Nama" value={item.nama} max={LIMITS.name} onChange={(nama) => set({ ...item, nama })} />
              <Grid>
                <SelectField label="Hubungan" value={item.hubungan} options={HUBUNGAN} onChange={(hubungan) => set({ ...item, hubungan })} />
                <CountField label="Umur" value={item.umur} max={120} suffix="tahun" onChange={(umur) => set({ ...item, umur })} />
              </Grid>
              <TextField label="Pekerjaan/Pendidikan" value={item.pekerjaanPendidikan} max={LIMITS.name} onChange={(pekerjaanPendidikan) => set({ ...item, pekerjaanPendidikan })} />
            </>
          )}
        />
      </Section>

      <Section title="Lingkungan" description="Bantuan, tanggungan, dan tempat tinggal saat ini." icon={HomeIcon}>
        <ChoiceField
          label="Apakah Saudara masih mendapat bantuan?"
          value={k.masihMendapatBantuan.ya}
          options={[{ value: true, label: "Ya" }, { value: false, label: "Tidak" }]}
          onChange={(ya) => update((f) => {
            f.keluarga.masihMendapatBantuan = ya ? { ...f.keluarga.masihMendapatBantuan, ya } : { ya, dariSiapa: "", bentukDanJumlah: "" };
          })}
        />
        {k.masihMendapatBantuan.ya === true && (
          <>
            <TextField label="Dari siapa" value={k.masihMendapatBantuan.dariSiapa} max={LIMITS.name} onChange={(v) => update((f) => { f.keluarga.masihMendapatBantuan.dariSiapa = v; })} />
            <TextAreaField label="Bentuk dan jumlahnya" value={k.masihMendapatBantuan.bentukDanJumlah} max={LIMITS.note} rows={2} onChange={(v) => update((f) => { f.keluarga.masihMendapatBantuan.bentukDanJumlah = v; })} />
          </>
        )}
        <YaTidakField
          label="Apakah Saudara mempunyai tanggungan lain, selain istri/suami/anak sendiri?"
          detailLabel="Untuk siapa dan berapa besarnya"
          value={k.tanggunganLain}
          onChange={(v) => update((f) => { f.keluarga.tanggunganLain = v; })}
        />
        <YaTidakField
          label="Apakah Saudara pernah meninggalkan keluarga?"
          detailLabel="Untuk keperluan apa dan berapa lama"
          value={k.pernahMeninggalkanKeluarga}
          onChange={(v) => update((f) => { f.keluarga.pernahMeninggalkanKeluarga = v; })}
        />
        <ChoiceField label="Status rumah yang Saudara tempati saat ini" value={k.statusRumah} options={STATUS_RUMAH} onChange={(v) => update((f) => { f.keluarga.statusRumah = v; })} />
      </Section>
    </div>
  );
}
