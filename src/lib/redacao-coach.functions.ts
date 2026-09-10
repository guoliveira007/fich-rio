import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson } from "./exam-ai.server";
import { coachScript } from "@/data/redacao-coach";
import { HIGH_SCORE_LESSONS, getBoard, type BoardId } from "@/data/redacao-guide";

export type CoachPlan = {
  leitura: string;
  teses: { texto: string; comentario: string }[];
  eixos: { d1: string; d2: string }[];
  repertorios: { fonte: string; uso: string }[];
  armadilhas: string[];
};

export type CoachMark = {
  trecho: string;
  gravidade: "grave" | "media" | "leve";
  tipo: string;
  problema: string;
  comoMelhorar: string[];
  sugestao: string;
};

export type CoachFeedback = {
  aprovado: boolean;
  nota: number;
  acertos: string[];
  ajustes: string[];
  marcacoes: CoachMark[];
  versaoMelhor: string;
  porqueMelhor: string;
  dicaProximo: string;
};

const boardBrief = (id: BoardId) => {
  const b = getBoard(id);
  return [
    `Banca: ${b.label}. ${b.style}`,
    `Extensão: ${b.lines}. Nota máxima ${b.maxScore}.`,
    `Travas da grade: ${b.caps.join(" | ")}`,
    `Padrão de nota máxima: ${HIGH_SCORE_LESSONS.join(" | ")}`,
  ].join("\n");
};

const essaySelect = "id, board, theme_title, theme_prompt";

/** Ajuda o aluno a planejar o texto antes da primeira palavra. */
export const coachPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ essayId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CoachPlan> => {
    const { data: essay, error } = await context.supabase
      .from("essays")
      .select(essaySelect)
      .eq("id", data.essayId)
      .single();
    if (error || !essay) throw new Error("Proposta não encontrada.");
    const board = getBoard(String(essay.board ?? "FUVEST"));

    const parsed = await aiJson<Partial<CoachPlan>>(
      "Você é professor particular de redação de vestibular, em português do Brasil. " +
        "Antes de o aluno escrever, faça com ele o planejamento do texto: interpretação da frase temática, " +
        "caminhos de tese possíveis (com o que cada um exige), pares de eixos para D1 e D2 em relação de causa e consequência, " +
        "repertórios legitimados que ele pode usar (explicando COMO aplicar, não só citando) e as armadilhas típicas deste tema.\n\n" +
        boardBrief(board.id) +
        "\n\nSeja concreto e curto em cada item. Nada de conselho genérico.\n" +
        'Responda só JSON: {"leitura":"o que a frase temática exige, em 2 frases","teses":[{"texto":"...","comentario":"..."}],' +
        '"eixos":[{"d1":"...","d2":"..."}],"repertorios":[{"fonte":"...","uso":"..."}],"armadilhas":["..."]}',
      [
        {
          type: "text",
          text: [
            `TEMA: ${essay.theme_title}`,
            `PROPOSTA E COLETÂNEA:\n${String(essay.theme_prompt ?? "").slice(0, 6000)}`,
            "Dê 3 teses, 3 pares de eixos, 5 repertórios e 4 armadilhas.",
          ].join("\n"),
        },
      ],
    );

    const list = <T,>(v: unknown, n: number): T[] => (Array.isArray(v) ? (v as T[]).slice(0, n) : []);
    return {
      leitura: String(parsed.leitura ?? "").trim(),
      teses: list<CoachPlan["teses"][number]>(parsed.teses, 4),
      eixos: list<CoachPlan["eixos"][number]>(parsed.eixos, 4),
      repertorios: list<CoachPlan["repertorios"][number]>(parsed.repertorios, 6),
      armadilhas: list<string>(parsed.armadilhas, 6).map(String),
    };
  });

/** Devolutiva imediata de UM período escrito pelo aluno. */
export const coachStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        essayId: z.string().uuid(),
        stepId: z.string().max(20),
        sentence: z.string().min(1).max(2000),
        written: z.string().max(20000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CoachFeedback> => {
    const { data: essay, error } = await context.supabase
      .from("essays")
      .select(essaySelect)
      .eq("id", data.essayId)
      .single();
    if (error || !essay) throw new Error("Proposta não encontrada.");

    const board = getBoard(String(essay.board ?? "FUVEST"));
    const script = coachScript(board.id);
    const index = Math.max(0, script.findIndex((s) => s.id === data.stepId));
    const step = script[index]!;
    const next = script[index + 1] ?? null;

    const parsed = await aiJson<Partial<CoachFeedback>>(
      "Você é professor particular de redação de vestibular e acompanha o aluno período a período, em português do Brasil. " +
        "Avalie SOMENTE o período que ele acabou de escrever, considerando a função que esse período tem no texto.\n\n" +
        boardBrief(board.id) +
        `\n\nFUNÇÃO DESTE PERÍODO: ${step.blockLabel} — ${step.label}\nObjetivo: ${step.goal}\n` +
        `Precisa conter:\n${step.checklist.map((c) => `- ${c}`).join("\n")}\n` +
        `Tamanho esperado: ${step.words.min} a ${step.words.max} palavras.\n` +
        (next ? `Próximo período do roteiro: ${next.label} — ${next.goal}\n` : "Este é o último período do texto.\n") +
        "\nRegras da devolutiva: seja específico, cite trechos do aluno entre aspas, no máximo 3 acertos e 3 ajustes, " +
        "cada item em uma frase. Em 'versaoMelhor', reescreva o período em nível nota máxima MANTENDO a ideia e o vocabulário do aluno " +
        "(não invente dados nem troque o argumento dele). Em 'porqueMelhor', explique em uma frase o que mudou. " +
        "'aprovado' é true quando o período cumpre a função e pode seguir adiante mesmo sem ser perfeito. " +
        "'nota' é de 0 a 10 só para este período. 'dicaProximo' orienta o que escrever no próximo período, ligado ao que ele já escreveu.\n" +
        'Responda só JSON: {"aprovado":true,"nota":0,"acertos":["..."],"ajustes":["..."],"versaoMelhor":"...","porqueMelhor":"...","dicaProximo":"..."}',
      [
        {
          type: "text",
          text: [
            `TEMA: ${essay.theme_title}`,
            `COLETÂNEA:\n${String(essay.theme_prompt ?? "").slice(0, 4000)}`,
            data.written ? `TEXTO JÁ ESCRITO ATÉ AQUI:\n${data.written.slice(0, 8000)}` : "O aluno ainda não escreveu nada.",
            `PERÍODO ENVIADO AGORA:\n${data.sentence.trim()}`,
          ].join("\n\n"),
        },
      ],
    );

    const strList = (v: unknown) =>
      Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, 3) : [];
    const nota = Number(parsed.nota);
    return {
      aprovado: parsed.aprovado !== false,
      nota: Number.isFinite(nota) ? Math.max(0, Math.min(10, Math.round(nota * 10) / 10)) : 0,
      acertos: strList(parsed.acertos),
      ajustes: strList(parsed.ajustes),
      versaoMelhor: String(parsed.versaoMelhor ?? "").trim(),
      porqueMelhor: String(parsed.porqueMelhor ?? "").trim(),
      dicaProximo: String(parsed.dicaProximo ?? "").trim(),
    };
  });
