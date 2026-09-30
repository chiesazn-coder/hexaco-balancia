"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDocFromServer as getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSubmittedMs, runThankYouCheck } from "@/lib/assessment/thankyou";
import { isCompletedSession } from "@/lib/assessment/validation";
import { withNext } from "@/lib/navigation/next-path";
import Mascot from "../Mascot";
import { VISIBLE_SUB_TESTS as SUB_TESTS } from "../subtests";

export default function ThankYouPage() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  // Pengingat Data Diri (opsional). Dibaca sebelum logout karena setelah logout data tidak bisa dibaca lagi.
  const [dataDiriSubmitted, setDataDiriSubmitted] = useState(true);

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
        const uid = currentUser.uid;
        await runThankYouCheck({
          subTests: SUB_TESTS.map((subTest) => ({ id: subTest.id, hidden: subTest.hidden, isCompleted: () => subTest.isCompleted(uid) })),
          readKraepelin: async () => {
            const snapshot = await getDoc(doc(db, "kraepelinSessions", uid));
            const exists = snapshot.exists();
            return { exists, valid: exists && isCompletedSession("kraepelin", snapshot.data(), uid), submittedMs: exists ? getSubmittedMs(snapshot.data()) : null };
          },
          readDataDiriSubmitted: async () => isCompletedSession("data-diri", (await getDoc(doc(db, "personalDataSessions", uid))).data(), uid),
          isActive: () => active,
          toHub: () => router.replace("/test-hub"),
          onVerified: (dataDiriDone) => {
            completed = true;
            setDataDiriSubmitted(dataDiriDone);
            setIsVerified(true);
          },
          signOut: () => signOut(auth),
        });
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
        {error ? <div className="max-w-md text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-5 py-3 font-semibold text-white">Coba Lagi</button></div> : <p className="text-sm font-medium text-slate-500">Memeriksa status tes...</p>}
      </main>
    );
  }

  return (
    <main className="grid min-h-[calc(100vh-65px)] place-items-center bg-[#f0ede8] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(44,50,60,.10)] sm:p-12">
        <Mascot id="thankyou" className="mx-auto w-44 sm:w-52" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-primary">Terima Kasih!</h1>
        <p className="mt-5 leading-7 text-slate-600">Jawaban Anda telah berhasil disimpan. Tim HCGA PT Balancia akan menghubungi Anda untuk proses selanjutnya.</p>
        {!dataDiriSubmitted && (
          <div className="mt-8 rounded-2xl border border-[#f4c9b3] bg-[#fdf1ea] p-5 text-left">
            <p className="font-semibold leading-6 text-slate-900">Satu langkah lagi: lengkapi Data Diri Anda untuk proses administrasi rekrutmen.</p>
            <Link href={withNext("/login", "/test/data-diri")} className="mt-4 inline-block rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-[#bf4821]">Lengkapi Data Diri</Link>
            <p className="mt-2 text-xs text-slate-500">Anda akan diminta masuk kembali.</p>
          </div>
        )}
        <p className="mt-8 text-sm text-slate-500">Anda dapat menutup halaman ini.</p>
      </section>
    </main>
  );
}
