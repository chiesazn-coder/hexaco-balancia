"use client";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useId, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { DATE_PLACEHOLDER, displayToIso, formatDateTyping, isoToDisplay } from "@/lib/assessment/date-input";
import { LIMITS } from "@/lib/assessment/personal-data";
import type { YaTidak } from "@/lib/types/personalData";

// Ukuran teks 16px pada input mencegah iOS memperbesar halaman saat kolom disentuh.
// Abu-abu hanya untuk kolom terkunci: atribut [readonly], bukan :read-only (yang juga mengenai <select>).
const inputBase =
  "w-full rounded-xl border bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100 [&[readonly]]:bg-slate-100 [&[readonly]]:text-slate-600";
const inputBorder = (error?: string) => (error ? " border-red-400" : " border-slate-300");

// Pesan galat untuk kolom yang tercantum di daftar kesalahan (setelah "Kirim" pertama).
// Kolom kosong berarti wajib diisi; selain itu formatnya belum sesuai (keterangan dalam kurung diambil dari label).
export function fieldError(issueLabels: readonly string[], label: string, value: string | boolean) {
  if (!issueLabels.includes(label)) return undefined;
  if (value === false) return "Wajib dicentang.";
  if (value === "") return "Wajib diisi.";
  const detail = /\(([^)]+)\)/.exec(label)?.[1];
  return detail ? "Belum sesuai (" + detail + ")." : "Belum sesuai.";
}

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function Section({ title, description, icon: IconComponent, children }: { title: string; description: string; icon: Icon; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_32px_rgba(15,23,42,.05)] sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">
          <IconComponent className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-6 text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

// Dua kolom di desktop (>= 1024px), satu kolom di layar sempit.
export const Grid = ({ children }: { children: ReactNode }) => <div className="grid gap-x-6 gap-y-5 lg:grid-cols-2">{children}</div>;

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <span className="text-sm font-semibold text-slate-800">
      {text}
      {required && <span className="text-red-600" aria-hidden="true"> *</span>}
    </span>
  );
}

function Help({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  if (error) return <span id={id} className="mt-1.5 block text-sm font-medium text-red-600">{error}</span>;
  if (hint) return <span id={id} className="mt-1.5 block text-sm text-slate-500">{hint}</span>;
  return null;
}

type TextProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  required?: boolean;
  readOnly?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  inputMode?: "text" | "numeric" | "tel" | "email";
  list?: string;
};

export function TextField({ label, value, onChange, max, required, readOnly, hint, error, placeholder, type = "text", inputMode, list }: TextProps) {
  const helpId = useId();
  return (
    <label className="block">
      <Label text={label} required={required} />
      <span className="relative block">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={max}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
          inputMode={inputMode}
          list={list}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? helpId : undefined}
          className={"mt-2 h-12 " + inputBase + inputBorder(error) + (list ? " pr-11 [&::-webkit-calendar-picker-indicator]:hidden" : "")}
        />
        {/* Kolom dengan saran (datalist) tampil seperti dropdown, tetapi tetap boleh diketik bebas. */}
        {list && <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 mt-1 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />}
      </span>
      <Help id={helpId} hint={hint} error={error} />
    </label>
  );
}

// Nomor identitas/telepon: keyboard angka; spasi, titik, dan tanda hubung boleh diketik (dibuang saat disimpan).
export function NumberIdField(props: Omit<TextProps, "max" | "inputMode" | "type"> & { tel?: boolean }) {
  const { tel, ...rest } = props;
  return <TextField {...rest} max={LIMITS.numberInput} type={tel ? "tel" : "text"} inputMode={tel ? "tel" : "numeric"} />;
}

export function TextAreaField({ label, value, onChange, max = LIMITS.answer, required, hint, error, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (value: string) => void; max?: number; required?: boolean; hint?: string; error?: string; placeholder?: string; rows?: number;
}) {
  const helpId = useId();
  return (
    <label className="block">
      <Label text={label} required={required} />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={helpId}
        className={"mt-2 resize-y py-3 leading-6 " + inputBase + inputBorder(error)}
      />
      <span id={helpId} className="mt-1.5 flex justify-between gap-3 text-sm">
        <span className={error ? "font-medium text-red-600" : "text-slate-500"}>{error ?? hint}</span>
        <span className={"shrink-0 text-xs " + (value.length >= max ? "font-semibold text-red-600" : "text-slate-400")}>{value.length + " / " + max}</span>
      </span>
    </label>
  );
}

// Tanggal diketik HH/BB/TTTT (garis miring otomatis) atau dipilih dari kalender bawaan browser; disimpan YYYY-MM-DD.
// Teks yang belum menjadi tanggal sah tidak disimpan (nilai tersimpan "") dan diberi pesan di bawah kolom.
export function DateField({ label, value, onChange, required, readOnly, hint, error }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; readOnly?: boolean; hint?: string; error?: string;
}) {
  const inputId = useId();
  const helpId = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => isoToDisplay(value));
  const [left, setLeft] = useState(false);
  // Nilai berubah dari luar (kalender, pilihan lain yang mengosongkan tanggal): samakan teks yang tampil.
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    if ((displayToIso(text) ?? "") !== value) setText(isoToDisplay(value));
  }

  function type(raw: string) {
    const next = formatDateTyping(raw);
    setText(next);
    setLeft(false);
    const iso = displayToIso(next) ?? "";
    setShownValue(iso);
    if (iso !== value) onChange(iso);
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker || readOnly) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
      picker.click();
    }
  }

  const invalid = text !== "" && displayToIso(text) === null && (left || text.length >= 10);
  const shownError = invalid ? "Tanggal tidak valid. Gunakan format " + DATE_PLACEHOLDER + ", mis. 12/03/1999." : error;
  return (
    <div>
      <label htmlFor={inputId}><Label text={label} required={required} /></label>
      <div className="relative mt-2">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(event) => type(event.target.value)}
          onBlur={() => {
            setLeft(true);
            const iso = displayToIso(text);
            if (iso) setText(isoToDisplay(iso));
          }}
          placeholder={DATE_PLACEHOLDER}
          maxLength={10}
          readOnly={readOnly}
          required={required}
          autoComplete="off"
          aria-invalid={shownError ? true : undefined}
          aria-describedby={hint || shownError ? helpId : undefined}
          className={"h-12 pr-12 " + inputBase + inputBorder(shownError)}
        />
        {/* Input tanggal bawaan hanya untuk membuka kalender; menempati posisi kolom agar kalender muncul di dekatnya. */}
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          onChange={(event) => {
            setText(isoToDisplay(event.target.value));
            setShownValue(event.target.value);
            onChange(event.target.value);
          }}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={readOnly}
          aria-label={"Buka kalender " + label.toLowerCase()}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-40"
        >
          <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <Help id={helpId} hint={hint} error={shownError} />
    </div>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, required, error, placeholder = "Pilih" }: {
  label: string; value: T | null | ""; onChange: (value: T | null) => void; options: readonly { value: T; label: string }[]; required?: boolean; error?: string; placeholder?: string;
}) {
  const helpId = useId();
  return (
    <label className="block">
      <Label text={label} required={required} />
      <span className="relative block">
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value === "" ? null : (event.target.value as T))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? helpId : undefined}
          className={"mt-2 h-12 appearance-none pr-11 " + inputBase + inputBorder(error) + (value ? "" : " text-slate-400")}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => <option key={option.value} value={option.value} className="text-slate-900">{option.label}</option>)}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 mt-1 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      </span>
      <Help id={helpId} error={error} />
    </label>
  );
}

// Pilihan tunggal berbentuk tombol (radio) agar mudah disentuh di HP.
// 2–3 pilihan: kontrol bersegmen selebar kolom; lebih dari itu: tombol-tombol yang membungkus ke baris berikutnya.
export function ChoiceField<T extends string | boolean>({ label, value, onChange, options, required, error }: {
  label: string; value: T | null; onChange: (value: T) => void; options: readonly { value: T; label: string }[]; required?: boolean; error?: string;
}) {
  const helpId = useId();
  const segmented = options.length <= 3;
  return (
    <fieldset aria-describedby={error ? helpId : undefined}>
      <legend><Label text={label} required={required} /></legend>
      <div
        role="radiogroup"
        className={segmented
          ? "mt-2 grid auto-cols-fr grid-flow-col gap-1 rounded-xl border bg-white p-1" + inputBorder(error)
          : "mt-2 flex flex-wrap gap-2"}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={segmented
                ? "min-h-10 rounded-lg px-3 py-2 text-base font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 " + (selected ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-slate-50")
                : "min-h-12 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 " + (selected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <Help id={helpId} error={error} />
    </fieldset>
  );
}

const YA_TIDAK = [{ value: true, label: "Ya" }, { value: false, label: "Tidak" }] as const;

// Pertanyaan Ya/Tidak dengan keterangan. `detailWhen` menentukan jawaban yang memunculkan keterangan;
// keterangan dikosongkan bila jawaban berubah ke pilihan yang tidak memerlukannya.
export function YaTidakField({ label, value, onChange, detailLabel, detailWhen = true }: {
  label: string; value: YaTidak; onChange: (value: YaTidak) => void; detailLabel: string; detailWhen?: boolean;
}) {
  return (
    <div className="space-y-4">
      <ChoiceField label={label} value={value.ya} options={YA_TIDAK} onChange={(ya) => onChange({ ya, keterangan: ya === detailWhen ? value.keterangan : "" })} />
      {value.ya === detailWhen && (
        <TextAreaField label={detailLabel} value={value.keterangan} max={LIMITS.note} rows={2} onChange={(keterangan) => onChange({ ...value, keterangan })} />
      )}
    </div>
  );
}

// Kolom angka dengan kotak satuan menempel (Rp di depan, satuan di belakang).
function AddonInput({ value, onChange, prefix, suffix, placeholder }: {
  value: string; onChange: (raw: string) => void; prefix?: string; suffix?: string; placeholder?: string;
}) {
  const addon = "flex shrink-0 items-center bg-white px-4 text-sm font-medium text-slate-500";
  return (
    <span className="mt-2 flex h-12 overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-primary focus-within:ring-4 focus-within:ring-blue-100">
      {prefix && <span className={addon + " border-r border-slate-300"}>{prefix}</span>}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent px-4 text-base text-slate-900 outline-none placeholder:text-slate-400"
      />
      {suffix && <span className={addon + " border-l border-slate-300"}>{suffix}</span>}
    </span>
  );
}

const MAX_MONEY = 1_000_000_000_000;
const rupiah = new Intl.NumberFormat("id-ID");

// Nominal rupiah: ditampilkan dengan pemisah ribuan, disimpan sebagai angka.
export function MoneyField({ label, value, onChange, suffix }: { label: string; value: number | null; onChange: (value: number | null) => void; suffix?: string }) {
  return (
    <label className="block">
      <Label text={label} />
      <AddonInput
        prefix="Rp"
        suffix={suffix}
        placeholder="0"
        value={value === null ? "" : rupiah.format(value)}
        onChange={(raw) => {
          const digits = raw.replace(/\D/g, "").slice(0, 13);
          onChange(digits === "" ? null : Math.min(Number(digits), MAX_MONEY));
        }}
      />
    </label>
  );
}

// Bilangan bulat kecil (umur, jumlah bawahan).
export function CountField({ label, value, onChange, max, suffix }: { label: string; value: number | null; onChange: (value: number | null) => void; max: number; suffix?: string }) {
  return (
    <label className="block">
      <Label text={label} />
      <AddonInput
        suffix={suffix}
        placeholder="0"
        value={value === null ? "" : String(value)}
        onChange={(raw) => {
          const digits = raw.replace(/\D/g, "").slice(0, String(max).length);
          onChange(digits === "" ? null : Math.min(Number(digits), max));
        }}
      />
    </label>
  );
}

// Tabel baris dinamis (anak, keluarga, kursus, dll.) sebagai kartu bertumpuk agar nyaman di HP.
export function RowsField<T>({ label, description, items, max, addLabel, empty, onChange, renderItem }: {
  label: string; description?: string; items: T[]; max: number; addLabel: string; empty: () => T;
  onChange: (items: T[]) => void; renderItem: (item: T, update: (item: T) => void, index: number) => ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {description && <p className="mt-0.5 text-sm leading-5 text-slate-500">{description}</p>}
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{"Baris " + (index + 1)}</p>
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">Hapus</button>
            </div>
            <div className="space-y-5">{renderItem(item, (next) => onChange(items.map((current, i) => (i === index ? next : current))), index)}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, empty()])}
        disabled={items.length >= max}
        className="mt-3 h-12 w-full rounded-xl border-2 border-dashed border-slate-300 px-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:border-slate-300 disabled:hover:bg-transparent"
      >
        {items.length >= max ? "Maksimal " + max + " baris" : "+ " + addLabel}
      </button>
    </div>
  );
}
