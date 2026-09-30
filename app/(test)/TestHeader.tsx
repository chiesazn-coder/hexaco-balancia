"use client";

import { auth } from "@/lib/firebase";
import { ArrowLeftIcon, ArrowRightOnRectangleIcon, ClockIcon, HomeIcon } from "@heroicons/react/24/outline";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { HOME_PATH } from "@/lib/assessment/progress";
import { withNext } from "@/lib/navigation/next-path";
import { SAVE_DATA_DIRI_DRAFT_EVENT } from "./test/data-diri/events";
import { DATA_DIRI_WIDTH } from "./test/data-diri/layout-width";

// Tes berwaktu: timer dihitung dari tenggat, jadi tetap berjalan walau peserta meninggalkan halaman.
const TIMED_TESTS = ["/test/ist", "/test/kraepelin"];
// Formulir Data Diri dibuka lewat link terpisah (bukan dari daftar tes), jadi tombolnya "Keluar".
const DATA_DIRI_PATH = "/test/data-diri";

export default function TestHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [dialog, setDialog] = useState<"back" | "signOut" | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  const isDataDiri = pathname === DATA_DIRI_PATH;
  const showBack = pathname.startsWith("/test/") && !isDataDiri;
  const showSignOut = pathname === "/profile" || pathname === "/test-hub" || pathname === HOME_PATH || isDataDiri;
  const showHome = pathname === "/test-hub" || isDataDiri;

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
    // Dialog menjanjikan isian tersimpan sebagai draft; jangan bergantung pada blur (di iOS, mengetuk tombol
    // tidak selalu melepas fokus dari kolom yang sedang diketik).
    if (isDataDiri) window.dispatchEvent(new Event(SAVE_DATA_DIRI_DRAFT_EVENT));
    try {
      await signOut(auth);
      // Dari formulir Data Diri, login berikutnya langsung kembali ke formulir.
      router.replace(isDataDiri ? withNext("/login", DATA_DIRI_PATH) : "/login");
    } catch (caughtError) {
      console.error(caughtError);
      setIsSigningOut(false);
    }
  }

  const buttonClass = "-mr-2.5 flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <header className="border-b border-slate-200 bg-white">
      {/* Formulir Data Diri: tepi header sejajar dengan sidebar dan kolom kanan formulir. */}
      <div className={(isDataDiri ? DATA_DIRI_WIDTH : "mx-auto max-w-5xl px-5") + " flex items-center justify-between py-4"}>
        <Link href={HOME_PATH} className="font-bold text-primary">PT BALANCIA</Link>
        <div className="flex items-center gap-1">
        {showHome && (
          <Link
            href={HOME_PATH}
            // Dari formulir Data Diri: simpan draft (termasuk kolom yang sedang diketik) sebelum pindah halaman.
            onClick={() => { if (isDataDiri) window.dispatchEvent(new Event(SAVE_DATA_DIRI_DRAFT_EVENT)); }}
            className={buttonClass.replace("-mr-2.5 ", "")}
          >
            <HomeIcon className="h-4 w-4" aria-hidden="true" />
            {/* Layar sangat sempit (<360px): cukup ikon agar tidak turun baris; label tetap dibaca pembaca layar. */}
            <span className="max-[359px]:sr-only">Beranda</span>
          </Link>
        )}
        {showBack && (
          <button type="button" onClick={handleBack} className={buttonClass}>
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            <span>Daftar Tes</span>
          </button>
        )}
        {showSignOut && (
          <button type="button" onClick={() => setDialog("signOut")} disabled={isSigningOut} className={buttonClass}>
            <span className="max-[359px]:sr-only">{isSigningOut ? "Keluar..." : "Keluar"}</span>
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        </div>
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
          title={isDataDiri ? "Keluar sekarang?" : "Keluar dari akun?"}
          message={isDataDiri ? "Isian yang sudah diketik tetap tersimpan sebagai draft." : "Tes yang sudah selesai tetap tersimpan. Anda dapat masuk kembali kapan saja untuk melanjutkan."}
          cancelLabel="Batal"
          confirmLabel="Ya, keluar"
          onCancel={closeDialog}
          onConfirm={handleSignOut}
        />
      )}
    </header>
  );
}
