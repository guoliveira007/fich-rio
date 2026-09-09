import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, FileUp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/error-message";

import { AppShell } from "@/components/AppShell";
import { useViewer } from "@/components/SplitView";
import { boardById } from "@/lib/boards";
import { fetchBoardEditais, fetchBoardProvas } from "@/lib/boards-data";
import { formatSize, relativeDate, subjectTree, fetchSubjects } from "@/lib/study";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateFromEdital } from "@/lib/edital.functions";
import { formatDate, percent } from "@/lib/exam-utils";
import { BANK_STATUS, HIDDEN_EXAM_STATUS } from "@/lib/practice";

export const Route = createFileRoute("/bancas/$boardId")({
  head: ({ params }) => {
    const board = boardById(params.boardId);
    return {
      meta: [
        { title: `${board?.name ?? "Banca"} — Fichário` },
        {
          name: "description",
          content: `Editais e provas antigas da ${board?.name ?? "banca"}.`,
        },
        { property: "og:title", content: `${board?.name ?? "Banca"} — Fichário` },
        {
          property: "og:description",
          content: `Gerencie editais e as últimas provas da ${board?.name ?? "banca"}.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: () => (
    <AppShell>
      <BancaDetailPage />
    </AppShell>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Banca não encontrada</h1>
        <p className="mt-2 text-sm text-ink-soft">Escolha uma das bancas disponíveis.</p>
        <Link
          to="/bancas"
          className="mt-4 inline-block rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Ver bancas
        </Link>
      </div>
    </div>
  ),
});

function BancaDetailPage() {
  const { boardId } = Route.useParams();
  const boardRef = boardById(boardId);
  if (!boardRef) throw notFound();
  const board = boardRef;
  const queryClient = useQueryClient();
  const { openPdf } = useViewer();

  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const tree = subjectTree(subjects);

  const editais = useQuery({
    queryKey: ["board-editais", board.name],
    queryFn: () => fetchBoardEditais(board.name),
  });

  const provas = useQuery({
    queryKey: ["board-provas", board.name],
    queryFn: () => fetchBoardProvas(board.name, 10),
  });

  const [genSubject, setGenSubject] = useState("");
  const [pickSubjectFor, setPickSubjectFor] = useState<string | null>(null);
  const [editalBusy, setEditalBusy] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const genFromEdital = useServerFn(generateFromEdital);

  async function uploadEdital(files: File[]) {
    setEditalBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sua sessão expirou. Entre de novo e tente outra vez.");
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024)
          throw new Error(
            `"${file.name}" tem mais de 50 MB. Comprima o PDF ou envie só a parte do edital que interessa.`,
          );
        const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upError } = await supabase.storage
          .from("materiais")
          .upload(path, file, { contentType: file.type || "application/pdf" });
        if (upError) throw new Error(`Não consegui guardar o arquivo: ${upError.message}`);
        const { error } = await supabase.from("materials").insert({
          user_id: uid,
          subject_id: null,
          title: `${board.name} — ${file.name.replace(/\.pdf$/i, "")}`,
          kind: "edital",
          source: "upload",
          file_path: path,
          file_size: file.size,
          tags: ["edital", board.name],
        });
        if (error) throw new Error(`Não consegui registrar o edital: ${error.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ["board-editais", board.name] });
      queryClient.invalidateQueries({ queryKey: ["board-counts"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success(
        files.length > 1
          ? `${files.length} editais enviados (${board.name}).`
          : `Edital da ${board.name} enviado.`,
      );
    } catch (err) {
      toast.error(errorMessage(err, "Falha ao enviar o edital."));
    } finally {
      setEditalBusy(false);
    }
  }


  async function generateQuestions(materialId: string, subjectId: string | null) {
    if (!subjectId) {
      setGenSubject("");
      setPickSubjectFor(materialId);
      return;
    }
    setPickSubjectFor(null);
    setGeneratingId(materialId);
    try {
      const result = await genFromEdital({
        data: { materialId, count: 15, subjectId },
      });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success(`${result.created} questões inéditas geradas. Veja em Quizzes.`);
    } catch (err) {
      toast.error(errorMessage(err, "Falha ao gerar questões."));
    } finally {
      setGeneratingId(null);
    }
  }

  async function removeEdital(id: string, path: string | null) {
    if (path) await supabase.storage.from("materiais").remove([path]);
    await supabase.from("materials").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["board-editais", board.name] });
    queryClient.invalidateQueries({ queryKey: ["board-counts"] });
    queryClient.invalidateQueries({ queryKey: ["materials"] });
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sun-deep">Banca</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{board.name}</h1>
          <p className="mt-2 text-sm text-ink-soft">{board.reference}</p>
        </div>
        <Link
          to="/praticar"
          search={{ board: board.id }}
          className="inline-flex items-center gap-1.5 rounded-md bg-sun px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-4" /> Fazer simulado da {board.name}
        </Link>
      </header>


      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Editais */}
        <section className="rounded-xl border border-line bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Editais</h2>
            <span className="rounded-full bg-sun/10 px-2.5 py-1 font-mono text-[10px] text-sun-deep">
              {editais.data?.length ?? 0} arquivo(s)
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-sun ${editalBusy ? "pointer-events-none opacity-60" : ""}`}
            >
              {editalBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              Enviar edital (PDF)
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                disabled={editalBusy}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) void uploadEdital(files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <p className="mt-2 w-full text-xs text-ink-soft">
            O edital da banca cobre todas as matérias — não precisa escolher matéria para enviar.
            A matéria só é pedida na hora de gerar questões.
          </p>

          <ul className="mt-4 divide-y divide-line">
            {editais.isLoading ? (
              <li className="py-4 text-sm text-ink-soft">Carregando…</li>
            ) : editais.data?.length === 0 ? (
              <li className="py-4 text-sm text-ink-soft">
                Nenhum edital enviado. Envie o PDF do edital atualizado.
              </li>
            ) : (
              editais.data?.map((m) => {
                const subject = subjects.find((s) => s.id === m.subject_id);
                return (
                  <li key={m.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sun/15 font-mono text-[10px] font-medium text-sun-deep">
                        edital
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.title}</p>
                        <p className="font-mono text-[10px] text-ink-soft">
                          {subject?.name ?? "todas as matérias"} · {formatSize(m.file_size)} ·{" "}
                          {relativeDate(m.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => generateQuestions(m.id, m.subject_id)}
                        disabled={generatingId === m.id}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sun px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {generatingId === m.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        Gerar questões
                      </button>
                      <button
                        onClick={() =>
                          openPdf({
                            title: m.title,
                            path: m.file_path,
                            url: m.link_url,
                            externalId: m.external_id,
                          })
                        }
                        className="text-ink-soft transition-colors hover:text-sun-deep"
                        aria-label="Abrir arquivo"
                      >
                        <BookOpen className="size-4" />
                      </button>
                      <button
                        onClick={() => removeEdital(m.id, m.file_path)}
                        className="text-ink-soft transition-colors hover:text-destructive"
                        aria-label="Remover edital"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {pickSubjectFor === m.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-sun/40 bg-sun/5 p-2">
                        <span className="text-xs text-ink-soft">Gerar questões de qual matéria?</span>
                        <select
                          value={genSubject}
                          onChange={(e) => setGenSubject(e.target.value)}
                          className="rounded-md border border-line bg-background px-2 py-1 text-xs"
                        >
                          <option value="">Matéria…</option>
                          {tree.map(({ subject: s, children }) =>
                            children.length === 0 ? (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ) : (
                              <optgroup key={s.id} label={s.name}>
                                <option value={s.id}>{s.name} (tudo)</option>
                                {children.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </optgroup>
                            ),
                          )}
                        </select>
                        <button
                          onClick={() => genSubject && generateQuestions(m.id, genSubject)}
                          disabled={!genSubject}
                          className="rounded-md bg-sun px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground disabled:opacity-50"
                        >
                          Gerar
                        </button>
                        <button
                          onClick={() => setPickSubjectFor(null)}
                          className="text-xs text-ink-soft hover:text-ink"
                        >
                          cancelar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {/* Provas */}
        <section className="rounded-xl border border-line bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Últimas provas</h2>
            <Link
              to="/simulados/novo"
              search={{ board: board.id }}
              className="inline-flex items-center gap-1.5 rounded-md bg-sun px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" /> Corrigir prova
            </Link>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {provas.isLoading ? (
              <li className="py-4 text-sm text-ink-soft">Carregando…</li>
            ) : provas.data?.length === 0 ? (
              <li className="py-4 text-sm text-ink-soft">
                Nenhuma prova cadastrada. Envie uma prova antiga para começar.
              </li>
            ) : (
              provas.data?.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="font-mono text-[10px] text-ink-soft">
                      {formatDate(p.exam_date)} · {p.total_questions} questões
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-3">
                    {p.status === BANK_STATUS ? (
                      <span className="rounded-full bg-sun/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sun-deep">
                        banco
                      </span>
                    ) : HIDDEN_EXAM_STATUS.includes(p.status) ? null : (
                      <span className="font-display text-lg font-bold text-sun-deep">
                        {percent(p.correct_count, p.total_questions)}%
                      </span>
                    )}
                    <Link
                      to="/simulados/$id"
                      params={{ id: p.id }}
                      className="text-ink-soft transition-colors hover:text-sun-deep"
                      aria-label="Abrir prova"
                    >
                      <BookOpen className="size-4" />
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
