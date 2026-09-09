import type { BoardId } from "./redacao-guide";

/**
 * Roteiro do treino guiado: o aluno escreve UM período por vez e recebe
 * devolutiva imediata antes de avançar. Cada passo diz qual é a função daquele
 * período dentro do texto, o que precisa aparecer nele e o tamanho esperado.
 */
export type CoachBlock = "introducao" | "d1" | "d2" | "conclusao";

export type CoachStep = {
  id: string;
  block: CoachBlock;
  blockLabel: string;
  label: string;
  goal: string;
  checklist: string[];
  hint: string;
  words: { min: number; max: number };
};

const intro = (board: BoardId): CoachStep[] => [
  {
    id: "i1",
    block: "introducao",
    blockLabel: "Introdução",
    label: "Período 1 · Contextualização",
    goal: "Abrir o texto com uma informação externa à coletânea que situe o problema.",
    checklist: [
      "Traga um fato histórico, conceito, autor, obra ou dado — nada de 'nos dias atuais' ou 'desde os primórdios'.",
      "A informação precisa ter relação direta com o recorte do tema.",
      "Um período só, na terceira pessoa, sem opinião ainda.",
    ],
    hint:
      board === "ENEM"
        ? "No ENEM esse repertório já conta para a C2: precisa ser legitimado e produtivo, não decorativo."
        : board === "FUVEST"
          ? "Na Fuvest a abertura já mostra autoria: escolha um repertório que você consiga explorar depois."
          : "Na UNIFESP/Vunesp uma abertura precisa e específica vale mais que uma grandiloquente.",
    words: { min: 15, max: 40 },
  },
  {
    id: "i2",
    block: "introducao",
    blockLabel: "Introdução",
    label: "Período 2 · Aproximação do tema",
    goal: "Puxar a contextualização para a frase temática exata da proposta.",
    checklist: [
      "Use as palavras-chave do tema (ou sinônimos precisos delas).",
      "Explicite o problema/impasse que a proposta coloca.",
      "Não repita o enunciado inteiro: reformule.",
    ],
    hint: "Este período é a ponte: sem ele, a introdução fica com dois assuntos soltos.",
    words: { min: 15, max: 40 },
  },
  {
    id: "i3",
    block: "introducao",
    blockLabel: "Introdução",
    label: "Período 3 · Tese + encaminhamento",
    goal: "Assumir um posicionamento claro e anunciar os dois eixos do desenvolvimento.",
    checklist: [
      "Diga o que você defende, sem 'talvez', 'pode ser' ou pergunta.",
      "Se o tema tem dois polos, hierarquize: diga qual prevalece.",
      "Anuncie os dois argumentos (de preferência causa e consequência).",
    ],
    hint:
      board === "ENEM"
        ? "É aqui que nasce o projeto de texto da C3: o que você anunciar, precisa cumprir."
        : "A banca lê a tese como promessa: os dois eixos anunciados viram D1 e D2.",
    words: { min: 20, max: 45 },
  },
];

const dev = (n: 1 | 2, board: BoardId): CoachStep[] => {
  const block: CoachBlock = n === 1 ? "d1" : "d2";
  const blockLabel = `Desenvolvimento ${n}`;
  const foco = n === 1 ? "a CAUSA do problema" : "a CONSEQUÊNCIA do problema";
  return [
    {
      id: `${block}-1`,
      block,
      blockLabel,
      label: `Período 1 · Tópico frasal`,
      goal: `Anunciar o argumento deste parágrafo, ligado à tese e centrado em ${foco}.`,
      checklist: [
        "Comece com um conectivo variado (evite 'além disso' e 'primeiramente').",
        "Retome a tese em poucas palavras.",
        "Anuncie UMA ideia só — a que você vai defender até o fim do parágrafo.",
      ],
      hint: "Se o tópico frasal tiver duas ideias, o parágrafo vai se perder. Escolha uma.",
      words: { min: 15, max: 35 },
    },
    {
      id: `${block}-2`,
      block,
      blockLabel,
      label: "Período 2 · Explicação do mecanismo",
      goal: "Explicar por que isso acontece: causa, estrutura, interesse envolvido.",
      checklist: [
        "Responda 'por quê?' à afirmação anterior.",
        "Analise, não descreva: mostre o processo, não só o resultado.",
        "Nada de exemplo ainda.",
      ],
      hint: "É este período que separa argumento de opinião solta.",
      words: { min: 20, max: 45 },
    },
    {
      id: `${block}-3`,
      block,
      blockLabel,
      label: "Período 3 · Repertório aplicado",
      goal: "Trazer autor, conceito, dado, obra ou fato e USAR na sua análise.",
      checklist: [
        "Cite a fonte com precisão (quem disse, de onde vem o dado).",
        "Depois de citar, explique o que aquilo prova no SEU argumento.",
        board === "FUVEST"
          ? "Dialogue com a coletânea e extrapole-a — não a resuma."
          : "Se usar a coletânea, extrapole: acrescente algo que ela não diz.",
      ],
      hint: "Repertório sem aplicação vira enfeite e não pontua.",
      words: { min: 20, max: 50 },
    },
    {
      id: `${block}-4`,
      block,
      blockLabel,
      label: "Período 4 · Exemplo concreto + amarração",
      goal: "Mostrar o fenômeno acontecendo e fechar o parágrafo de volta na tese.",
      checklist: [
        "Um caso concreto (brasileiro e atual, de preferência) que ilustre o mecanismo.",
        "Encerre ligando explicitamente o argumento à tese.",
        "Sem começar assunto novo.",
      ],
      hint: "Parágrafo que termina no exemplo deixa a conclusão do raciocínio para o corretor. Feche você.",
      words: { min: 20, max: 50 },
    },
  ];
};

const conclusao = (board: BoardId): CoachStep[] =>
  board === "ENEM"
    ? [
        {
          id: "c1",
          block: "conclusao",
          blockLabel: "Conclusão",
          label: "Período 1 · Retomada",
          goal: "Retomar a tese com outras palavras e sintetizar o percurso.",
          checklist: [
            "Não repita as frases da introdução.",
            "Sintetize, não reapresente os argumentos um a um.",
          ],
          hint: "Duas linhas bastam: o peso da C5 está no período seguinte.",
          words: { min: 15, max: 40 },
        },
        {
          id: "c2",
          block: "conclusao",
          blockLabel: "Conclusão",
          label: "Período 2 · Proposta de intervenção",
          goal: "Apresentar agente, ação, meio, finalidade e detalhamento numa mesma proposta.",
          checklist: [
            "Agente específico (ministério, escola, mídia — não 'o governo' genérico).",
            "Ação clara + meio pelo qual ela acontece.",
            "Finalidade ligada ao problema discutido + um detalhamento de um desses elementos.",
            "Respeite os direitos humanos.",
          ],
          hint: "Pode dividir em dois períodos se ficar longo — mas os cinco elementos precisam estar lá.",
          words: { min: 30, max: 70 },
        },
        {
          id: "c3",
          block: "conclusao",
          blockLabel: "Conclusão",
          label: "Período 3 · Fechamento",
          goal: "Fechar com uma frase curta que projete o efeito da proposta.",
          checklist: ["Curto e sem clichê.", "Ligado ao repertório da introdução, se possível."],
          hint: "Fechar retomando a abertura dá circularidade e impressiona o corretor.",
          words: { min: 10, max: 30 },
        },
      ]
    : [
        {
          id: "c1",
          block: "conclusao",
          blockLabel: "Conclusão",
          label: "Período 1 · Retomada da tese",
          goal: "Reafirmar o posicionamento com outras palavras, mantendo a hierarquia da tese.",
          checklist: ["Sem repetir a introdução.", "Sem introduzir argumento novo."],
          hint:
            board === "FUVEST"
              ? "Na Fuvest não existe proposta de intervenção: a conclusão fecha o raciocínio."
              : "Na UNIFESP a conclusão é breve — reafirme qual polo prevalece.",
          words: { min: 15, max: 40 },
        },
        {
          id: "c2",
          block: "conclusao",
          blockLabel: "Conclusão",
          label: "Período 2 · Avanço",
          goal: "Dizer algo novo: consequência, risco, dilema em aberto ou caminho possível.",
          checklist: [
            "Avance em relação à introdução — não resuma o texto.",
            "Mantenha o tom analítico, sem apelo emocional.",
          ],
          hint: "É aqui que a banca vê maturidade de raciocínio.",
          words: { min: 20, max: 45 },
        },
        {
          id: "c3",
          block: "conclusao",
          blockLabel: "Conclusão",
          label: "Período 3 · Frase final",
          goal: "Encerrar com uma frase curta e precisa.",
          checklist: ["Sem clichê e sem pergunta retórica.", "Máximo duas linhas."],
          hint: "Retomar a imagem/repertório da abertura fecha o texto com elegância.",
          words: { min: 8, max: 28 },
        },
      ];

export const coachScript = (board: BoardId): CoachStep[] => [
  ...intro(board),
  ...dev(1, board),
  ...dev(2, board),
  ...conclusao(board),
];

export const COACH_BLOCK_ORDER: CoachBlock[] = ["introducao", "d1", "d2", "conclusao"];
