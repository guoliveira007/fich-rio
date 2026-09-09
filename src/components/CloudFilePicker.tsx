import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Cloud, FileText, Folder, Loader2 } from "lucide-react";

import {
  listOneDriveFolder,
  resolveOneDriveShare,
  SHARED_FOLDER_URL,
} from "@/lib/onedrive.functions";

type SharedFolder = { driveId: string; itemId: string; name: string };

export type CloudFile = { id: string; name: string; driveId: string | null; size: number };

/** Navegador simples do OneDrive para escolher um arquivo (PDF ou imagem). */
export function CloudFilePicker({
  onPick,
  disabled,
}: {
  onPick: (file: CloudFile) => void;
  disabled?: boolean;
}) {
  const listFolder = useServerFn(listOneDriveFolder);
  const resolveShare = useServerFn(resolveOneDriveShare);
  const [path, setPath] = useState("");
  const [sharedStack, setSharedStack] = useState<SharedFolder[]>([]);

  const { data: shareRoot } = useQuery({
    queryKey: ["onedrive-share", SHARED_FOLDER_URL],
    queryFn: () => resolveShare({ data: { shareUrl: SHARED_FOLDER_URL } }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const currentShared = sharedStack.length > 0 ? sharedStack[sharedStack.length - 1] : null;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "onedrive",
      currentShared ? `share:${currentShared.driveId}:${currentShared.itemId}` : path,
    ],
    queryFn: () =>
      currentShared
        ? listFolder({
            data: {
              driveId: currentShared.driveId,
              itemId: currentShared.itemId,
              path: sharedStack.map((s) => s.name).join("/"),
            },
          })
        : listFolder({ data: { path } }),
  });

  const items = data?.items ?? [];
  const canGoBack = currentShared !== null || path !== "";

  function goBack() {
    if (currentShared) {
      setSharedStack((stack) => stack.slice(0, -1));
    } else {
      setPath((p) => p.split("/").slice(0, -1).join("/"));
    }
  }

  const crumb = currentShared
    ? sharedStack.map((s) => s.name).join(" / ")
    : path || "Meu OneDrive";

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-paper">
      <div className="flex min-w-0 items-center gap-2 border-b border-line px-3 py-2">
        {canGoBack ? (
          <button
            type="button"
            onClick={goBack}
            className="shrink-0 rounded p-1 text-ink-soft transition-colors hover:text-ink"
            aria-label="Voltar uma pasta"
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : (
          <Cloud className="size-4 shrink-0 text-sun" />
        )}
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {crumb}
        </span>
        {shareRoot && sharedStack.length === 0 && (
          <button
            type="button"
            className="ml-auto shrink-0 text-[11px] text-sun-deep underline-offset-2 hover:underline"
            onClick={() =>
              setSharedStack([
                { driveId: shareRoot.driveId, itemId: shareRoot.itemId, name: shareRoot.name },
              ])
            }
          >
            {shareRoot.name}
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto p-1">
        {isLoading && (
          <p className="flex items-center gap-2 px-3 py-6 text-sm text-ink-soft">
            <Loader2 className="size-4 animate-spin" /> Carregando a nuvem…
          </p>
        )}
        {error && (
          <p className="px-3 py-6 text-sm text-ink-soft">
            Não consegui abrir a nuvem agora. Tente novamente ou envie o arquivo do computador.
          </p>
        )}
        {!isLoading && !error && items.length === 0 && (
          <p className="px-3 py-6 text-sm text-ink-soft">Esta pasta está vazia.</p>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            className="flex w-full min-w-0 items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors hover:bg-background disabled:opacity-50"
            onClick={() => {
              if (item.isFolder) {
                if (currentShared) {
                  setSharedStack((stack) => [
                    ...stack,
                    { driveId: currentShared.driveId, itemId: item.id, name: item.name },
                  ]);
                } else {
                  setPath(item.path);
                }
              } else {
                onPick({
                  id: item.id,
                  name: item.name,
                  driveId: item.driveId,
                  size: item.size,
                });
              }
            }}
          >
            {item.isFolder ? (
              <Folder className="size-4 shrink-0 text-sun" />
            ) : (
              <FileText className="size-4 shrink-0 text-ink-soft" />
            )}
            <span className="min-w-0 truncate">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
