import { GRID } from "./grid";

export const COLUMN_MS = 15000;
export const COUNTDOWN_MS = 3000;
export const emptyColumn = () => Array<string>(GRID[0].length - 1).fill("");
export interface KraepelinProgress {
  colIdx: number;
  columns: string[][];
  current: string[];
  phase: "countdown" | "test" | "done";
  deadline: number;
}
export function newProgress(now: number, columns: string[][] = []): KraepelinProgress {
  return { colIdx: columns.length, columns, current: emptyColumn(), phase: columns.length >= GRID.length ? "done" : "countdown", deadline: now + COUNTDOWN_MS };
}
// Advance using the previous deadline, never Date.now()+duration. A closed tab cannot extend time.
export function advanceProgress(progress: KraepelinProgress, now: number): KraepelinProgress {
  let next = progress;
  while (next.phase !== "done" && now >= next.deadline) {
    if (next.phase === "countdown") next = { ...next, phase: "test", deadline: next.deadline + COLUMN_MS };
    else {
      const columns = [...next.columns, next.current];
      next = { colIdx: columns.length, columns, current: emptyColumn(), phase: columns.length >= GRID.length ? "done" : "countdown", deadline: next.deadline + COUNTDOWN_MS };
    }
  }
  return next;
}
export function parseProgress(raw: string | null, now: number): KraepelinProgress | null {
  if (!raw) return null;
  const data = JSON.parse(raw);
  const validColumn = (v: unknown) => Array.isArray(v) && v.length === GRID[0].length - 1 && v.every(x => typeof x === "string" && /^[0-9]?$/.test(x));
  if (!data || !Number.isInteger(data.colIdx) || !Array.isArray(data.columns) || data.colIdx !== data.columns.length || data.colIdx > GRID.length || !data.columns.every(validColumn)) throw new Error("Cadangan Kraepelin tidak valid. Hubungi pengawas; jangan menghapus data browser.");
  // Older backups have no active-column information. Preserve all completed columns.
  if (data.phase === undefined && data.current === undefined && data.deadline === undefined) return newProgress(now, data.columns);
  if (!validColumn(data.current) || !["countdown", "test", "done"].includes(data.phase) || typeof data.deadline !== "number" || !Number.isFinite(data.deadline) || data.deadline <= 0 || (data.phase === "done") !== (data.colIdx === GRID.length)) throw new Error("Cadangan waktu Kraepelin tidak valid. Hubungi pengawas.");
  return advanceProgress(data, now);
}
