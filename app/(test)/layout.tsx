import TestHeader from "./TestHeader";

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><TestHeader />{children}</div>;
}
