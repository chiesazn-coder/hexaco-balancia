"use client";

import { auth, db } from "@/lib/firebase";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const authErrors: Record<string, string> = {
  "auth/invalid-credential": "Email atau password yang Anda masukkan salah.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/too-many-requests": "Terlalu banyak percobaan login. Silakan coba kembali beberapa saat lagi.",
  "auth/user-disabled": "Akun ini telah dinonaktifkan. Silakan hubungi tim HCGA.",
  "auth/network-request-failed": "Koneksi bermasalah. Periksa internet Anda lalu coba kembali.",
  "auth/popup-closed-by-user": "Login Google dibatalkan. Silakan coba kembali.",
  "auth/popup-blocked": "Pop-up diblokir browser. Izinkan pop-up lalu coba kembali.",
  "auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
  "auth/weak-password": "Password minimal 6 karakter.",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  async function redirectCandidate(uid: string) {
    const candidateSnapshot = await getDoc(doc(db, "hexacoCandidates", uid));
    const hasSubmitted = candidateSnapshot.exists() && candidateSnapshot.data().hasSubmitted === true;
    router.replace(hasSubmitted ? "/thankyou" : "/profile");
  }

  function showAuthError(caughtError: unknown) {
    const code = caughtError instanceof FirebaseError ? caughtError.code : "";
    setError(authErrors[code] ?? "Login gagal. Periksa data Anda atau hubungi tim HCGA PT Balancia.");
    setIsLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        router.replace("/profile");
        return;
      }
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await redirectCandidate(credential.user.uid);
    } catch (caughtError) {
      console.error(caughtError);
      showAuthError(caughtError);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsLoading(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await redirectCandidate(credential.user.uid);
    } catch (caughtError) {
      console.error(caughtError);
      showAuthError(caughtError);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f0ede8] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-blue-950/15">
            <LockClosedIcon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Hexaco Personality Inventory</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">PT Balancia — Asesmen Calon Pegawai</p>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-[0_20px_60px_rgba(44,50,60,.10)] sm:p-9">
          <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.62Z"/><path fill="#EA4335" d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"/></svg>
            Masuk dengan Google
          </button>
          <div className="my-5 flex items-center gap-3"><hr className="flex-1 border-slate-200" /><span className="text-xs text-slate-400">atau</span><hr className="flex-1 border-slate-200" /></div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input id="password" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100" />
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</div>}

            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-[#bf4821] focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? (isRegistering ? "Membuat akun..." : "Memeriksa akun...") : (isRegistering ? "Daftar" : "Masuk")}
            </button>

            <p className="text-center text-xs leading-5 text-slate-500">{isRegistering ? "Sudah punya akun? " : "Belum punya akun? "}<span role="button" tabIndex={0} onClick={() => { setIsRegistering((value) => !value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { setIsRegistering((value) => !value); setError(""); } }} className="cursor-pointer font-semibold text-primary hover:underline">{isRegistering ? "Masuk" : "Daftar di sini"}</span></p>
          </form>
        </div>
      </div>
    </main>
  );
}
