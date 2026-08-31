import { Question, ResponseValue } from "@/types/hexaco";

const options: { value: ResponseValue; label: string }[] = [{ value: 1, label: "Sangat tidak setuju" }, { value: 2, label: "Tidak setuju" }, { value: 3, label: "Netral" }, { value: 4, label: "Setuju" }, { value: 5, label: "Sangat setuju" }];

export default function QuestionCard({ question, value, onChange }: { question: Question; value?: ResponseValue; onChange: (value: ResponseValue) => void }) {
  return <section className="rounded-3xl bg-white p-7 shadow-sm sm:p-10"><p className="text-sm font-semibold text-accent">PERTANYAAN {question.id}</p><h2 className="mt-4 text-xl font-semibold leading-8 text-slate-800 sm:text-2xl">{question.text}</h2><div className="mt-8 space-y-3">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${value === option.value ? "border-primary bg-blue-50 text-primary ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${value === option.value ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{option.value}</span><span className="font-medium">{option.label}</span></button>)}</div></section>;
}
