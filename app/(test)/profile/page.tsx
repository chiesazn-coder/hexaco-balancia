"use client";

import { auth, db } from "@/lib/firebase";
import { UserIcon } from "@heroicons/react/24/outline";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "hexacoCandidates", currentUser.uid));
        if (!active) return;
        const nama = snapshot.exists() ? snapshot.data().nama : undefined;
        if (typeof nama === "string" && nama.trim()) {
          router.replace("/test");
          return;
        }
        setUser(currentUser);
        setIsChecking(false);
      } catch {
        if (!active) return;
        setUser(currentUser);
        setError("Data peserta belum dapat diperiksa. Silakan coba kembali.");
        setIsChecking(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.replace("/login");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setError("");
    setIsSaving(true);
    try {
      await setDoc(doc(db, "hexacoCandidates", user.uid), {
        nama: String(formData.get("nama") ?? "").trim(),
        pendidikan: String(formData.get("pendidikan") ?? ""),
        tanggalLahir: String(formData.get("tanggalLahir") ?? ""),
        email: user.email,
        hasSubmitted: false,
        createdAt: serverTimestamp(),
      }, { merge: true });
      router.replace("/test");
    } catch {
      setError("Data diri gagal disimpan. Periksa koneksi Anda lalu coba kembali.");
      setIsSaving(false);
    }
  }

  if (isChecking) {
    return <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5"><p className="text-sm font-medium text-slate-500">Memeriksa data peserta...</p></main>;
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10 sm:py-14">
      <div className="rounded-3xl bg-white p-7 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-10">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-primary"><UserIcon className="h-6 w-6" aria-hidden="true" /></div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-primary">Data Diri Peserta</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Lengkapi informasi berikut sebelum melanjutkan ke asesmen.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="nama" className="mb-2 block text-sm font-semibold text-slate-700">Nama Lengkap</label>
            <input id="nama" name="nama" type="text" autoComplete="name" required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100" />
          </div>
          <div>
            <label htmlFor="pendidikan" className="mb-2 block text-sm font-semibold text-slate-700">Pendidikan Terakhir</label>
            <select id="pendidikan" name="pendidikan" required defaultValue="" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100">
              <option value="" disabled>Pilih pendidikan terakhir</option>
              <option value="SMA/SMK">SMA/SMK</option><option value="D3">D3</option><option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option>
            </select>
          </div>
          <div>
            <label htmlFor="tanggalLahir" className="mb-2 block text-sm font-semibold text-slate-700">Tanggal Lahir</label>
            <input id="tanggalLahir" name="tanggalLahir" type="date" autoComplete="bday" required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100" />
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={isSaving} className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-[#052f68] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? "Menyimpan..." : "Lanjut ke Tes"}
          </button>
        </form>
      </div>
    </main>
  );
}
