"use client";

import { auth, db } from "@/lib/firebase";
import { EnvelopeIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function redirectCandidate(uid: string) {
    const candidateSnapshot = await getDoc(doc(db, "hexacoCandidates", uid));
    const hasSubmitted = candidateSnapshot.exists() && candidateSnapshot.data().hasSubmitted === true;
    router.replace(hasSubmitted ? "/test-hub" : "/profile");
  }

  function showAuthError(caughtError: unknown) {
    const code = caughtError instanceof FirebaseError ? caughtError.code : "";
    setError(authErrors[code] ?? "Login gagal. Periksa data Anda atau hubungi tim HCGA PT Balancia.");
    setIsLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (isRegistering && password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
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

  const inputClass = "w-full rounded-xl border border-[#ece4da] bg-white py-3 pl-14 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100";
  const iconBoxClass = "pointer-events-none absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-[#eef2fb] text-primary";

  function toggleMode() {
    setIsRegistering((value) => !value);
    setConfirmPassword("");
    setError("");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3eee8] px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-[#fbf5ee] shadow-[0_30px_80px_rgba(44,50,60,.12)] lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden min-h-[700px] flex-col lg:flex">
          <div className="px-10 pb-3 pt-9">
            <div className="inline-flex rounded-lg bg-primary px-2.5 py-1.5 shadow-md shadow-blue-950/15">
              <Image src="/logo-balancia.png" alt="Balancia Ship Agency" width={84} height={43} priority />
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-primary">Selamat datang! <span aria-hidden="true">👋</span></h2>
            <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-600">Masuk untuk memulai rangkaian asesmen Anda bersama PT Balancia.</p>
          </div>
          <div className="relative flex-1">
            <Image src="/login-illustration.png" alt="Ilustrasi kandidat mengerjakan asesmen di laptop" fill priority sizes="(min-width: 1024px) 520px, 0px" className="object-cover object-[center_55%]" />
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#fbf5ee] to-transparent" />
          </div>
        </section>

        <section className="flex items-center justify-center p-3 sm:p-5">
          <div className="w-full rounded-[1.75rem] bg-white px-6 py-8 shadow-[0_12px_40px_rgba(44,50,60,.08)] sm:px-10 sm:py-10">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 inline-flex rounded-lg bg-primary px-2.5 py-1.5 shadow-lg shadow-blue-950/15 lg:hidden">
                <Image src="/logo-balancia.png" alt="Balancia Ship Agency" width={80} height={41} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">{isRegistering ? "Buat akun Anda" : "Asesmen PT Balancia"}</h1>
              <p className="mt-1.5 text-sm text-slate-500">{isRegistering ? "Isi data di bawah untuk mendaftar." : "Silakan masuk untuk melanjutkan."}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <div className="relative">
                  <span className={iconBoxClass}><EnvelopeIcon className="h-4 w-4" aria-hidden="true" /></span>
                  <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <span className={iconBoxClass}><LockClosedIcon className="h-4 w-4" aria-hidden="true" /></span>
                  <input id="password" type={showPassword ? "text" : "password"} autoComplete={isRegistering ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegistering ? "Buat password" : "Masukkan password"} className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600">
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              {isRegistering && (
                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-slate-700">Konfirmasi password</label>
                  <div className="relative">
                    <span className={iconBoxClass}><LockClosedIcon className="h-4 w-4" aria-hidden="true" /></span>
                    <input id="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi password" className={inputClass} />
                  </div>
                </div>
              )}

              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</div>}

              <button type="submit" disabled={isLoading} className="!mt-6 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white shadow-md shadow-orange-900/10 transition hover:bg-[#bf4821] focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60">
                {isLoading ? (isRegistering ? "Membuat akun..." : "Memeriksa akun...") : (isRegistering ? "Daftar" : "Masuk")}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3"><hr className="flex-1 border-slate-200" /><span className="text-xs text-slate-400">atau</span><hr className="flex-1 border-slate-200" /></div>

            <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.62Z"/><path fill="#EA4335" d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"/></svg>
              Masuk dengan Google
            </button>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">{isRegistering ? "Sudah punya akun? " : "Belum punya akun? "}<button type="button" onClick={toggleMode} className="font-semibold text-primary hover:underline">{isRegistering ? "Masuk" : "Daftar di sini"}</button></p>
          </div>
        </section>
      </div>
    </main>
  );
}
