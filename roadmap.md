# Roadmap

## Concluído
- /upload/$sessionId (página do celular: foto → transcrição)
- /simulados/$id usa <ErrorAnalysis /> reutilizável
- /praticar com exame avulso status 'pratica' + próxima questão por tipo de erro
- Dashboard de assuntos pendentes na home
- Select de banca com referência de questões/áreas (src/lib/boards.ts)
- Toggle "só banco de questões" (status 'banco') + filtro/badges em /simulados
- Upload de edital em materials + geração de questões inéditas (generateFromEdital)
- subject_id gravado em aulas manuais (custom_lessons) e resumos (lesson_summaries)
- Typecheck ok

## Aberto
- (nada)

## Novo (set/2026)
- Tela /progresso: respondidas/acertos/erros por matéria + assuntos do edital faltando
- edital_topics + extractEditalTopics (lê o edital e lista os assuntos)
- exam_questions.visual_summary: leitura do gráfico/tabela com valores exatos (extração + botão "Ler o gráfico em texto")

## Corrigido (set/2026)
- Sessão da leitura de PDFs conectada ao backend atual; progresso mostra o total real após calcular as páginas

## Novo pedido (set/2026)
- Recriação integral do app a partir do repositório público
- Corrigir erro de runtime de configuração do backend (Lovable Cloud ativado)
- Garantir que a interface não quebre quando o backend não estiver disponível

## Novo pedido (set/2026)
- Prévia do Progresso na Visão geral com "Ver mais"
- Ativar a conexão do OneDrive (Nuvem)

## Novo pedido (set/2026)
- Seção Redação (FUVEST): proposta com coletânea, cronômetro, correção por critérios, histórico e média — base na cartilha de redações 44–48

## Ajustes solicitados (set/2026)
- [x] OneDrive: conexão única do workspace (App connector), página Nuvem com status claro e sincronização.
- [x] IA: chave Groq salva com segurança como reserva automática quando os créditos da IA inclusa acabam.
- [x] Mostrar status/fallback da IA e área para salvar/testar a chave.
