"use client";

import type { SyntheticEvent } from "react";

// Kolom isian tetap bisa dipilih, disalin, ditempel, dan diseret seperti biasa.
const EDITABLE_SELECTOR = "input, textarea, [contenteditable]:not([contenteditable='false'])";

// Mencegah aksi (salin, potong, klik kanan, seret) kecuali asalnya dari kolom isian.
function blockOutsideEditable(event: SyntheticEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest(EDITABLE_SELECTOR)) return;
  event.preventDefault();
}

// Berlaku untuk semua halaman /test/* (termasuk layar instruksi): soal tidak bisa diseleksi, disalin, atau
// dibuka lewat klik kanan / tekan lama. Hub, login, profil, dan halaman terima kasih tidak memakai layout ini.
export default function TestPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      onCopy={blockOutsideEditable}
      onCut={blockOutsideEditable}
      onContextMenu={blockOutsideEditable}
      onDragStart={blockOutsideEditable}
      className="select-none [-webkit-touch-callout:none] [&_[contenteditable]:not([contenteditable='false'])]:select-text [&_input]:select-text [&_input]:[-webkit-touch-callout:default] [&_textarea]:select-text [&_textarea]:[-webkit-touch-callout:default]"
    >
      {children}
    </div>
  );
}
