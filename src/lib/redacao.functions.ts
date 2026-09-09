import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson } from "./exam-ai.server";
import { REAL_THEMES, corpusBrief } from "@/data/redacao-corpus";
import {
  HIGH_SCORE_LESSONS,
  PARAGRAPH_CRITERIA,
  THEME_TITLE_RULES,
  getBoard,
  getPart,
  themeTitleBrief,
  type EssayCriterion,
} from "@/data/redacao-guide";

export type EssayTheme = {
  essayId: string;
  title: string;
  prompt: string;
};

export type CriterionScore = {
  id: string;
  label: string;
  score: number;
  max: number;
  comment: string;
};

export type EssayGrade = {
  score: number;
  maxScore: number;
  criteria: CriterionScore[];
  strengths: string[];
  improvements: string[];
  feedback: string;
  rewritten: string;
};

const briefOf = (criteria: EssayCriterion[]) =>
  criteria
    .map(
      (c) =>
        `- ${c.id} (${c.label}, 0 a ${c.max}): ${c.hint}\n  Faixas OFICIAIS permitidas (use exatamente um destes valores):\n${c.levels
          .map((l) => `    · ${l.score} — ${l.label}: ${l.desc}`)
          .join("\n")}`,
    )
    .join("\n");

const BoardEnum = z.enum(["FUVEST", "UNIFESP", "ENEM"]);
const PartEnum = z.enum(["introducao", "desenvolvimento", "conclusao"]);

/** Gera uma proposta de redação (tema + coletânea) no formato da banca. */
export const generateEssayTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        board: BoardEnum.default("FUVEST"),
        topic: z.string().max(200).optional(),
        avoid: z.array(z.string().max(200)).max(20).optional(),
        mode: z.enum(["completa", "paragrafo"]).default("completa"),
        part: PartEnum.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<EssayTheme> => {
    const { supabase, userId } = context;
    const avoid = (data.avoid ?? []).filter(Boolean);
    const board = getBoard(data.board);
    const isDrill = data.mode === "paragrafo";
    const drill = isDrill ? getPart(data.part ?? "introducao") : null;

    const rule = THEME_TITLE_RULES[board.id];

    const ask = async (extra: string) =>
      aiJson<{ title?: string; prompt?: string }>(
        "Você elabora propostas de redação dissertativo-argumentativa no estilo exato da banca informada. " +
          "Monte uma coletânea de 3 textos curtos (um jornalístico/acadêmico, um dado ou estatística e um trecho literário, filosófico ou uma fala). " +
          "A coletânea NÃO pode entregar a tese pronta; deve abrir posicionamentos diferentes. " +
          (isDrill
            ? `O aluno vai escrever APENAS o parágrafo de ${drill!.label.toLowerCase()}, então termine o campo prompt com uma linha "TAREFA:" dizendo isso.`
            : "") +
          "\n\n" +
          themeTitleBrief(board.id) +
          "\n\n" +
          corpusBrief(board.id) +
          "\n\n" +
          'Responda só JSON: {"title":"tema no formato da banca","prompt":"instrução da banca + TEXTO 1/2/3 com fonte fictícia plausível"}',
        [
          {
            type: "text",
            text: [
              `Banca: ${board.label} — ${board.style}`,
              `Extensão da prova: ${board.lines}.`,
              data.topic ? `Assunto pedido pelo aluno: ${data.topic}` : "",
              avoid.length ? `Não repita estes temas:\n${avoid.map((a) => `- ${a}`).join("\n")}` : "",
              extra,
              "Gere 1 proposta completa em português do Brasil.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      );

    const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "")
        .trim();
    const usedTitles = new Set(
      [...REAL_THEMES[board.id].map((t) => t.title), ...avoid].map(norm),
    );
    const titleOk = (s: string) => {
      const n = countWords(s);
      if (n < rule.words.min || n > rule.words.max) return false;
      if (usedTitles.has(norm(s))) return false;
      if (board.id === "ENEM" && !/no Brasil|na sociedade brasileira/i.test(s)) return false;
      if (board.id === "ENEM" && s.includes("?")) return false;
      return true;
    };

    let parsed = await ask("");
    let title = String(parsed.title ?? "").trim();
    let prompt = String(parsed.prompt ?? "").trim();

    if (title && !titleOk(title)) {
      parsed = await ask(
        `O título "${title}" foi REJEITADO por não seguir o formato da banca (${countWords(title)} palavras). ` +
          `Reescreva a proposta com um título de ${rule.words.min} a ${rule.words.max} palavras, no formato oficial da ${board.label}.`,
      );
      const retryTitle = String(parsed.title ?? "").trim();
      const retryPrompt = String(parsed.prompt ?? "").trim();
      if (retryTitle && retryPrompt) {
        title = retryTitle;
        prompt = retryPrompt;
      }
    }

    if (!title || !prompt) throw new Error("Não consegui montar a proposta. Tente de novo.");

    const { data: created, error } = await supabase
      .from("essays")
      .insert({
        user_id: userId,
        board: board.id,
        theme_title: title.slice(0, 300),
        theme_prompt: prompt,
        status: "rascunho",
        mode: data.mode,
        part: drill?.id ?? "",
        max_score: isDrill ? 10 : board.maxScore,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error("Não foi possível salvar a proposta.");

    return { essayId: created.id, title, prompt };
  });

/** Corrige a redação (ou o parágrafo) nos critérios da banca. */
export const gradeEssay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ essayId: z.string().uuid(), minutes: z.number().int().min(0).max(600).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<EssayGrade> => {
    const { supabase } = context;

    const { data: essay, error } = await supabase
      .from("essays")
      .select("id, board, theme_title, theme_prompt, text, mode, part")
      .eq("id", data.essayId)
      .single();
    if (error || !essay) throw new Error("Redação não encontrada.");

    const text = String(essay.text ?? "").trim();
    const isDrill = String(essay.mode ?? "completa") === "paragrafo";
    const board = getBoard(String(essay.board ?? "FUVEST"));
    const drill = isDrill ? getPart(String(essay.part ?? "introducao")) : null;

    if (text.length < (isDrill ? 60 : 200)) {
      throw new Error(
        isDrill ? "Escreva o parágrafo completo antes de pedir a correção." : "Escreva o texto completo antes de pedir a correção.",
      );
    }

    const criteriaModel = isDrill ? PARAGRAPH_CRITERIA : board.criteria;
    const maxScore = criteriaModel.reduce((s, c) => s + c.max, 0);

    const system = isDrill
      ? "Você é corretor de redação de vestibular e treina o aluno em UM parágrafo por vez, em português do Brasil. " +
        `Banca: ${board.label}. Parágrafo treinado: ${drill!.label}. Objetivo: ${drill!.goal}\n` +
        `Técnica esperada, na ordem:\n${drill!.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n` +
        `Particularidade da banca: ${drill!.byBoard[board.id]}\n\n` +
        `Nota total 0 a ${maxScore}:\n${briefOf(criteriaModel)}\n\n` +
        "Diga passo a passo quais etapas da técnica apareceram e quais faltaram, citando trechos do aluno entre aspas. " +
        `Em 'rewritten', reescreva o parágrafo em nível nota máxima, mantendo a ideia do aluno.`
      : "Você é corretor oficial de redação e aplica ESTRITAMENTE a grade de correção da banca, em português do Brasil. " +
        `Banca: ${board.label}. ${board.style}\n` +
        `Extensão prevista: ${board.lines}.\n` +
        `Nota total 0 a ${maxScore}, distribuída assim:\n${briefOf(criteriaModel)}\n\n` +
        `Situações de anulação (nota 0 total) previstas em edital:\n${board.zeroRules.map((z) => `- ${z}`).join("\n")}\n\n` +
        `Travas e observações obrigatórias da grade:\n${board.caps.map((c) => `- ${c}`).join("\n")}\n\n` +
        "Regras de atribuição: escolha para cada critério UMA das faixas oficiais listadas — nunca um valor intermediário. " +
        "Quando o texto se enquadrar em duas faixas, atribua sempre a faixa MAIS BAIXA. " +
        "No comentário de cada critério, nomeie a faixa escolhida e justifique com trechos do aluno entre aspas.\n\n" +
        `Padrão de redações nota máxima usado como referência:\n${HIGH_SCORE_LESSONS.map((l) => `- ${l}`).join("\n")}\n\n` +
        "Seja específico e não invente elogios. " +
        "Em 'rewritten', reescreva APENAS a introdução do aluno em nível nota máxima, mantendo a tese dele.";

    const parsed = await aiJson<{
      criteria?: { id?: string; score?: number; comment?: string }[];
      strengths?: string[];
      improvements?: string[];
      feedback?: string;
      rewritten?: string;
    }>(
      system +
        '\nResponda só JSON: {"criteria":[{"id":"' +
        criteriaModel[0]!.id +
        '","score":0,"comment":"..."}],"strengths":["..."],"improvements":["..."],"feedback":"parágrafo geral","rewritten":"..."}',
      [
        {
          type: "text",
          text: [
            `PROPOSTA: ${essay.theme_title}`,
            `COLETÂNEA:\n${String(essay.theme_prompt ?? "").slice(0, 6000)}`,
            `\n${isDrill ? `PARÁGRAFO DE ${drill!.label.toUpperCase()} DO ALUNO` : "REDAÇÃO DO ALUNO"}:\n${text.slice(0, 12000)}`,
          ].join("\n"),
        },
      ],
    );

    const criteria: CriterionScore[] = criteriaModel.map((c) => {
      const found = (parsed.criteria ?? []).find((p) => String(p.id ?? "") === c.id);
      const raw = Number(found?.score ?? 0);
      const clamped = Math.max(0, Math.min(c.max, Number.isFinite(raw) ? raw : 0));
      // A banca só admite as faixas oficiais: encaixa na faixa válida mais próxima,
      // e, em caso de empate, na mais baixa (regra dos guias oficiais).
      const level = c.levels.reduce((best, l) =>
        Math.abs(l.score - clamped) < Math.abs(best.score - clamped) ? l : best,
      c.levels[0]!);
      return {
        id: c.id,
        label: c.label,
        max: c.max,
        score: level.score,
        comment: String(found?.comment ?? "").trim(),
      };
    });
    const total = Math.round(criteria.reduce((sum, c) => sum + c.score, 0) * 10) / 10;
    const strengths = (parsed.strengths ?? []).map((s) => String(s)).filter(Boolean).slice(0, 6);
    const improvements = (parsed.improvements ?? []).map((s) => String(s)).filter(Boolean).slice(0, 6);
    const feedback = String(parsed.feedback ?? "").trim();
    const rewritten = String(parsed.rewritten ?? "").trim();

    await supabase
      .from("essays")
      .update({
        status: "corrigida",
        score: total,
        max_score: maxScore,
        criteria,
        strengths,
        improvements,
        feedback,
        rewritten,
        minutes: data.minutes ?? 0,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", essay.id);

    return { score: total, maxScore, criteria, strengths, improvements, feedback, rewritten };
  });
