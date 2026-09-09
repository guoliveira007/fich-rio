import type { BoardId } from "./redacao-guide";

/**
 * Corpus real de propostas — extraído do material de redação do curso
 * (aulas e análises de FUVEST, VUNESP/UNIFESP e ENEM, 2025-2026) e das provas
 * oficiais. Serve de referência de ESTILO e de ATUALIDADE para o gerador de temas.
 */
export type CorpusTheme = { year: string; title: string };

export const REAL_THEMES: Record<BoardId, CorpusTheme[]> = {
  FUVEST: [
    { year: "2026", title: "O perdão é um ato que pode ser condicionado ou limitado?" },
    { year: "2025", title: "As relações sociais por meio da solidariedade" },
    { year: "simulado 2026", title: "Fragilização dos afetos e exaustão contemporânea" },
    { year: "simulado 2026", title: "A relação entre tecnologia e humanidade na arte" },
    { year: "simulado 2026", title: "Relações humanas contemporâneas: entre a alteridade e o narcisismo" },
    { year: "simulado 2026", title: "O ressentimento nas relações de gênero da contemporaneidade" },
    { year: "simulado 2026", title: "Vícios contemporâneos e a crise do sentir" },
    { year: "simulado 2026", title: "O futuro da humanidade ainda pode ser comum?" },
    { year: "simulado 2026", title: "O corpo contemporâneo: entre a liberdade e a performance" },
    { year: "simulado 2025", title: "As emoções e sua interferência no processo de comunicação" },
  ],
  UNIFESP: [
    {
      year: "2026",
      title: "Luto contemporâneo: entre a espetacularização da morte e a manutenção da lembrança coletiva",
    },
    { year: "2025", title: "Ser imigrante: entre desafios e oportunidades" },
    { year: "2023", title: "É possível conciliar o mérito e o bem comum?" },
    { year: "UNESP 2026", title: "Vivemos hoje uma epidemia da solidão?" },
    { year: "UNESP 2025", title: "Medicalização da vida: a quem interessa?" },
    { year: "UNESP 2023", title: "A 'lógica do condomínio': o espaço público está em declínio?" },
    { year: "UNESP 2020", title: "O carro será o novo cigarro?" },
    {
      year: "simulado 2026",
      title: "Influenciadores sem formação devem ser proibidos de abordar temas que exigem conhecimento técnico?",
    },
    { year: "simulado 2026", title: "Precariedade da formação médica: de quem é a responsabilidade?" },
    { year: "simulado 2026", title: "Redução da jornada de trabalho no Brasil: avanço social ou prejuízo econômico?" },
    {
      year: "simulado 2026",
      title: "Uso da inteligência artificial na arte: entre ampliação de possibilidades e esvaziamento da experiência artística",
    },
    { year: "simulado 2026", title: "Atletas devem fazer manifestações políticas em competições?" },
    { year: "simulado 2026", title: "Impactos da machosfera na perpetuação da misoginia" },
    { year: "simulado 2026", title: "É possível uma geração sem cigarro?" },
    { year: "simulado 2026", title: "Mudança da política de uso do Roblox: censura ou proteção da infância?" },
    { year: "simulado 2026", title: "As escolas estaduais devem adotar o ensino cívico-militar?" },
    {
      year: "simulado 2026",
      title: "Busca por aprovação estrangeira de obras nacionais: entre a valorização da cultura brasileira e o complexo de vira-lata",
    },
    {
      year: "simulado 2026",
      title: "Conflitos bélicos e recursos ambientais: entre a demanda energética e os impactos sociais",
    },
    { year: "simulado 2026", title: "A busca pelo corpo magro: entre a pressão estética e o benefício à saúde" },
    { year: "simulado 2026", title: "Existe uma crise da sensibilidade na formação das novas gerações?" },
  ],
  ENEM: [
    { year: "2025", title: "Perspectivas acerca do envelhecimento na sociedade brasileira" },
    { year: "2025 (PPL)", title: "A idade mínima para o trabalho como forma de proteção à infância" },
    { year: "2024", title: "Desafios para a valorização da herança africana no Brasil" },
    { year: "2024 (PPL)", title: "Desafios para a valorização da arte de periferia no cenário cultural brasileiro" },
    {
      year: "2023",
      title: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
    },
    { year: "2023 (PPL)", title: "Desafios para a (re)inserção econômica da população em situação de rua no Brasil" },
    { year: "2022", title: "Desafios para a valorização de comunidades e povos tradicionais no Brasil" },
    { year: "2021", title: "Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil" },
    { year: "2020", title: "O estigma associado às doenças mentais na sociedade brasileira" },
    { year: "2019", title: "Democratização do acesso ao cinema no Brasil" },
    { year: "2018", title: "Manipulação do comportamento do usuário pelo controle de dados na internet" },
    { year: "2016", title: "Caminhos para combater a intolerância religiosa no Brasil" },
    { year: "simulado 2026", title: "Desafios para combater os impactos do consumo desenfreado no Brasil" },
    { year: "simulado 2026", title: "Caminhos para enfrentar a cultura da misoginia no Brasil" },
    { year: "simulado 2026", title: "Desafios para a diminuição do vício em cigarros eletrônicos no Brasil" },
    { year: "simulado 2026", title: "Desafios para proteção dos direitos trabalhistas no Brasil" },
    {
      year: "simulado 2026",
      title: "Desafios para a garantia da segurança cibernética de crianças e adolescentes brasileiros",
    },
    { year: "simulado 2026", title: "Impactos das mudanças climáticas sobre as populações vulneráveis no Brasil" },
  ],
};

/**
 * Pautas contemporâneas em circulação (2025-2026) observadas no material.
 * O gerador deve ancorar o tema em pelo menos uma delas.
 */
export const CURRENT_AGENDA = [
  "inteligência artificial: autoria, trabalho, arte e desinformação",
  "saúde mental, exaustão e a discussão sobre a escala 6x1 / redução da jornada",
  "machosfera, misoginia e masculinidades on-line",
  "adolescência conectada: telas, jogos, apostas e proteção da infância",
  "cigarro eletrônico e novas dependências",
  "envelhecimento populacional e cuidado",
  "justiça climática, eventos extremos e populações vulneráveis",
  "imigração, refúgio e xenofobia",
  "luto, morte e espetacularização nas redes",
  "solidão, afetos frágeis e narcisismo",
  "pressão estética, corpo e medicalização da vida",
  "trabalho por aplicativo e precarização",
  "formação médica, acesso ao SUS e desertos assistenciais",
  "desinformação, plataformas e regulação digital",
  "cultura brasileira, complexo de vira-lata e valorização da arte nacional",
];

/** Bloco de contexto real usado no prompt do gerador de temas. */
export const corpusBrief = (board: BoardId): string => {
  const themes = REAL_THEMES[board];
  return [
    `PROPOSTAS REAIS DESTA BANCA (use como padrão de recorte, extensão e tom — NÃO repita nenhuma delas):`,
    ...themes.map((t) => `  • [${t.year}] ${t.title}`),
    "",
    "ATUALIDADE OBRIGATÓRIA: o tema precisa dialogar com o debate público brasileiro de 2025-2026.",
    "Pautas em circulação (escolha uma e dê um recorte próprio):",
    ...CURRENT_AGENDA.map((a) => `  • ${a}`),
    "Evite temas datados, genéricos ou atemporais (ex.: 'a importância da leitura').",
  ].join("\n");
};
