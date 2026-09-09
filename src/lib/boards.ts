/** Bancas conhecidas e a referência de questões por área de cada prova. */
export type BoardDayArea = { area: string; questions: number; note?: string };

/** Um dia de aplicação da prova (bancas que aplicam em dois dias). */
export type BoardDay = {
  id: string;
  label: string;
  /** Duração oficial daquele dia, em minutos. */
  minutes: number;
  format: "objetiva" | "dissertativa";
  /** Itens de cada questão, nas provas dissertativas (ex.: a e b). */
  items?: string[];
  note?: string;
  areas: BoardDayArea[];
};

export type BoardRef = {
  id: string;
  name: string;
  reference: string;
  /** Total de questões objetivas da prova oficial. */
  questions: number;
  /** Duração oficial da prova, em minutos (somando os dias, quando houver). */
  minutes: number;
  areas: { area: string; questions: number }[];
  /** Quando a prova é aplicada em dois dias, cada dia com seu formato. */
  days?: BoardDay[];
};

/** Tempo por questão da banca, em minutos. */
export function minutesPerQuestion(board: BoardRef): number {
  return board.minutes / board.questions;
}

/** Total de questões de um dia. */
export function dayQuestions(day: BoardDay): number {
  return day.areas.reduce((sum, a) => sum + a.questions, 0);
}

/** Tempo sugerido (min) para um simulado parcial com `count` questões da banca. */
export function simulationMinutes(board: BoardRef, count: number): number {
  if (board.days && board.days.length > 0) {
    let remaining = Math.max(0, count);
    let minutes = 0;
    for (const day of board.days) {
      const dayTotal = dayQuestions(day);
      if (remaining <= 0) break;
      const take = Math.min(remaining, dayTotal);
      minutes += Math.max(1, Math.round((day.minutes / dayTotal) * take));
      remaining -= take;
    }
    return Math.max(1, minutes);
  }
  return Math.max(1, Math.round(minutesPerQuestion(board) * count));
}

/** Tempo sugerido (min) para `count` questões dentro de um dia específico. */
export function dayMinutes(day: BoardDay, count: number): number {
  const total = dayQuestions(day);
  if (count >= total) return day.minutes;
  return Math.max(1, Math.round((day.minutes / total) * count));
}


export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export const BOARDS: BoardRef[] = [
  {
    id: "enem",
    name: "ENEM",
    reference: "180 questões em 2 dias (5h30 + 5h) + redação",
    questions: 180,
    minutes: 630,
    areas: [
      { area: "Linguagens", questions: 45 },
      { area: "Humanas", questions: 45 },
      { area: "Naturezas", questions: 45 },
      { area: "Matemática", questions: 45 },
    ],
    days: [
      {
        id: "dia1",
        label: "1º dia",
        minutes: 330,
        format: "objetiva",
        note: "A redação não entra no simulado de praticar.",
        areas: [
          { area: "Linguagens", questions: 45, note: "5 delas de inglês" },
          { area: "Humanas", questions: 45 },
        ],
      },
      {
        id: "dia2",
        label: "2º dia",
        minutes: 300,
        format: "objetiva",
        areas: [
          { area: "Matemática", questions: 45 },
          { area: "Naturezas", questions: 45 },
        ],
      },
    ],
  },

  {
    id: "fuvest",
    name: "FUVEST",
    reference: "1ª fase: 80 questões em 5h",
    questions: 80,
    minutes: 300,
    areas: [
      { area: "Linguagens", questions: 25 },
      { area: "Humanas", questions: 25 },
      { area: "Naturezas", questions: 15 },
      { area: "Matemática", questions: 15 },
    ],
  },
  {
    id: "unicamp",
    name: "UNICAMP",
    reference: "1ª fase: 72 questões em 5h",
    questions: 72,
    minutes: 300,
    areas: [
      { area: "Linguagens", questions: 20 },
      { area: "Humanas", questions: 20 },
      { area: "Naturezas", questions: 16 },
      { area: "Matemática", questions: 16 },
    ],
  },
  {
    id: "unesp",
    name: "UNESP",
    reference: "1ª fase: 90 questões em 5h",
    questions: 90,
    minutes: 300,
    areas: [
      { area: "Linguagens", questions: 25 },
      { area: "Humanas", questions: 25 },
      { area: "Naturezas", questions: 20 },
      { area: "Matemática", questions: 20 },
    ],
  },
  {
    id: "unifesp",
    name: "UNIFESP",
    reference: "2 dias: 25 objetivas (4h) + 20 dissertativas (4h)",
    questions: 45,
    minutes: 480,
    areas: [
      { area: "Inglês", questions: 10 },
      { area: "Português e Literatura", questions: 15 },
      { area: "Biologia", questions: 5 },
      { area: "Química", questions: 5 },
      { area: "Física", questions: 5 },
      { area: "Matemática", questions: 5 },
    ],
    days: [
      {
        id: "dia1",
        label: "1º dia",
        minutes: 240,
        format: "objetiva",
        areas: [
          { area: "Inglês", questions: 10 },
          { area: "Português e Literatura", questions: 15 },
        ],
      },
      {
        id: "dia2",
        label: "2º dia",
        minutes: 240,
        format: "dissertativa",
        items: ["a", "b"],
        note: "Cada questão tem os itens a e b.",
        areas: [
          { area: "Biologia", questions: 5 },
          { area: "Química", questions: 5 },
          { area: "Física", questions: 5 },
          { area: "Matemática", questions: 5 },
        ],
      },
    ],
  },

  {
    id: "uerj",
    name: "UERJ",
    reference: "Exame de qualificação: 60 questões em 4h",
    questions: 60,
    minutes: 240,
    areas: [
      { area: "Linguagens", questions: 20 },
      { area: "Humanas", questions: 15 },
      { area: "Naturezas", questions: 13 },
      { area: "Matemática", questions: 12 },
    ],
  },
  {
    id: "fatec",
    name: "FATEC",
    reference: "54 questões + redação em 4h",
    questions: 54,
    minutes: 240,
    areas: [
      { area: "Linguagens", questions: 15 },
      { area: "Humanas", questions: 13 },
      { area: "Naturezas", questions: 13 },
      { area: "Matemática", questions: 13 },
    ],
  },
];

export function boardById(id: string): BoardRef | undefined {
  return BOARDS.find((b) => b.id === id);
}
