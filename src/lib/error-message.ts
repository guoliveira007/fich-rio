/** Converte erros técnicos em mensagens que fazem sentido para quem está usando. */
export function errorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";

  if (/unauthorized|invalid token|jwt|not authenticated|sessão expirou/i.test(raw)) {
    return "Sua sessão expirou. Entre de novo e reenvie o arquivo.";
  }
  if (/rate limit|429|too many requests/i.test(raw)) {
    return "A leitura foi limitada por excesso de pedidos. Espere alguns segundos e tente de novo.";
  }
  if (/payment|402|credits/i.test(raw)) {
    return "Os créditos de leitura acabaram. Recarregue para continuar.";
  }
  if (/failed to fetch|network|timeout|aborted/i.test(raw)) {
    return "A conexão caiu durante a leitura. Verifique a internet e tente de novo.";
  }

  return raw.trim() !== "" ? raw : fallback;
}
