"use client";

import { auth } from "@/lib/firebase";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadCompletion } from "../subtests";

export default function ThankYouPage() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let completed = false;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // signOut di bawah memicu callback ini lagi dengan user null; jangan diarahkan ke login.
        if (!completed) router.replace("/login");
        return;
      }

      try {
        const allDone = (await loadCompletion(currentUser.uid)).every(Boolean);
        if (!active) return;
        if (!allDone) {
          router.replace("/test-hub");
          return;
        }
        completed = true;
        setIsVerified(true);
        await signOut(auth).catch(() => undefined);
      } catch (caughtError) {
        console.error(caughtError);
        if (!active) return;
        setError("Status tes belum dapat diperiksa. Periksa koneksi Anda lalu muat ulang halaman ini.");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (!isVerified) {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5">
        {error ? <p role="alert" className="max-w-md text-center text-sm text-red-700">{error}</p> : <p className="text-sm font-medium text-slate-500">Memeriksa status tes...</p>}
      </main>
    );
  }

  return (
    <main className="grid min-h-[calc(100vh-65px)] place-items-center bg-[#f0ede8] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(44,50,60,.10)] sm:p-12">
        <CheckCircleIcon className="mx-auto h-20 w-20 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-primary">Terima Kasih!</h1>
        <p className="mt-5 leading-7 text-slate-600">Jawaban Anda telah berhasil disimpan. Tim HCGA PT Balancia akan menghubungi Anda untuk proses selanjutnya.</p>
        <p className="mt-8 text-sm text-slate-500">Anda dapat menutup halaman ini.</p>
      </section>
    </main>
  );
}
