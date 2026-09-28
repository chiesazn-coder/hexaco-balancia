"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { backupStatus, retryBackup, subscribeBackup } from "@/lib/assessment/client";
import { isTestId } from "@/lib/assessment/validation";

export default function BackupNotice() {
  const path = usePathname();
  const test = path.split("/")[2] ?? "";
  const [uid, setUid] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => onAuthStateChanged(auth, user => setUid(user?.uid ?? null)), []);
  useEffect(() => {
    const update = () => setMessage(uid && isTestId(test) ? backupStatus(uid, test) : "");
    update();
    return subscribeBackup(update);
  }, [uid, test]);
  useEffect(() => {
    const retry = () => { if (uid && isTestId(test)) retryBackup(uid, test); };
    window.addEventListener("online", retry);
    const leave = (event: BeforeUnloadEvent) => {
      if (uid && isTestId(test) && backupStatus(uid, test)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", leave);
    return () => { window.removeEventListener("online", retry); window.removeEventListener("beforeunload", leave); };
  }, [uid, test]);
  if (!message) return null;
  return <aside role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950">
    {message}{!message.endsWith("…") && <button type="button" className="ml-3 font-semibold underline" onClick={() => { if (uid && isTestId(test)) retryBackup(uid, test); }}>Coba simpan lagi</button>}
  </aside>;
}
