import Link from "next/link";

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="font-bold text-primary">PT BALANCIA</Link><span className="text-sm text-slate-500">HEXACO Inventory</span></div></header>{children}</div>;
}
