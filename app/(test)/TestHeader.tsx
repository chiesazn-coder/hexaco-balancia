"use client";

import { auth } from "@/lib/firebase";
import { ArrowLeftIcon, ArrowRightOnRectangleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

// Tes berwaktu: timer dihitung dari tenggat, jadi tetap berjalan walau peserta meninggalkan halaman.
const TIMED_TESTS = ["/test/ist", "/test/kraepelin"];

export default function TestHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [dialog, setDialog] = useState<"back" | "signOut" | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  const showBack = pathname.startsWith("/test/");
  const showSignOut = pathname === "/profile" || pathname === "/test-hub";

  function handleBack() {
    if (TIMED_TESTS.includes(pathname)) {
      setDialog("back");
      return;
    }
    router.push("/test-hub");
  }

  async function handleSignOut() {
    setDialog(null);
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (caughtError) {
      console.error(caughtError);
      setIsSigningOut(false);
    }
  }

  const buttonClass = "-mr-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-bold text-primary">PT BALANCIA</Link>
        {showBack && (
          <button type="button" onClick={handleBack} className={buttonClass}>
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            <span>Daftar Tes</span>
          </button>
        )}
        {showSignOut && (
          <button type="button" onClick={() => setDialog("signOut")} disabled={isSigningOut} className={buttonClass}>
            <span>{isSigningOut ? "Keluar..." : "Keluar"}</span>
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {dialog === "back" && (
        <ConfirmDialog
          icon={<ClockIcon className="h-7 w-7" />}
          title="Kembali ke daftar tes?"
          message="Jika tes sudah dimulai, waktu tes tetap berjalan meskipun Anda meninggalkan halaman ini."
          cancelLabel="Tetap di sini"
          confirmLabel="Ya, kembali"
          onCancel={closeDialog}
          onConfirm={() => {
            setDialog(null);
            router.push("/test-hub");
          }}
        />
      )}
      {dialog === "signOut" && (
        <ConfirmDialog
          icon={<ArrowRightOnRectangleIcon className="h-7 w-7" />}
          title="Keluar dari akun?"
          message="Tes yang sudah selesai tetap tersimpan. Anda dapat masuk kembali kapan saja untuk melanjutkan."
          cancelLabel="Batal"
          confirmLabel="Ya, keluar"
          onCancel={closeDialog}
          onConfirm={handleSignOut}
        />
      )}
    </header>
  );
}
