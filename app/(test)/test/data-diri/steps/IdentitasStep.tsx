"use client";

import { IdentificationIcon, MapPinIcon, PhoneIcon, UserIcon } from "@heroicons/react/24/outline";
import { LIMITS } from "@/lib/assessment/personal-data";
import type { StatusPerkawinan } from "@/lib/types/personalData";
import { ChoiceField, DateField, Grid, NumberIdField, Section, SelectField, TextAreaField, TextField, fieldError } from "../fields";
import type { StepProps } from "./types";

const AGAMA = ["Islam", "Kristen Protestan", "Katolik", "Hindu", "Buddha", "Konghucu"];
const GOLONGAN_DARAH = ["A", "B", "AB", "O", "Tidak tahu"].map((value) => ({ value, label: value }));
const STATUS: { value: StatusPerkawinan; label: string }[] = [
  { value: "bujangan", label: "Bujangan" },
  { value: "menikah", label: "Menikah" },
  { value: "duda_janda", label: "Duda/Janda" },
];
const SEUMUR_HIDUP = "Seumur Hidup";

export default function IdentitasStep({ form, update, issues }: StepProps) {
  const i = form.identitas;
  const k = i.kontakDarurat;
  const err = (label: string, value: string | boolean) => fieldError(issues, label, value);
  return (
    <div className="space-y-6">
      <Section title="Informasi Pribadi" description="Data dasar sesuai dokumen resmi." icon={UserIcon}>
        <TextField
          label="Nama lengkap"
          required
          value={i.namaLengkap}
          max={LIMITS.fullName}
          placeholder="Sesuai KTP, tanpa gelar"
          hint="Terisi dari profil Anda. Tulis gelar di langkah Pendidikan."
          error={err("Nama lengkap", i.namaLengkap.trim())}
          onChange={(v) => update((f) => { f.identitas.namaLengkap = v; })}
        />
        <Grid>
          <TextField label="Nama panggilan" value={i.namaPanggilan} max={LIMITS.name} placeholder="Opsional" onChange={(v) => update((f) => { f.identitas.namaPanggilan = v; })} />
          <ChoiceField
            label="Jenis kelamin"
            required
            value={i.jenisKelamin}
            options={[{ value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }]}
            error={err("Jenis kelamin", i.jenisKelamin ?? "")}
            onChange={(v) => update((f) => { f.identitas.jenisKelamin = v; })}
          />
          <TextField
            label="Tempat lahir"
            required
            value={i.tempatLahir}
            max={LIMITS.name}
            placeholder="Kota atau kabupaten"
            error={err("Tempat lahir", i.tempatLahir.trim())}
            onChange={(v) => update((f) => { f.identitas.tempatLahir = v; })}
          />
          <DateField
            label="Tanggal lahir"
            required
            value={i.tanggalLahir}
            error={err("Tanggal lahir (usia 15–70 tahun)", i.tanggalLahir)}
            onChange={(v) => update((f) => { f.identitas.tanggalLahir = v; })}
          />
          <TextField label="Agama" value={i.agama} max={LIMITS.short} list="daftar-agama" placeholder="Pilih atau ketik agama" onChange={(v) => update((f) => { f.identitas.agama = v; })} />
          <SelectField
            label="Status pernikahan"
            value={i.statusPerkawinan}
            options={STATUS}
            placeholder="Pilih status"
            onChange={(v) => update((f) => {
              f.identitas.statusPerkawinan = v;
              // Tanggal menikah dan data pasangan hanya berlaku bila menikah.
              if (v === "menikah") {
                f.keluarga.pasangan ??= { namaLengkap: "", tempatLahir: "", tanggalLahir: "", pendidikanTerakhir: "", pekerjaan: "" };
              } else {
                f.identitas.tanggalMenikah = "";
                f.keluarga.pasangan = null;
              }
            })}
          />
          <SelectField label="Golongan darah" value={i.golonganDarah} options={GOLONGAN_DARAH} onChange={(v) => update((f) => { f.identitas.golonganDarah = v ?? ""; })} />
          {i.statusPerkawinan === "menikah" && (
            <DateField
              label="Tanggal menikah"
              value={i.tanggalMenikah}
              hint="Data pasangan diisi di langkah Keluarga."
              error={err("Tanggal menikah", i.tanggalMenikah)}
              onChange={(v) => update((f) => { f.identitas.tanggalMenikah = v; })}
            />
          )}
        </Grid>
        <datalist id="daftar-agama">{AGAMA.map((agama) => <option key={agama} value={agama} />)}</datalist>
      </Section>

      <Section title="Alamat & Kontak" description="Tempat tinggal tetap dan nomor yang aktif." icon={MapPinIcon}>
        <TextAreaField
          label="Alamat tetap"
          required
          value={i.alamatTetap.alamat}
          max={LIMITS.address}
          rows={2}
          placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota"
          error={err("Alamat tetap (minimal 5 karakter)", i.alamatTetap.alamat.trim())}
          onChange={(v) => update((f) => { f.identitas.alamatTetap.alamat = v; })}
        />
        <Grid>
          <NumberIdField label="Kode pos" value={i.alamatTetap.kodePos} placeholder="5 digit" error={err("Kode pos (5 digit)", i.alamatTetap.kodePos)} onChange={(v) => update((f) => { f.identitas.alamatTetap.kodePos = v; })} />
          <NumberIdField label="Nomor telepon rumah" tel value={i.teleponRumah} placeholder="Opsional" error={err("Nomor telepon rumah", i.teleponRumah)} onChange={(v) => update((f) => { f.identitas.teleponRumah = v; })} />
          <NumberIdField label="Nomor handphone" required tel value={i.noHandphone} placeholder="08xx atau +62" error={err("Nomor handphone (10–15 digit)", i.noHandphone)} onChange={(v) => update((f) => { f.identitas.noHandphone = v; })} />
          <TextField label="Email" required type="email" readOnly value={i.email} max={LIMITS.email} hint="Sesuai akun yang dipakai login." error={err("Email", i.email)} onChange={() => undefined} />
        </Grid>
      </Section>

      <Section title="Dokumen" description="Nomor boleh diketik dengan spasi, titik, atau tanda hubung." icon={IdentificationIcon}>
        <Grid>
          <NumberIdField label="Nomor KTP (NIK)" required value={i.noKtp} placeholder="16 digit" error={err("Nomor KTP/NIK (16 digit)", i.noKtp)} onChange={(v) => update((f) => { f.identitas.noKtp = v; })} />
          <div>
            {i.masaBerlakuKtp === SEUMUR_HIDUP ? (
              <>
                <span className="text-sm font-semibold text-slate-800">Masa berlaku KTP</span>
                <p className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-base text-slate-600">Seumur hidup</p>
              </>
            ) : (
              <DateField label="Masa berlaku KTP" value={i.masaBerlakuKtp} error={err("Masa berlaku KTP", i.masaBerlakuKtp)} onChange={(v) => update((f) => { f.identitas.masaBerlakuKtp = v; })} />
            )}
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={i.masaBerlakuKtp === SEUMUR_HIDUP}
                onChange={(event) => update((f) => { f.identitas.masaBerlakuKtp = event.target.checked ? SEUMUR_HIDUP : ""; })}
                className="h-4 w-4 accent-[#063b82]"
              />
              KTP berlaku seumur hidup
            </label>
          </div>
          <NumberIdField label="Nomor NPWP" value={i.noNpwp} placeholder="15 atau 16 digit" error={err("Nomor NPWP (15 atau 16 digit)", i.noNpwp)} onChange={(v) => update((f) => { f.identitas.noNpwp = v; })} />
          <NumberIdField label="Nomor BPJS Ketenagakerjaan" value={i.noBpjsKetenagakerjaan} placeholder="Opsional" error={err("Nomor BPJS Ketenagakerjaan (8–16 digit)", i.noBpjsKetenagakerjaan)} onChange={(v) => update((f) => { f.identitas.noBpjsKetenagakerjaan = v; })} />
          <NumberIdField label="Nomor BPJS Kesehatan" value={i.noBpjsKesehatan} placeholder="Opsional" error={err("Nomor BPJS Kesehatan (8–16 digit)", i.noBpjsKesehatan)} onChange={(v) => update((f) => { f.identitas.noBpjsKesehatan = v; })} />
          <NumberIdField label="Nomor SIM" value={i.noSim} placeholder="Opsional" error={err("Nomor SIM (5–20 digit)", i.noSim)} onChange={(v) => update((f) => { f.identitas.noSim = v; })} />
          <TextField label="Jenis SIM" value={i.jenisSim} max={LIMITS.short} placeholder="Mis. A, C" onChange={(v) => update((f) => { f.identitas.jenisSim = v; })} />
        </Grid>
      </Section>

      <Section title="Kontak Darurat" description="Orang yang dapat dihubungi bila terjadi keadaan darurat." icon={PhoneIcon}>
        <Grid>
          <TextField label="Nama lengkap" required value={k.namaLengkap} max={LIMITS.name} error={err("Kontak darurat: nama lengkap", k.namaLengkap.trim())} onChange={(v) => update((f) => { f.identitas.kontakDarurat.namaLengkap = v; })} />
          <TextField label="Hubungan keluarga" required value={k.hubunganKeluarga} max={LIMITS.name} placeholder="Mis. Ibu, Kakak" error={err("Kontak darurat: hubungan keluarga", k.hubunganKeluarga.trim())} onChange={(v) => update((f) => { f.identitas.kontakDarurat.hubunganKeluarga = v; })} />
        </Grid>
        <TextAreaField label="Alamat tetap" value={k.alamatTetap.alamat} max={LIMITS.address} rows={2} onChange={(v) => update((f) => { f.identitas.kontakDarurat.alamatTetap.alamat = v; })} />
        <Grid>
          <NumberIdField label="Kode pos" value={k.alamatTetap.kodePos} placeholder="5 digit" error={err("Kontak darurat: kode pos (5 digit)", k.alamatTetap.kodePos)} onChange={(v) => update((f) => { f.identitas.kontakDarurat.alamatTetap.kodePos = v; })} />
          <NumberIdField label="Nomor telepon rumah" tel value={k.teleponRumah} placeholder="Opsional" error={err("Kontak darurat: nomor telepon rumah", k.teleponRumah)} onChange={(v) => update((f) => { f.identitas.kontakDarurat.teleponRumah = v; })} />
          <NumberIdField label="Nomor handphone" required tel value={k.noHandphone} placeholder="08xx atau +62" error={err("Kontak darurat: nomor handphone (10–15 digit)", k.noHandphone)} onChange={(v) => update((f) => { f.identitas.kontakDarurat.noHandphone = v; })} />
        </Grid>
      </Section>
    </div>
  );
}
