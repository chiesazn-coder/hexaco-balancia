import Image from "next/image";

// Karakter pendamping per halaman (file di public/characters). Ganti nomornya untuk menukar pose.
const MASCOTS = {
  ist: { file: 4, alt: "Karakter mengepalkan tangan dengan semangat" },
  papi: { file: 2, alt: "Karakter sedang berpikir" },
  disc: { file: 3, alt: "Karakter mempersilakan" },
  kraepelin: { file: 5, alt: "Karakter bersedekap dengan percaya diri" },
  "love-language": { file: 1, alt: "Karakter mengacungkan jempol" },
  thankyou: { file: 1, alt: "Karakter mengacungkan jempol" },
} as const;

export default function Mascot({ id, className = "" }: { id: keyof typeof MASCOTS; className?: string }) {
  const mascot = MASCOTS[id];
  return (
    <div className={`shrink-0 overflow-hidden rounded-[2rem] bg-[#fbf3ea] shadow-[0_18px_60px_rgba(44,50,60,.10)] ${className}`}>
      <Image src={`/characters/karakter-${mascot.file}.jpg`} alt={mascot.alt} width={720} height={900} priority sizes="(min-width: 1024px) 320px, 208px" className="h-auto w-full" />
    </div>
  );
}
