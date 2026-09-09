import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  GROQ_MODELS,
  getAiSettings,
  saveAiSettings,
  testAiSettings,
} from "@/lib/ai-settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function AiSettingsDialog({ open, onOpenChange }: Props) {
  const fetchSettings = useServerFn(getAiSettings);
  const persist = useServerFn(saveAiSettings);
  const runTest = useServerFn(testAiSettings);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => fetchSettings(),
    enabled: open,
  });

  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [model, setModel] = useState<string>("llama-3.3-70b-versatile");

  useEffect(() => {
    if (data) {
      setModel(data.model);
      setKey("");
      setReveal(false);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          model: model as (typeof GROQ_MODELS)[number]["value"],
          ...(key.trim() ? { groqApiKey: key.trim() } : {}),
        },
      }),
    onSuccess: async () => {
      toast.success("Configurações de IA salvas.");
      setKey("");
      await queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar."),
  });

  const check = useMutation({
    mutationFn: () =>
      runTest({
        data: {
          model: model as (typeof GROQ_MODELS)[number]["value"],
          ...(key.trim() ? { groqApiKey: key.trim() } : {}),
        },
      }),
    onSuccess: (result) =>
      result.ok ? toast.success(result.message) : toast.error(result.message),
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível testar a chave."),
  });

  const remove = useMutation({
    mutationFn: () =>
      persist({
        data: { model: model as (typeof GROQ_MODELS)[number]["value"], groqApiKey: null },
      }),
    onSuccess: async () => {
      toast.success("Chave removida.");
      setKey("");
      await queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="size-4 text-sun-deep" />
            Configurações da IA
          </DialogTitle>
          <DialogDescription>
            Sua chave da Groq é usada quando os créditos de IA do site acabam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-line bg-sun/5 p-3 text-xs leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">Para que serve esta chave</p>
            <p className="mt-1">
              Com ela ligada, o Fichário consegue corrigir e analisar suas respostas, explicar por
              que cada alternativa está certa ou errada e montar as revisões dos seus erros.
            </p>
            <p className="mt-2">
              Ela fica guardada só na sua conta, nunca aparece por completo e você pode remover
              quando quiser. Pegue a sua em{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-sun-deep underline"
              >
                console.groq.com/keys
              </a>
              .
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="groq-key">Chave de API da Groq</Label>
            <div className="relative">
              <Input
                id="groq-key"
                type={reveal ? "text" : "password"}
                autoComplete="off"
                placeholder={
                  isLoading
                    ? "Carregando…"
                    : data?.hasKey
                      ? data.maskedKey
                      : "gsk_..."
                }
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Esconder chave" : "Mostrar chave"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-sun-deep"
              >
                {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-ink-soft">
              {data?.hasKey
                ? "Uma chave já está salva e aparece escondida. Digite outra para substituir."
                : "A chave fica guardada em segurança e nunca é exibida por completo."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="groq-model">Modelo da Groq</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="groq-model">
                <SelectValue placeholder="Escolha um modelo" />
              </SelectTrigger>
              <SelectContent>
                {GROQ_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            {data?.hasKey ? (
              <Button
                variant="ghost"
                onClick={() => remove.mutate()}
                disabled={remove.isPending || save.isPending}
              >
                Remover chave
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => check.mutate()}
                disabled={check.isPending || isLoading || (!key.trim() && !data?.hasKey)}
              >
                {check.isPending && <Loader2 className="size-4 animate-spin" />}
                Testar chave
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
