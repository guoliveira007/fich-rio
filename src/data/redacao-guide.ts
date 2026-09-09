/**
 * Base de correção da redação: grades de correção OFICIAIS e respectivos guias de
 * utilização da FUVEST (USP), da VUNESP (UNIFESP/UNESP e afins) e do ENEM, mais as
 * técnicas de cada parágrafo tiradas da cartilha de redações nota 44–48
 * (Equipe de Redação do Poliedro).
 *
 * Pesos, faixas e descrições reproduzem os documentos oficiais:
 * - FUVEST: 40 pontos, 4 critérios (pesos 3, 2, 3, 2), níveis 1 a 4/5.
 * - VUNESP: 14 pontos, critérios A(3) B(4) C(4) D(3), notas de 1 em 1 ponto.
 * - ENEM: 1000 pontos, 5 competências de 0 a 200 em intervalos de 40.
 */

/** Uma faixa de nota possível dentro de um critério. */
export type CriterionLevel = {
  /** Nota exata que a banca permite atribuir nesta faixa. */
  score: number;
  /** Rótulo curto ("Nível 2", "80", "2,0"). */
  label: string;
  /** Descrição oficial resumida da faixa. */
  desc: string;
};

export type EssayCriterion = {
  id: string;
  label: string;
  max: number;
  /** Peso oficial do critério na grade (quando a banca declara peso). */
  weight?: number;
  hint: string;
  /** Faixas oficiais de nota — a IA só pode atribuir estes valores. */
  levels: CriterionLevel[];
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
  /** Situações de anulação previstas em edital. */
  zeroRules: string[];
  /** Travas e observações da grade que não são faixas de nota. */
  caps: string[];
};

/**
 * FUVEST — Grade de Correção oficial (Guia de Provas Fuvest, modelo 2026).
 * Nota máxima 40. Duas propostas (A: dissertação argumentativa; B: gênero textual).
 */
export const FUVEST_CRITERIA: EssayCriterion[] = [
  {
    id: "c1",
    label: "Critério 1 — Tema, uso da coletânea e autoria (peso 3)",
    max: 12,
    weight: 3,
    hint: "Intertextualidade e interdiscursividade: apropriar-se da coletânea de forma referenciada para produzir um texto inédito, com indícios de autoria, lugar de autor, leitor pretendido e contexto sócio-histórico. Cópia (3+ palavras idênticas) e paráfrase superficial derrubam o critério; extrapolação excessiva conta como tangência.",
    levels: [
      {
        score: 3,
        label: "Nível 1 (3)",
        desc: "Tangencia o tema (só o assunto geral) e/ou excessiva extrapolação da coletânea e/ou cópia textual frequente e/ou nenhum indício de autoria: reproduz modelos prontos, sem posicionamento sócio-histórico.",
      },
      {
        score: 6,
        label: "Nível 2 (6)",
        desc: "Considera o tema, mas há trechos significativos fora do foco; uso da coletânea limitado a paráfrases superficiais; indícios razoáveis de autoria, com referências desconectadas de um projeto de texto e posicionamento de senso comum.",
      },
      {
        score: 9,
        label: "Nível 3 (9)",
        desc: "Abordagem adequada do tema (um parágrafo pode se distanciar um pouco); compreensão da coletânea com alguma inferência; indícios fortes de autoria, com intertextualidade que enriquece, ainda que subaproveitada em trechos.",
      },
      {
        score: 12,
        label: "Nível 4 (12)",
        desc: "Abordagem aprimorada e crítica: leitura aprofundada de toda a proposta, inferências com observação crítica da realidade social E indícios robustos de autoria, relacionando tema, coletânea e conhecimento de mundo com precisão.",
      },
    ],
  },
  {
    id: "c2",
    label: "Critério 2 — Gênero e tipo de texto (peso 2)",
    max: 8,
    weight: 2,
    hint: "Só se verifica o atendimento aos traços composicionais do tipo/gênero pedido, não a qualidade do desenvolvimento. Na proposta A: as três partes da dissertação e predomínio do tipo argumentativo. Na proposta B: interlocutor adequado e partes constitutivas do gênero.",
    levels: [
      {
        score: 2,
        label: "Nível 1 (2)",
        desc: "Apresenta apenas duas partes da dissertação (texto sem tese minimamente delimitada não passa deste nível) e/ou atendimento apenas parcial ao tipo, com traços narrativos ou injuntivos.",
      },
      {
        score: 4,
        label: "Nível 2 (4)",
        desc: "Busca apresentar as três partes, mas com falhas; e/ou o tipo predominante no desenvolvimento é expositivo ou descritivo.",
      },
      {
        score: 6,
        label: "Nível 3 (6)",
        desc: "Apresenta suficientemente as três partes E o tipo predominante é argumentativo, mas ainda há trechos inadequados de exposição ou descrição.",
      },
      {
        score: 8,
        label: "Nível 4 (8)",
        desc: "Apresenta com clareza as três partes completas E o tipo é reconhecidamente argumentativo, com domínio evidente da estrutura composicional.",
      },
    ],
  },
  {
    id: "c3",
    label: "Critério 3 — Coesão, coerência e progressão (peso 3)",
    max: 12,
    weight: 3,
    hint: "Macroestrutura (início, meio e fim planejados, sem circularidade), microestrutura e coerência (sequenciação, ausência de lacunas/quebras e de incoerência externa) e articulação (recursos coesivos sequenciais, referenciais e lexicais).",
    levels: [
      {
        score: 3,
        label: "Nível 1 (3)",
        desc: "Parágrafos sem relação clara ou grave circularidade; falta de sequenciação ou contradições graves; poucos recursos de articulação, com relações semânticas insuficientes ou inapropriadas.",
      },
      {
        score: 6,
        label: "Nível 2 (6)",
        desc: "Apenas indícios de unidade textual ou conclusão sem relação com o texto; algumas lacunas/quebras; presença regular de recursos coesivos, mas com inadequações e repetição de palavras.",
      },
      {
        score: 9,
        label: "Nível 3 (9)",
        desc: "Texto evidentemente planejado, incoerências pontuais, sem circularidade; até UMA lacuna significativa ou DUAS quebras; coesão suficiente e adequada, com raras imprecisões. Qualquer incoerência externa trava a nota neste nível.",
      },
      {
        score: 12,
        label: "Nível 4 (12)",
        desc: "Planejamento estratégico e sem falhas, progressão argumentativa pensada para a defesa do ponto de vista; parágrafos bem organizados; articulações sintáticas e semânticas precisas, sem uso mecânico de recursos.",
      },
    ],
  },
  {
    id: "c4",
    label: "Critério 4 — Convenções da escrita e vocabulário (peso 2)",
    max: 8,
    weight: 2,
    hint: "Norma-padrão (ortografia, morfossintaxe, acentuação, pontuação), construção sintática e seleção vocabular precisa e expressiva, com concisão e sem clichê. A grade não usa o nível 2 neste critério.",
    levels: [
      {
        score: 2,
        label: "Nível 1 (2)",
        desc: "Domínio precário: desvios recorrentes que prejudicam a compreensão de ideias centrais e/ou predominância de parágrafos de período único; ou problemas recorrentes de vocabulário que atrapalham ideias centrais.",
      },
      {
        score: 4,
        label: "Nível 3 (4)",
        desc: "Domínio razoável: desvios frequentes que prejudicam apenas trechos pontuais, poucas falhas sintáticas e alguns problemas de seleção vocabular restritos a trechos pontuais.",
      },
      {
        score: 6,
        label: "Nível 4 (6)",
        desc: "Bom domínio: alguns desvios que não prejudicam a compreensão, no máximo uma construção sintática incompleta e poucos problemas vocabulares; pode haver trechos prolixos passíveis de refino.",
      },
      {
        score: 8,
        label: "Nível 5 (8)",
        desc: "Pleno domínio: desvios pontuais, sintaxe diversificada e complexa (inversões, subordinação bem usada) e precisão vocabular, sem vaguezas nem prolixidade — reconhece-se um autor seguro.",
      },
    ],
  },
];

const FUVEST_ZERO = [
  "Não desenvolver o tema: na proposta A, não abordar sequer o assunto da frase temática; na proposta B, não cumprir a tarefa principal do enunciado.",
  "Não atender ao tipo/gênero — inclui textos muito curtos (um ou dois parágrafos ou raciocínio interrompido no início) que impeçam reconhecer o tipo/gênero.",
  "Predominância de cópia integral dos textos da coletânea.",
  "Qualquer forma de identificação do candidato.",
];

const FUVEST_CAPS = [
  "Texto sem tese minimamente delimitada não passa do nível 1 no critério 2.",
  "Incoerência externa (dado, autor ou obra inventados/atribuídos errado) trava o critério 3 no nível 3.",
  "Cópia da coletânea = 3 ou mais palavras idênticas, mesmo com pequenas variações.",
  "Não há proposta de intervenção na FUVEST.",
];

/**
 * VUNESP (UNIFESP, UNESP, Famema, Famerp, Santa Casa, Einstein…).
 * Grade oficial de 14 pontos; critérios avaliados de forma independente.
 */
const UNIFESP_CRITERIA: EssayCriterion[] = [
  {
    id: "a",
    label: "Critério A — Tema (3 pontos)",
    max: 3,
    weight: 3,
    hint: "Critério objetivo: verifica-se apenas a presença das palavras-chave da frase temática (ou sinônimos próximos) no CORPO do texto — o título nunca conta. Não se avalia aqui a qualidade da abordagem.",
    levels: [
      { score: 0, label: "0,0", desc: "Fuga total do tema: não aborda sequer os assuntos mais gerais da proposta. Zera a redação inteira." },
      { score: 1, label: "1,0", desc: "Abordagem parcial: aparece apenas uma palavra-chave (ou sinônimo próximo) da frase temática." },
      {
        score: 2,
        label: "2,0",
        desc: "Abordagem parcial: aparecem algumas palavras-chave, mas não todas; ou aparecem todas, mas a falta de articulação (ou articulação equivocada) mostra que o tema não foi compreendido em sua totalidade.",
      },
      { score: 3, label: "3,0", desc: "Abordagem completa: todas as palavras-chave (ou sinônimos muito próximos) aparecem e o tema foi compreendido integralmente." },
    ],
  },
  {
    id: "b",
    label: "Critério B — Gênero/tipo de texto e coerência (4 pontos)",
    max: 4,
    weight: 4,
    hint: "Estrutura dissertativa completa, autonomia do texto (sem 1ª pessoa do singular, sem interlocução com o leitor e sem referência à situação de prova), tese sustentada, argumentos desenvolvidos, progressão e ausência de contradições.",
    levels: [
      { score: 0, label: "0", desc: "Fuga total ao gênero: o texto é integralmente outro gênero (carta, narração, poema). Zera a redação inteira." },
      {
        score: 1,
        label: "1,0",
        desc: "Tangenciamento do gênero (dissertação não é predominante) e/ou faltam duas partes da dissertação; e/ou argumentos caóticos, sem direção única; e/ou contradições graves que invalidam o ponto de vista.",
      },
      {
        score: 2,
        label: "2,0",
        desc: "Gênero previsto, mas com referência à situação de produção ou interlocução com o leitor, e/ou falta uma das partes; e/ou lista de comentários, encadeamento ruim, circularidade ou argumentos superficiais (sem os PORQUÊS e COMO); e/ou contradições pontuais.",
      },
      {
        score: 3,
        label: "3,0",
        desc: "Gênero e estrutura macro completos, mas com uso de 1ª pessoa do singular; e/ou a maioria dos argumentos é desenvolvida, com lacunas ou quebras pontuais. Sem contradições.",
      },
      {
        score: 4,
        label: "4,0",
        desc: "Gênero previsto com estrutura macro completa E bom desenvolvimento: argumentos justificados, convergentes ao ponto de vista, com progressão (texto estratégico) e sem contradições.",
      },
    ],
  },
  {
    id: "c",
    label: "Critério C — Modalidade e registro (4 pontos)",
    max: 4,
    weight: 4,
    hint: "Norma-padrão e registro formal: concordância, regência, ortografia, acentuação, pontuação, precisão vocabular e grau de formalidade. Avalia-se a QUANTIDADE de desvios. Não há nota 0 neste critério.",
    levels: [
      {
        score: 1,
        label: "1,0",
        desc: "Excesso de desvios E excesso de falhas sintáticas, prejudicando fluidez e compreensão; ou muitos desvios, alguns considerados graves para o nível de escolaridade.",
      },
      { score: 2, label: "2,0", desc: "Há muitos desvios gramaticais e/ou de convenção da escrita." },
      { score: 3, label: "3,0", desc: "Há eventuais desvios gramaticais e/ou de convenção da escrita." },
      { score: 4, label: "4,0", desc: "Há raros desvios gramaticais e/ou de convenção da escrita." },
    ],
  },
  {
    id: "d",
    label: "Critério D — Coesão (3 pontos)",
    max: 3,
    weight: 3,
    hint: "Recursos coesivos (anáforas, catáforas, substituições, conjunções) e domínio das construções sintáticas. Truncamentos e justaposições contam como aspecto negativo. Não há nota 0 neste critério.",
    levels: [
      {
        score: 1,
        label: "1,0",
        desc: "Recursos coesivos escassos ou equivocados; e/ou muita repetição de conectivos; e/ou muitas construções frasais incompletas, truncamentos ou justaposições; e/ou construções estritamente nominais; e/ou parágrafos muito curtos; e/ou texto em monobloco.",
      },
      {
        score: 2,
        label: "2,0",
        desc: "Uso satisfatório: conectivos apropriados na maior parte do texto, com poucas falhas; pode haver algumas construções nominais, frases incompletas ou justaposições. Predominância de parágrafos de período único não passa desta nota.",
      },
      { score: 3, label: "3,0", desc: "Uso adequado, sem falhas e diversificado, com excelente ligação entre as partes; pode ocorrer rara falha de construção frasal." },
    ],
  },
];

const UNIFESP_ZERO = [
  "Fuga ao tema (nenhum elemento da frase temática) ou fuga ao gênero (texto integralmente de outro gênero).",
  "Textos com 7 linhas ou menos, ou com menos de 8 linhas autorais contínuas.",
  "Predominância de cópia da coletânea, plágio ou reprodução de modelos prontos.",
  "Texto em branco, ilegível, em língua estrangeira, identificado ou com anulação proposital.",
];

const UNIFESP_CAPS = [
  "O título NUNCA é considerado na avaliação — nem para o critério A.",
  "Descontar 1 ponto nos critérios C e D em textos com 15 linhas ou menos.",
  "Textos com 20 linhas ou menos não alcançam a nota máxima em C nem em D.",
  "Trechos de cópia ou predominância de paráfrase da coletânea puxam B, C e D para a pontuação mínima.",
  "1ª pessoa do singular trava o critério B em 3,0; interlocução com o leitor ou referência à prova trava em 2,0.",
  "Não é necessária proposta de intervenção.",
];

const ENEM_CRITERIA: EssayCriterion[] = [
  {
    id: "c1",
    label: "Competência 1 — Modalidade escrita formal",
    max: 200,
    hint: "Avalia estrutura sintática (truncamento, justaposição, excesso/ausência de elementos) e a QUANTIDADE de desvios. Se o texto se enquadra em dois níveis diferentes, vale o nível mais baixo.",
    levels: [
      { score: 0, label: "0", desc: "Estrutura sintática inexistente, independentemente da quantidade de desvios." },
      { score: 40, label: "40", desc: "Estrutura sintática deficitária E muitos desvios." },
      { score: 80, label: "80", desc: "Estrutura sintática deficitária OU muitos desvios." },
      { score: 120, label: "120", desc: "Estrutura sintática regular E alguns desvios." },
      { score: 160, label: "160", desc: "Estrutura sintática boa E poucos desvios." },
      { score: 200, label: "200", desc: "Estrutura sintática excelente (no máximo uma falha) E no máximo dois desvios." },
    ],
  },
  {
    id: "c2",
    label: "Competência 2 — Tema, estrutura e repertório",
    max: 200,
    hint: "Domínio da estrutura dissertativo-argumentativa, compreensão do tema e uso de repertório sociocultural legitimado, pertinente e produtivo (externo aos textos motivadores).",
    levels: [
      { score: 0, label: "0", desc: "Fuga total do tema e/ou não atendimento à estrutura dissertativo-argumentativa. Zera a redação." },
      { score: 40, label: "40", desc: "Tangência do tema, ou aglomerado de palavras, ou traços constantes de outros tipos textuais." },
      { score: 80, label: "80", desc: "Abordagem completa E três partes, sendo duas embrionárias, ou conclusão finalizada por frase incompleta. Muitas cópias dos textos motivadores não ultrapassam este nível." },
      { score: 120, label: "120", desc: "Abordagem completa E três partes (uma pode ser embrionária) e/ou repertório baseado nos motivadores, não legitimado, não pertinente ou 'de bolso'." },
      { score: 160, label: "160", desc: "Abordagem completa E três partes não embrionárias E repertório legitimado e pertinente, mas sem uso produtivo." },
      { score: 200, label: "200", desc: "Abordagem completa E três partes não embrionárias E repertório legitimado, pertinente E produtivo." },
    ],
  },
  {
    id: "c3",
    label: "Competência 3 — Projeto de texto e argumentação",
    max: 200,
    hint: "Selecionar, relacionar, organizar e interpretar informações em defesa de um ponto de vista, com projeto de texto e desenvolvimento das ideias. Enquadrando-se em dois níveis, vale o inferior.",
    levels: [
      { score: 0, label: "0", desc: "Texto tangente E sem direção: afirmações desconexas, sem ponto de vista claro." },
      { score: 40, label: "40", desc: "Texto tangente, mas com direção: coerente e com ponto de vista, tratando só do assunto geral." },
      { score: 80, label: "80", desc: "Projeto de texto com muitas falhas E sem desenvolvimento ou desenvolvimento de apenas uma informação. Contradições graves não ultrapassam este nível." },
      { score: 120, label: "120", desc: "Projeto de texto com algumas falhas E desenvolvimento de algumas informações, fatos e opiniões." },
      { score: 160, label: "160", desc: "Projeto de texto com poucas falhas E desenvolvimento da maior parte das informações." },
      { score: 200, label: "200", desc: "Projeto de texto estratégico E desenvolvimento em todo o texto (admitem-se deslizes pontuais)." },
    ],
  },
  {
    id: "c4",
    label: "Competência 4 — Coesão",
    max: 200,
    hint: "Elementos coesivos inter e intraparágrafos, repetições e adequação dos conectivos. Enquadrando-se em dois níveis, vale o inferior.",
    levels: [
      { score: 0, label: "0", desc: "Palavras e períodos justapostos e desconexos em todo o texto." },
      { score: 40, label: "40", desc: "Presença rara de elementos coesivos e/ou excessivas repetições e/ou excessivas inadequações no uso de conectivos." },
      { score: 80, label: "80", desc: "Presença pontual de elementos coesivos e/ou excessivas repetições e/ou muitas inadequações. Texto em monobloco não ultrapassa este nível." },
      { score: 120, label: "120", desc: "Presença regular de elementos coesivos e/ou algumas repetições e/ou algumas inadequações." },
      { score: 160, label: "160", desc: "Presença constante de elementos coesivos e/ou poucas repetições e/ou poucas inadequações." },
      { score: 200, label: "200", desc: "Presença expressiva de elementos coesivos E no máximo uma repetição de conectivo E sem inadequações." },
    ],
  },
  {
    id: "c5",
    label: "Competência 5 — Proposta de intervenção",
    max: 200,
    hint: "Cinco elementos: agente, ação, meio, finalidade e detalhamento, em qualquer parte do texto, respeitando os direitos humanos. Ideias vagas como 'conscientização' sem complemento são elementos nulos.",
    levels: [
      { score: 0, label: "0", desc: "Ausência ou cópia integral da proposta; ou proposta que desrespeita os direitos humanos; ou proposta não relacionada ao assunto." },
      { score: 40, label: "40", desc: "Tangenciamento do tema e/ou apenas elementos nulos e/ou 1 elemento válido." },
      { score: 80, label: "80", desc: "2 elementos válidos. Estruturas condicionais e propostas sem o elemento 'ação' não ultrapassam este nível." },
      { score: 120, label: "120", desc: "3 elementos válidos." },
      { score: 160, label: "160", desc: "4 elementos válidos." },
      { score: 200, label: "200", desc: "5 elementos válidos." },
    ],
  },
];

const ENEM_ZERO = [
  "Texto em branco ou com até 7 linhas (título incluso).",
  "Formas elementares de anulação: identificação do aluno, desenhos/emojis, números soltos, sinais gráficos isolados, anulação proposital, recusa, texto ilegível ou em língua estrangeira.",
  "Cópia literal dos textos motivadores/proposta com menos de 8 linhas autorais.",
  "Fuga total do tema (palavras-chave só no título não valem) ou não atendimento ao tipo dissertativo-argumentativo.",
  "Parte desconectada: recados à banca, mensagens religiosas/políticas, identificação no corpo do texto.",
];

const ENEM_CAPS = [
  "Hierarquia de anulação: formas elementares → cópia → fuga ao tema → parte desconectada → não atendimento ao tipo.",
  "Texto tangente ao tema não passa de 40 em C2, C3 e C5.",
  "Em C1, C3 e C4, quando o texto se enquadra em dois níveis, vale sempre o nível mais baixo.",
  "Notas só podem ser 0, 40, 80, 120, 160 ou 200 em cada competência.",
];

export const BOARDS: EssayBoard[] = [
  {
    id: "FUVEST",
    label: "FUVEST",
    maxScore: 40,
    lines: "máximo de 30 linhas (sem mínimo)",
    words: { min: 200, ideal: 300, max: 380 },
    style:
      "Grade oficial da Fuvest (40 pontos, 4 critérios com pesos 3-2-3-2). São DUAS propostas: (A) dissertação argumentativa a partir de uma frase temática e (B) um gênero textual com tarefas explícitas. A prova se estrutura sobre a intertextualidade: é obrigatório ler os textos-fonte sob a perspectiva exata da frase temática e ecoá-los no próprio raciocínio, sem copiar. Não há proposta de intervenção.",
    criteria: FUVEST_CRITERIA,
    zeroRules: FUVEST_ZERO,
    caps: FUVEST_CAPS,
  },
  {
    id: "UNIFESP",
    label: "UNIFESP (Vunesp)",
    maxScore: 14,
    lines: "20 a 30 linhas (15 ou menos perde 1 ponto em C e D)",
    words: { min: 220, ideal: 300, max: 360 },
    style:
      "Grade oficial Vunesp (14 pontos): A-Tema 3, B-Gênero e coerência 4, C-Modalidade 4, D-Coesão 3, avaliados de forma independente. Metade da nota está em aspectos formais (modalidade e coesão). Frase temática quase sempre com dois polos; texto autônomo, em 3ª pessoa, sem interlocução com o leitor. Não é necessária proposta de intervenção.",
    criteria: UNIFESP_CRITERIA,
    zeroRules: UNIFESP_ZERO,
    caps: UNIFESP_CAPS,
  },
  {
    id: "ENEM",
    label: "ENEM",
    maxScore: 1000,
    lines: "até 30 linhas (mínimo de 8 linhas autorais)",
    words: { min: 250, ideal: 330, max: 400 },
    style:
      "Cinco competências de peso igual, cada uma de 0 a 200 em intervalos de 40. Tema é um problema social, científico, cultural ou político brasileiro, e a conclusão exige proposta de intervenção com agente, ação, meio, finalidade e detalhamento, compatível com os direitos humanos.",
    criteria: ENEM_CRITERIA,
    zeroRules: ENEM_ZERO,
    caps: ENEM_CAPS,
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
