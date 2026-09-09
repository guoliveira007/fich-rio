/**
 * Base de correção da redação: critérios oficiais da FUVEST, da UNIFESP e do ENEM,
 * mais as técnicas de cada parágrafo tiradas da cartilha de redações nota 44–48
 * (Equipe de Redação do Poliedro / Turma de Medicina) enviada pelo aluno.
 */

export type EssayCriterion = {
  id: string;
  label: string;
  max: number;
  hint: string;
};

export type BoardId = "FUVEST" | "UNIFESP" | "ENEM";

export type EssayBoard = {
  id: BoardId;
  label: string;
  maxScore: number;
  lines: string;
  words: { min: number; ideal: number; max: number };
  style: string;
  criteria: EssayCriterion[];
};

/**
 * FUVEST/USP: grade oficial do edital USP 2026 (4 critérios), como descrita na
 * cartilha de redações da turma 114 da FMUSP. Nota total 50.
 */
export const FUVEST_CRITERIA: EssayCriterion[] = [
  {
    id: "c1",
    label: "C1 — Coletânea, autoria e contexto",
    max: 12.5,
    hint: "Apropriar-se da coletânea de forma referenciada e EXTRAPOLÁ-LA num texto inédito, com indícios de autoria; assumir lugar de autor, leitor pretendido e contexto sócio-histórico. Cópia ou paráfrase da coletânea derruba o critério.",
  },
  {
    id: "c2",
    label: "C2 — Gênero e tipo textual",
    max: 12.5,
    hint: "Traços composicionais do dissertativo-argumentativo: tese explícita com argumentos delimitados e argumentatividade que não seja sobreposta por exposição. Se a proposta for de gênero, cumprir interlocutor e partes constitutivas.",
  },
  {
    id: "c3",
    label: "C3 — Estrutura, coerência e coesão",
    max: 12.5,
    hint: "Início, meio e fim bem definidos, planejamento do texto, progressão temática e recursos coesivos que sustentem a coerência e a consistência analítica dos argumentos.",
  },
  {
    id: "c4",
    label: "C4 — Norma-padrão e vocabulário",
    max: 12.5,
    hint: "Ortografia, morfossintaxe, acentuação, pontuação e vocabulário preciso e expressivo. Exigem-se precisão e concisão e evita-se clichê ou frase feita.",
  },
];

/**
 * UNIFESP: grade Vunesp (14 pontos) convertida para 50, com os 4 critérios do
 * edital Unifesp 2026 descritos na cartilha da turma 94 da EPM.
 */
const UNIFESP_CRITERIA: EssayCriterion[] = [
  {
    id: "a",
    label: "Critério A — Tema",
    max: 12.5,
    hint: "Todas as palavras-chave da frase temática (ou sinônimos próximos) precisam aparecer. Quando o tema tem dois polos, é preciso HIERARQUIZÁ-LOS na tese, dizendo qual prevalece — e não só citar os dois.",
  },
  {
    id: "b",
    label: "Critério B — Gênero/tipo de texto e coerência",
    max: 12.5,
    hint: "Tese bipartida na introdução, um argumento por parágrafo, justificado e desenvolvido, com progressão dentro e entre os parágrafos. Lacuna de raciocínio (ideia abstrata sem exemplo ou aprofundamento) é o que mais derruba aqui.",
  },
  {
    id: "c",
    label: "Critério C — Modalidade e registro",
    max: 12.5,
    hint: "Domínio da norma-padrão e precisão vocabular. Nas notas altas há pouquíssimos desvios e nenhum grave; imprecisão de verbo ou regência já é apontada.",
  },
  {
    id: "d",
    label: "Critério D — Coesão",
    max: 12.5,
    hint: "Conectivos e referenciação variados, sem truncamento nem justaposição, ligando parágrafos E períodos dentro de cada parágrafo.",
  },
];


const ENEM_CRITERIA: EssayCriterion[] = [
  {
    id: "c1",
    label: "C1 — Norma-padrão",
    max: 200,
    hint: "Domínio da escrita formal: ortografia, pontuação, concordância, regência e colocação.",
  },
  {
    id: "c2",
    label: "C2 — Tema e repertório",
    max: 200,
    hint: "Compreender a proposta, aplicar o tipo dissertativo-argumentativo e usar repertório sociocultural produtivo e legitimado.",
  },
  {
    id: "c3",
    label: "C3 — Projeto de texto",
    max: 200,
    hint: "Selecionar, relacionar e organizar informações e argumentos em defesa de um ponto de vista, com autoria.",
  },
  {
    id: "c4",
    label: "C4 — Coesão",
    max: 200,
    hint: "Conectivos e referenciação variados entre parágrafos e dentro deles, sem repetição de mecanismos.",
  },
  {
    id: "c5",
    label: "C5 — Proposta de intervenção",
    max: 200,
    hint: "Agente, ação, meio, finalidade e detalhamento, articulados à discussão e respeitando os direitos humanos.",
  },
];

export const BOARDS: EssayBoard[] = [
  {
    id: "FUVEST",
    label: "FUVEST",
    maxScore: 50,
    lines: "20 a 30 linhas",
    words: { min: 200, ideal: 300, max: 380 },
    style:
      "Grade USP 2026 (4 critérios). A proposta pode ser dissertação-argumentativa OU um gênero (carta, artigo, relato) com tarefas explícitas no enunciado. Exige extrapolar a coletânea com autoria, considerar contexto sócio-histórico e leitor pretendido, e concisão sem clichê. Não há proposta de intervenção.",
    criteria: FUVEST_CRITERIA,
  },
  {
    id: "UNIFESP",
    label: "UNIFESP",
    maxScore: 50,
    lines: "25 a 30 linhas",
    words: { min: 220, ideal: 300, max: 360 },
    style:
      "Banca Vunesp: frase temática quase sempre com DOIS polos (ex.: 'entre X e Y'). As notas 46–48 têm tese bipartida que hierarquiza os polos, projeto de causa e consequência, diálogo explícito com a coletânea e repertório externo aplicado. Não exige proposta de intervenção.",
    criteria: UNIFESP_CRITERIA,
  },
  {
    id: "ENEM",
    label: "ENEM",
    maxScore: 1000,
    lines: "até 30 linhas",
    words: { min: 250, ideal: 330, max: 400 },
    style:
      "Tema social brasileiro com textos motivadores. Cobra as 5 competências e, obrigatoriamente, uma proposta de intervenção completa (agente, ação, meio, finalidade e detalhamento) que respeite os direitos humanos.",
    criteria: ENEM_CRITERIA,
  },
];

export const getBoard = (id: string): EssayBoard =>
  BOARDS.find((b) => b.id === id.toUpperCase()) ?? BOARDS[0]!;

export type EssayPart = "introducao" | "desenvolvimento" | "conclusao";

export type PartDrill = {
  id: EssayPart;
  label: string;
  goal: string;
  /** Passos da técnica, na ordem em que devem aparecer no parágrafo. */
  steps: string[];
  /** O que muda em cada banca. */
  byBoard: Record<BoardId, string>;
  /** Extensão esperada do parágrafo isolado. */
  words: { min: number; max: number };
};

export const PART_DRILLS: PartDrill[] = [
  {
    id: "introducao",
    label: "Introdução",
    goal: "Apresentar o problema e fechar com a tese, sem rodeio e sem entregar tudo o que virá depois.",
    steps: [
      "Contextualização: informação externa à coletânea (fato histórico, dado, conceito) que situa o problema — nunca 'nos dias atuais'.",
      "Aproximação: puxe a contextualização para o recorte exato da frase temática, usando as palavras-chave dela.",
      "Tese: posicionamento claro; se o tema tem dois polos, diga qual prevalece (hierarquização).",
      "Encaminhamento: os dois eixos do desenvolvimento, de preferência em relação de causa e consequência.",
    ],
    byBoard: {
      FUVEST:
        "Na USP/Fuvest, a introdução já precisa mostrar autoria: apropriar-se da coletânea e extrapolá-la, com leitor e contexto sócio-histórico em vista, sem clichê.",
      UNIFESP:
        "Na UNIFESP, a introdução nota 48 traz repertório externo, delimita o assunto central, expõe os dois polos da frase temática e fecha com tese bipartida hierarquizada.",
      ENEM: "No ENEM, a introdução precisa deixar tese e dois eixos de argumento evidentes — é o projeto de texto (C3) sendo declarado.",
    },
    words: { min: 50, max: 90 },
  },
  {
    id: "desenvolvimento",
    label: "Desenvolvimento",
    goal: "Defender UM argumento por parágrafo e esgotá-lo antes de passar adiante.",
    steps: [
      "Tópico frasal que retoma a tese e anuncia o argumento do parágrafo.",
      "Explicação do mecanismo: por que isso acontece (causa, estrutura, interesse envolvido).",
      "Repertório aplicado: autor, conceito, dado, obra ou fato contemporâneo — mais o diálogo explícito com a coletânea, extrapolando-a.",
      "Exemplo concreto que evite lacuna: mostre o fenômeno acontecendo, não só a ideia abstrata.",
      "Amarração: uma frase ligando o argumento de volta à tese.",
    ],
    byBoard: {
      FUVEST:
        "Na USP/Fuvest, o critério 1 cobra extrapolar a coletânea com indícios de autoria; o critério 3 cobra consistência analítica, não acúmulo de exemplos.",
      UNIFESP:
        "Na UNIFESP, o modelo nota máxima é D1 = causa e D2 = consequência, cada um retomando a tese no início e no fim. Ideia abstrata sem exemplo é lacuna de progressão e derruba o critério B.",
      ENEM: "No ENEM, cada parágrafo precisa de repertório legitimado e explicitamente relacionado ao tema (C2), com conectivo inicial variado (C4).",
    },
    words: { min: 80, max: 140 },
  },
  {
    id: "conclusao",
    label: "Conclusão",
    goal: "Fechar o raciocínio avançando em relação à introdução — não repetindo-a.",
    steps: [
      "Retomada da tese com outras palavras.",
      "Síntese do percurso, sem reapresentar os argumentos um a um.",
      "Avanço: consequência, dilema em aberto ou caminho de solução.",
      "Frase final de impacto, curta e sem clichê.",
    ],
    byBoard: {
      FUVEST:
        "Na USP/Fuvest não há proposta de intervenção: a conclusão fecha o projeto de texto com concisão e sem clichê, dizendo algo novo (efeito, risco ou reformulação do problema).",
      UNIFESP:
        "Na UNIFESP a conclusão é breve: sintetiza o percurso e REAFIRMA a hierarquia estabelecida na tese — a maior parte do texto deve ficar no desenvolvimento.",
      ENEM: "No ENEM a conclusão é a C5: agente, ação, meio, finalidade e detalhamento, tudo articulado ao que você discutiu e respeitando os direitos humanos.",
    },
    words: { min: 60, max: 110 },
  },
];

export const getPart = (id: string): PartDrill =>
  PART_DRILLS.find((p) => p.id === id) ?? PART_DRILLS[0]!;

/** Critérios usados quando o treino é de um parágrafo só (nota 0 a 10). */
export const PARAGRAPH_CRITERIA: EssayCriterion[] = [
  {
    id: "tecnica",
    label: "Técnica do parágrafo",
    max: 5,
    hint: "Os passos da técnica aparecem, na ordem, e cumprem a função esperada nessa parte do texto.",
  },
  {
    id: "conteudo",
    label: "Conteúdo e repertório",
    max: 3,
    hint: "A ideia é densa, o repertório é aplicado e o parágrafo responde ao recorte do tema.",
  },
  {
    id: "expressao",
    label: "Expressão",
    max: 2,
    hint: "Norma-padrão, pontuação e conectivos precisos.",
  },
];

/**
 * Lições tiradas das análises oficiais das cartilhas enviadas: Medicina UNIFESP
 * turma 94 (notas 39 a 48,214) e Medicina USP/FMUSP turma 114 (Fuvest e ENEM),
 * ambas da Equipe de Redação do Poliedro. Entram no prompt de correção para o
 * comentário sair no mesmo padrão dessas análises.
 */
export const HIGH_SCORE_LESSONS = [
  "Quando a frase temática tem dois polos, a tese precisa HIERARQUIZAR: dizer qual prevalece, e não apenas mencionar os dois lados.",
  "A introdução das notas máximas traz informação externa à coletânea para contextualizar, delimita o assunto central e fecha com uma tese bipartida que já anuncia os dois encaminhamentos.",
  "O projeto de texto vencedor é de causa e consequência: D1 apresenta a causa, D2 desenvolve a consequência, e cada parágrafo retoma a tese no começo e no fim.",
  "Ideia abstrata sem exemplo ou aprofundamento cria lacuna de progressão — é o defeito que separa 46 de 48.",
  "Repertório (autor, conceito, dado, série, programa, fato contemporâneo) só pontua quando é aplicado ao argumento; o diálogo com os textos da coletânea deve ser explícito, mas extrapolado, nunca copiado.",
  "Planejamento: a maior parte do texto vai para o desenvolvimento; a conclusão é breve, sintetiza o percurso e reafirma a hierarquia da tese.",
  "Na norma-padrão, o que aparece nas notas altas são desvios raros e leves — sobretudo imprecisão vocabular (verbo ou regência trocados), que o corretor aponta com a reformulação sugerida.",
  "A coesão é avaliada entre parágrafos E entre períodos dentro do parágrafo; truncamento e justaposição contam como falha.",
  "Na FUVEST/USP, autoria é critério: espera-se lugar de autor, leitor pretendido e contexto sócio-histórico, com concisão e sem clichê.",
  "No ENEM, a conclusão precisa da proposta de intervenção completa (agente, ação, meio, finalidade, detalhamento) articulada ao que foi discutido.",
];

/**
 * Regras de FORMATO do título do tema por banca. Servem para impedir títulos
 * prolixos/artificiais gerados pela IA.
 */
export type ThemeTitleRule = {
  words: { min: number; max: number };
  typology: string;
  formats: string[];
  examples: string[];
  forbid: string[];
};

export const THEME_TITLE_RULES: Record<BoardId, ThemeTitleRule> = {
  FUVEST: {
    words: { min: 5, max: 12 },
    typology:
      "Reflexivo, filosófico ou sociológico contemporâneo — conciso, sem prolixidade.",
    formats: [
      "Pergunta reflexiva direta, curta.",
      "Sintagma conceitual/abstrato (frase nominal), podendo ter subtítulo curto após dois-pontos.",
    ],
    examples: [
      "O perdão é um ato que pode ser condicionado ou limitado?",
      "Devem existir limites para a arte?",
      "O homem saiu de sua menoridade?",
      "As utopias: indispensáveis, inúteis ou nocivas?",
      "As relações sociais por meio da solidariedade",
      "As diferentes faces do riso",
      "Refugiados ambientais e vulnerabilidade social",
      "'Camarotização' da sociedade brasileira: a segregação das classes sociais e a democracia",
    ],
    forbid: [
      "fórmulas de proposta de intervenção",
      "frases acadêmicas infladas, com duas ou mais orações subordinadas",
      "títulos com mais de 12 palavras",
    ],
  },
  UNIFESP: {
    words: { min: 6, max: 14 },
    typology:
      "Dilema ético/bioético, saúde e ciência, memória ou cidadania, sempre com polarização nítida.",
    formats: [
      "Pergunta direta de impasse.",
      "Contraste binário com subtítulo ou dois polos explícitos ('entre X e Y').",
    ],
    examples: [
      "É possível conciliar mérito e bem comum?",
      "A engenharia genética ameaça a dignidade humana?",
      "O fim do anonimato digital reduziria danos causados pelo discurso de ódio?",
      "O voto nulo é um ato político eficaz?",
      "Eutanásia: entre a liberdade de escolha e a preservação da vida",
      "Ser imigrante: entre desafios e oportunidades",
      "Derrubar monumentos? Os dilemas entre relembrar e apagar o passado",
    ],
    forbid: [
      "temas sem polarização clara",
      "títulos com mais de 14 palavras",
      "encadeamento de perguntas ou orações explicativas longas",
    ],
  },
  ENEM: {
    words: { min: 8, max: 15 },
    typology:
      "Problema social contemporâneo e concreto no Brasil: cidadania, direitos, saúde pública ou grupos vulneráveis.",
    formats: [
      "Desafios para a/o [problema ou valorização] no Brasil",
      "Caminhos para [combater/enfrentar/garantir] [problema ou direito] no Brasil",
      "Perspectivas acerca de [tema] na sociedade brasileira",
      "O estigma associado a [condição/tema] na sociedade brasileira",
      "Democratização do acesso a [bem/serviço] no Brasil",
    ],
    examples: [
      "Desafios para a valorização de comunidades e povos tradicionais no Brasil",
      "Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
      "Perspectivas acerca do envelhecimento populacional na sociedade brasileira",
      "O estigma associado às doenças mentais na sociedade brasileira",
      "Democratização do acesso ao cinema no Brasil",
    ],
    forbid: [
      "temas sem a âncora 'no Brasil' ou 'na sociedade brasileira'",
      "perguntas",
      "títulos abstratos ou filosóficos",
      "títulos com mais de 15 palavras",
    ],
  },
};

/** Bloco de instruções de título usado no prompt do gerador de temas. */
export const themeTitleBrief = (board: BoardId): string => {
  const r = THEME_TITLE_RULES[board];
  return [
    `REGRAS OBRIGATÓRIAS DO TÍTULO (${board}):`,
    `- Extensão: ${r.words.min} a ${r.words.max} palavras. Conte as palavras antes de responder e reescreva se estourar.`,
    `- Tipologia: ${r.typology}`,
    `- Formatos aceitos:\n${r.formats.map((f) => `  • ${f}`).join("\n")}`,
    `- Exemplos reais no formato correto:\n${r.examples.map((e) => `  • ${e}`).join("\n")}`,
    `- Proibido: ${r.forbid.join("; ")}.`,
    '- Proibido, em qualquer banca, título prolixo do tipo: "O erro tornou-se uma ferramenta de aprendizado e humanização ou continua sendo um risco interditado à maioria pela lógica do desempenho?" — longo demais, com duplo encadeamento e linguagem inflada.',
    "- O título deve soar como enunciado oficial da banca, não como frase de ensaio acadêmico.",
  ].join("\n");
};


/** Temas de partida quando o aluno não quer gerar um tema novo. */
export const STARTER_THEMES = [
  "Os limites entre a espetacularização da morte e a preservação da memória coletiva",
  "O trabalho por aplicativos e a nova precarização no Brasil",
  "Os efeitos da inteligência artificial sobre a noção de autoria",
  "A permanência do racismo estrutural nas instituições brasileiras",
  "Saúde mental e produtividade: o cansaço como projeto social",
  "O acesso à água como questão política no século XXI",
];

/** Alvo de extensão da FUVEST: 20 a 30 linhas manuscritas. */
export const TARGET_WORDS = { min: 200, ideal: 300, max: 380 };
