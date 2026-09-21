export interface KraepelinScore {
  correctPerCol: number[];
  errors: number;
  skipped: number;
  mean: number;
  range: number;
  avDeviation: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Slot j pada kolom i benar bila jawabannya (grid[i][j] + grid[i][j+1]) % 10.
export function scoreKraepelin(answers: string[][], grid: number[][]): KraepelinScore {
  let errors = 0;
  let skipped = 0;

  const correctPerCol = grid.map((column, i) => {
    let correct = 0;
    for (let j = 0; j < column.length - 1; j++) {
      const answer = answers[i]?.[j] ?? "";
      if (answer === "") {
        skipped++;
      } else if (answer === ((column[j] + column[j + 1]) % 10).toString()) {
        correct++;
      } else {
        errors++;
      }
    }
    return correct;
  });

  if (correctPerCol.length === 0) {
    return { correctPerCol, errors, skipped, mean: 0, range: 0, avDeviation: 0 };
  }

  // avDeviation dihitung dari rata-rata yang belum dibulatkan, baru hasilnya dibulatkan.
  const mean = correctPerCol.reduce((total, value) => total + value, 0) / correctPerCol.length;
  const avDeviation = correctPerCol.reduce((total, value) => total + Math.abs(value - mean), 0) / correctPerCol.length;

  return {
    correctPerCol,
    errors,
    skipped,
    mean: round2(mean),
    range: Math.max(...correctPerCol) - Math.min(...correctPerCol),
    avDeviation: round2(avDeviation),
  };
}
