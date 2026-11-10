// =============================================================================
// PERSONALIZAÇÃO DE CONTEÚDO E MOVIMENTO DA LANDING PAGE
//
// Altere os valores abaixo e salve. Os componentes leem tudo daqui.
// Cores, fontes, tamanhos, espaçamentos e telas de celular: personalizar.css.
//
// Índice (use Ctrl+F):
//   LINKS            para onde cada botão leva
//   IMAGENS          caminhos do logo e da imagem de fundo
//   TEXTOS           tudo o que está escrito na página
//   DADOS_EXEMPLO    a rotina mostrada na tela do aplicativo
//   ANIMACOES        duração, velocidade e intensidade dos movimentos
// =============================================================================


// -----------------------------------------------------------------------------
// LINKS
// -----------------------------------------------------------------------------
export const LINKS = {
  cadastro: '/cadastro', // ALTERE AQUI PARA ONDE VAI O BOTÃO CRIAR CONTA
  login: '/login', // ALTERE AQUI PARA ONDE VAI O BOTÃO ENTRAR
  inicio: '/', // ALTERE AQUI PARA ONDE VAI O CLIQUE NO LOGO
  comoFunciona: '#como', // ALTERE AQUI PARA ONDE VAI O BOTÃO VER COMO FUNCIONA
  privacidade: '/privacidade', // ALTERE AQUI O DESTINO DO LINK PRIVACIDADE DO RODAPÉ
  termos: '/termos', // ALTERE AQUI O DESTINO DO LINK TERMOS DO RODAPÉ
  contato: null, // ALTERE AQUI O ENDEREÇO DE CONTATO DO RODAPÉ. EX: 'mailto:voce@exemplo.com'. COM null, O LINK NÃO APARECE
};


// -----------------------------------------------------------------------------
// IMAGENS
// Coloque o arquivo em frontend/public/imagens/ e informe o caminho começando
// com /imagens/. Com null, a página usa o símbolo desenhado e nenhuma foto.
// Tamanho, proporção, foco e opacidade: seção 6 de personalizar.css.
// -----------------------------------------------------------------------------
export const IMAGENS = {
  logo: {
    caminho: null, // ALTERE AQUI O CAMINHO DO LOGO. EX: '/imagens/logo.png'
    descricao: '', // ALTERE AQUI A DESCRIÇÃO DO LOGO PARA LEITORES DE TELA
  },
  fundoHero: {
    caminho: null, // ALTERE AQUI O CAMINHO DA IMAGEM DE FUNDO DO TOPO. EX: '/imagens/fundo.jpg'
  },
  demonstracao: {
    largura: 1280, // ALTERE AQUI A LARGURA ORIGINAL DAS CAPTURAS, EM PIXELS
    altura: 800, // ALTERE AQUI A ALTURA ORIGINAL DAS CAPTURAS, EM PIXELS
    telas: [
      { rotulo: 'Hoje', caminho: '/imagens/demo-hoje.jpg', descricao: 'Tela Hoje, com a atividade atual, a faixa do dia e a lista da rotina.', texto: 'Mostra a atividade do horário atual, quanto tempo resta e a rotina do dia em ordem. É aqui que você marca o que fez.' }, // ALTERE AQUI A EXPLICAÇÃO E A CAPTURA DE HOJE
      { rotulo: 'Planejar', caminho: '/imagens/demo-planejar.jpg', descricao: 'Tela Planejar, com os horários do dia e o formulário de atividade.', texto: 'Escolha o dia e clique em um horário para criar a atividade, com categoria, tipo fixo ou flexível, repetição e etapas.' }, // ALTERE AQUI A EXPLICAÇÃO E A CAPTURA DE PLANEJAR
      { rotulo: 'Semana', caminho: '/imagens/demo-semana.jpg', descricao: 'Tela Semana, com as atividades distribuídas por dia e hora.', texto: 'Mostra os sete dias lado a lado e o quanto foi cumprido em cada um.' }, // ALTERE AQUI A EXPLICAÇÃO E A CAPTURA DE SEMANA
      { rotulo: 'Repetições', caminho: '/imagens/demo-repeticoes.jpg', descricao: 'Tela Repetições, com a lista de ações que se repetem.', texto: 'Lista as ações que se repetem, com a regra e o horário de cada uma. Daqui você altera ou encerra uma repetição.' }, // ALTERE AQUI A EXPLICAÇÃO E A CAPTURA DE REPETIÇÕES
      { rotulo: 'Inbox', caminho: '/imagens/demo-inbox.jpg', descricao: 'Tela Inbox, com atividades sem horário.', texto: 'Guarda o que ainda não tem horário, com a duração estimada. O Plannio procura horários livres para encaixar cada item.' }, // ALTERE AQUI A EXPLICAÇÃO E A CAPTURA DA INBOX
      { rotulo: 'Progresso', caminho: '/imagens/demo-progresso.jpg', descricao: 'Tela Progresso, com a ofensiva, o cumprido por dia e o tempo por categoria.', texto: 'Reúne a ofensiva atual e a maior, o percentual cumprido por dia, o tempo por categoria e o histórico de alterações.' }, // ALTERE AQUI A EXPLICAÇÃO E A CAPTURA DE PROGRESSO
      { rotulo: 'Configurações', caminho: '/imagens/demo-configuracoes.jpg', descricao: 'Tela Configurações, com categorias, horário do dia, tema e conta.', texto: 'Define as categorias com cor e meta semanal, o horário do dia, o tema claro ou escuro e os dados da conta.' }, // ALTERE AQUI A EXPLICAÇÃO E A CAPTURA DE CONFIGURAÇÕES
    ],
  },
};


// -----------------------------------------------------------------------------
// TEXTOS
// -----------------------------------------------------------------------------
export const TEXTOS = {
  marca: 'Plannio', // ALTERE AQUI O NOME DO PRODUTO
  slogan: 'Sua rotina, hora por hora.', // ALTERE AQUI A FRASE DO RODAPÉ

  menu: [
    { rotulo: 'Como funciona', destino: '#como' }, // ALTERE AQUI O PRIMEIRO LINK DO MENU
    { rotulo: 'Cada área', destino: '#areas' }, // ALTERE AQUI O SEGUNDO LINK DO MENU
    { rotulo: 'Regras', destino: '#regras' }, // ALTERE AQUI O TERCEIRO LINK DO MENU
    { rotulo: 'Dúvidas', destino: '#duvidas' }, // ALTERE AQUI O QUARTO LINK DO MENU
  ],

  botoes: {
    comoFunciona: 'Ver como funciona', // ALTERE AQUI O TEXTO DO BOTÃO PRINCIPAL
    entrar: 'Entrar', // ALTERE AQUI O TEXTO DO BOTÃO SECUNDÁRIO
    criarMenu: 'Criar conta', // ALTERE AQUI O TEXTO DO BOTÃO DO MENU
    entrarMenu: 'Entrar', // ALTERE AQUI O TEXTO DO LINK ENTRAR DO MENU
  },

  hero: {
    titulo: 'Saiba o que fazer agora.', // ALTERE AQUI O TÍTULO PRINCIPAL
    subtitulo: 'Você preenche o que vai fazer em cada horário, e o Plannio mostra a atividade do momento e o que vem depois.', // ALTERE AQUI O SUBTÍTULO
  },

  comoFunciona: {
    rotulo: 'Passo a passo', // ALTERE AQUI O RÓTULO DA SEÇÃO DE PASSOS
    titulo: 'O dia a dia no Plannio.', // ALTERE AQUI O TÍTULO DA SEÇÃO DE PASSOS
    passos: [
      { titulo: 'Preencha as horas', texto: 'Em Planejar, escolha um dia, clique em um horário livre e escreva o que vai fazer.' }, // ALTERE AQUI O PRIMEIRO PASSO
      { titulo: 'Marque o que se repete', texto: 'Uma ação pode valer só naquele dia, todos os dias, em dias úteis, em dias escolhidos ou em um intervalo seu.' }, // ALTERE AQUI O SEGUNDO PASSO
      { titulo: 'Siga a tela Hoje', texto: 'Ela mostra a atividade do horário atual, quanto tempo resta e o que vem depois.' }, // ALTERE AQUI O TERCEIRO PASSO
      { titulo: 'Marque o que fez', texto: 'Uma caixa registra a atividade como concluída. Ela também pode ficar como parcial, não realizada ou adiada.' }, // ALTERE AQUI O QUARTO PASSO
      { titulo: 'Reorganize se atrasar', texto: 'Em Preciso reorganizar, você vê até três novos horários e o que muda em cada um. Só muda se você confirmar.' }, // ALTERE AQUI O QUINTO PASSO
      { titulo: 'Feche o dia', texto: 'No fim do dia, marque o que aconteceu com o que ficou aberto. A semana e a ofensiva usam esse registro.' }, // ALTERE AQUI O SEXTO PASSO
    ],
  },

  demonstracao: {
    rotulo: 'As áreas', // ALTERE AQUI O RÓTULO DA SEÇÃO DAS ÁREAS
    titulo: 'Cada área do aplicativo.', // ALTERE AQUI O TÍTULO DA SEÇÃO DAS ÁREAS
    nota: 'Telas reais do aplicativo, preenchidas com dados de exemplo.', // ALTERE AQUI A NOTA ABAIXO DAS CAPTURAS
  },

  recursos: {
    rotulo: 'As regras', // ALTERE AQUI O RÓTULO DA SEÇÃO DE REGRAS
    titulo: 'Como o Plannio decide.', // ALTERE AQUI O TÍTULO DA SEÇÃO DE REGRAS
    // Cada card: titulo, texto, largo (true ocupa mais colunas) e peca (ilustração:
    // 'opcoes', 'quadrados', 'metas', 'dias', 'faixa', 'inbox' ou null). A ordem aqui é a da página.
    cards: [
      { titulo: 'Reorganizar', texto: 'A busca tenta um horário livre no dia, depois move atividades flexíveis para mais tarde e, por fim, olha os próximos sete dias. Nada é salvo até você confirmar.', largo: true, peca: 'opcoes' }, // ALTERE AQUI O CARD DE REORGANIZAR
      { titulo: 'Ofensiva', texto: 'Um dia conta quando tudo o que ficou nele foi concluído. Dias sem atividades não somam nem quebram a sequência.', largo: false, peca: 'quadrados' }, // ALTERE AQUI O CARD DA OFENSIVA
      { titulo: 'Metas por categoria', texto: 'São horas por semana. O tempo conta pelo horário real, quando informado, ou pela duração planejada.', largo: false, peca: 'metas' }, // ALTERE AQUI O CARD DE METAS
      { titulo: 'Repetições', texto: 'Alterar este e os próximos não muda o passado e mantém os dias já alterados individualmente.', largo: false, peca: 'dias' }, // ALTERE AQUI O CARD DE REPETIÇÕES
      { titulo: 'Inbox', texto: 'Encaixar um item usa só horários livres e não move outras atividades.', largo: false, peca: 'inbox' }, // ALTERE AQUI O CARD DA INBOX
      { titulo: 'A faixa do dia', texto: 'Mostra o que já passou, a atividade atual e o que vem depois.', largo: true, peca: 'faixa' }, // ALTERE AQUI O CARD DA FAIXA DO DIA
      { titulo: 'Fixo e flexível', texto: 'Um compromisso fixo só muda por edição manual. Uma atividade flexível pode receber novos horários.', largo: false, peca: null }, // ALTERE AQUI O CARD DE FIXO E FLEXÍVEL
    ],
  },

  duvidas: {
    mostrar: false, // ALTERE AQUI PARA true PARA A SEÇÃO DE DÚVIDAS VOLTAR A APARECER
    titulo: 'Dúvidas', // ALTERE AQUI O TÍTULO DA SEÇÃO DE DÚVIDAS
    perguntaAberta: 0, // ALTERE AQUI QUAL PERGUNTA COMEÇA ABERTA: 0 É A PRIMEIRA, -1 DEIXA TODAS FECHADAS
    itens: [
      { pergunta: 'Preciso instalar alguma coisa?', resposta: 'Não. O Plannio abre no navegador, no computador e no celular, com a mesma conta.' }, // ALTERE AQUI A PERGUNTA SOBRE INSTALAÇÃO
      { pergunta: 'E se eu me atrasar?', resposta: 'Em Preciso reorganizar, você vê até três opções com tudo o que muda em cada uma. Nada é salvo até você confirmar, e compromissos fixos não saem do lugar.' }, // ALTERE AQUI A PERGUNTA SOBRE ATRASOS
      { pergunta: 'Reorganizar quebra minha ofensiva?', resposta: 'Não. O dia conta quando tudo o que ficou nele está concluído, mesmo que você tenha mudado algum horário.' }, // ALTERE AQUI A PERGUNTA SOBRE A OFENSIVA
      { pergunta: 'O Plannio envia lembretes?', resposta: 'Não nesta versão. O que fazer em cada hora aparece na própria tela.' }, // ALTERE AQUI A PERGUNTA SOBRE LEMBRETES
      { pergunta: 'Quem vê os meus dados?', resposta: 'Só você. Cada conta acessa apenas os próprios dados, e a senha nunca é guardada em texto.' }, // ALTERE AQUI A PERGUNTA SOBRE PRIVACIDADE
    ],
  },

  rodape: {
    privacidade: 'Privacidade', // ALTERE AQUI O TEXTO DO LINK PRIVACIDADE
    termos: 'Termos', // ALTERE AQUI O TEXTO DO LINK TERMOS
    contato: 'Contato', // ALTERE AQUI O TEXTO DO LINK CONTATO
  },

  opcoes: {
    titulo: 'Reorganizar: Hora de estudar', // ALTERE AQUI O TÍTULO DO CARD DE OPÇÕES
    itens: [
      { horario: 'Hoje, 20:00 às 21:30', detalhe: 'Nenhuma outra atividade muda.' }, // ALTERE AQUI A PRIMEIRA OPÇÃO DE EXEMPLO
      { horario: 'Hoje, 14:30 às 16:00', detalhe: 'Também mudam: Inglês e Organizar o quarto.' }, // ALTERE AQUI A SEGUNDA OPÇÃO DE EXEMPLO
      { horario: 'Amanhã, 14:00 às 15:30', detalhe: 'Nenhuma outra atividade muda.' }, // ALTERE AQUI A TERCEIRA OPÇÃO DE EXEMPLO
    ],
  },
};


// -----------------------------------------------------------------------------
// DADOS_EXEMPLO
// O conteúdo de demonstração na tela do aplicativo. Horários em minutos desde
// 00:00: 840 é 14:00 (14 x 60).
// -----------------------------------------------------------------------------
export const DADOS_EXEMPLO = {
  agora: 860, // ALTERE AQUI A HORA ATUAL DA DEMONSTRAÇÃO. 860 É 14:20
  inicioDoDia: 360, // ALTERE AQUI O COMEÇO DA FAIXA DO DIA. 360 É 06:00
  fimDoDia: 1380, // ALTERE AQUI O FIM DA FAIXA DO DIA. 1380 É 23:00

  rotina: [
    { inicio: 390, fim: 420, nome: 'Acordar', categoria: 'Pessoal' }, // ALTERE AQUI A ATIVIDADE DAS 06:30
    { inicio: 480, fim: 720, nome: 'Faculdade', categoria: 'Faculdade', fixo: true }, // ALTERE AQUI A ATIVIDADE DAS 08:00
    { inicio: 720, fim: 780, nome: 'Almoço', categoria: 'Pessoal' }, // ALTERE AQUI A ATIVIDADE DAS 12:00
    { inicio: 840, fim: 930, nome: 'Hora de estudar', categoria: 'Estudos' }, // ALTERE AQUI A ATIVIDADE DAS 14:00
    { inicio: 930, fim: 990, nome: 'Inglês', categoria: 'Estudos' }, // ALTERE AQUI A ATIVIDADE DAS 15:30
    { inicio: 1020, fim: 1110, nome: 'Academia', categoria: 'Saúde', fixo: true }, // ALTERE AQUI A ATIVIDADE DAS 17:00
    { inicio: 1170, fim: 1200, nome: 'Jantar', categoria: 'Pessoal' }, // ALTERE AQUI A ATIVIDADE DAS 19:30
    { inicio: 1350, fim: 1380, nome: 'Dormir', categoria: 'Pessoal' }, // ALTERE AQUI A ATIVIDADE DAS 22:30
  ],

  menuDoApp: ['Hoje', 'Planejar', 'Semana', 'Repetições', 'Inbox', 'Progresso', 'Configurações'], // ALTERE AQUI OS ITENS DO MENU DA TELA DO APP

  ofensiva: {
    dias: 12, // ALTERE AQUI O NÚMERO DA OFENSIVA MOSTRADO
    quadradosTotal: 14, // ALTERE AQUI QUANTOS QUADRADOS APARECEM NO CARD DA OFENSIVA
    quadradosAcesos: 12, // ALTERE AQUI QUANTOS QUADRADOS FICAM ACESOS NO CARD DA OFENSIVA
    semanaTotal: 7, // ALTERE AQUI QUANTOS QUADRADOS APARECEM NA TELA DO APP
    semanaAcesos: 2, // ALTERE AQUI QUANTOS QUADRADOS FICAM ACESOS NA TELA DO APP
  },

  metas: [
    { rotulo: 'Estudos', valor: '4h30 de 6h', porcentagem: 75 }, // ALTERE AQUI A PRIMEIRA META
    { rotulo: 'Saúde', valor: '3h de 4h30', porcentagem: 67 }, // ALTERE AQUI A SEGUNDA META
  ],

  inbox: ['Comprar caderno', 'Ligar para o dentista'], // ALTERE AQUI OS ITENS DO CARD FLUTUANTE INBOX

  diasDaSemana: [
    { letra: 'S', ativo: true }, { letra: 'T', ativo: true }, { letra: 'Q', ativo: true }, { letra: 'Q', ativo: true }, { letra: 'S', ativo: true }, { letra: 'S', ativo: false }, { letra: 'D', ativo: false }, // ALTERE AQUI OS DIAS ACESOS NO CARD DE REPETIÇÕES
  ],
};


// -----------------------------------------------------------------------------
// ANIMACOES
// duracao, atraso e intervalo em segundos.
// Curvas: https://gsap.com/docs/v3/Eases/ (ex: 'power3.out', 'expo.out', 'none').
// Para quem ativou "reduzir movimento" no sistema, nada disso é executado.
// -----------------------------------------------------------------------------
export const ANIMACOES = {
  curvaPadrao: 'power3.out', // ALTERE AQUI A ACELERAÇÃO PADRÃO DAS ANIMAÇÕES

  rolagem: {
    suave: true, // ALTERE AQUI PARA false PARA DESLIGAR A ROLAGEM SUAVE
    suavidade: 0.1, // ALTERE AQUI A SUAVIDADE DA ROLAGEM: 0.05 MAIS LENTA, 0.2 MAIS RÁPIDA
    margemDosLinks: -24, // ALTERE AQUI QUANTOS PIXELS DE FOLGA FICAM AO PULAR PARA UMA SEÇÃO
  },

  abertura: {
    ativa: true, // ALTERE AQUI PARA false PARA REMOVER A TELA DE ABERTURA
    colunas: 5, // ALTERE AQUI EM QUANTAS COLUNAS A CORTINA SE DIVIDE
    horaInicial: 360, // ALTERE AQUI A HORA EM QUE O RELÓGIO DA ABERTURA COMEÇA. 360 É 06:00
    horaFinal: 860, // ALTERE AQUI A HORA EM QUE O RELÓGIO DA ABERTURA TERMINA. 860 É 14:20
    duracaoCirculo: 0.8, // ALTERE AQUI A DURAÇÃO DO DESENHO DO CÍRCULO
    duracaoPonteiros: 0.5, // ALTERE AQUI A DURAÇÃO DO DESENHO DOS PONTEIROS
    atrasoPonteiros: 0.45, // ALTERE AQUI QUANDO OS PONTEIROS COMEÇAM A SER DESENHADOS
    duracaoRelogio: 1.05, // ALTERE AQUI A DURAÇÃO DA CONTAGEM DAS HORAS E DA BARRA
    duracaoSaida: 0.3, // ALTERE AQUI A DURAÇÃO DO RELÓGIO SAINDO DA TELA
    duracaoCortina: 0.7, // ALTERE AQUI A DURAÇÃO DA CORTINA SUBINDO
    intervaloCortina: 0.05, // ALTERE AQUI O INTERVALO ENTRE CADA COLUNA DA CORTINA
  },

  titulo: {
    atraso: 0.05, // ALTERE AQUI QUANTO O TÍTULO PRINCIPAL ESPERA PARA ENTRAR
    duracao: 1.1, // ALTERE AQUI A DURAÇÃO DA ENTRADA DO TÍTULO PRINCIPAL
    intervaloLinhas: 0.1, // ALTERE AQUI O INTERVALO ENTRE AS LINHAS DO TÍTULO PRINCIPAL
    deslocamento: 110, // ALTERE AQUI DE QUANTO O TÍTULO SOBE, EM % DA ALTURA DA LINHA
    curva: 'expo.out', // ALTERE AQUI A ACELERAÇÃO DO TÍTULO PRINCIPAL
  },

  subtitulo: {
    inicio: 0.5, // ALTERE AQUI QUANDO O SUBTÍTULO APARECE
    duracao: 0.9, // ALTERE AQUI A DURAÇÃO DA ENTRADA DO SUBTÍTULO
    deslocamento: 20, // ALTERE AQUI QUANTOS PIXELS O SUBTÍTULO SOBE AO ENTRAR
    desfoque: 8, // ALTERE AQUI O DESFOQUE INICIAL DO SUBTÍTULO, EM PIXELS. 0 DESLIGA
  },

  botoes: {
    inicio: 0.65, // ALTERE AQUI QUANDO OS BOTÕES APARECEM
    duracao: 0.6, // ALTERE AQUI A DURAÇÃO DA ENTRADA DOS BOTÕES
    intervalo: 0.08, // ALTERE AQUI O INTERVALO ENTRE UM BOTÃO E OUTRO
    deslocamento: 20, // ALTERE AQUI QUANTOS PIXELS OS BOTÕES SOBEM AO ENTRAR
    forcaMagnetica: 0.28, // ALTERE AQUI O QUANTO OS BOTÕES SEGUEM O MOUSE. 0 DESLIGA
    duracaoMagnetica: 0.5, // ALTERE AQUI A SUAVIDADE COM QUE OS BOTÕES SEGUEM O MOUSE
  },

  appEntrada: {
    inicio: 0.5, // ALTERE AQUI QUANDO A TELA DO APP APARECE
    duracao: 1.4, // ALTERE AQUI A DURAÇÃO DA ENTRADA DA TELA DO APP
    deslocamento: 16, // ALTERE AQUI DE QUANTO A TELA DO APP SOBE, EM % DA ALTURA
    curva: 'expo.out', // ALTERE AQUI A ACELERAÇÃO DA ENTRADA DA TELA DO APP
  },

  appInclinado: {
    inclinacao: 22, // ALTERE AQUI A INCLINAÇÃO INICIAL DA TELA DO APP, EM GRAUS. 0 DESLIGA
    escalaInicial: 0.92, // ALTERE AQUI O TAMANHO INICIAL DA TELA DO APP. 1 É O TAMANHO NORMAL
    inicioRolagem: 'top 82%', // ALTERE AQUI EM QUE PONTO DA ROLAGEM ELA COMEÇA A SE ENDIREITAR
    fimRolagem: 'top 12%', // ALTERE AQUI EM QUE PONTO DA ROLAGEM ELA FICA RETA
    suavizacao: 1, // ALTERE AQUI O ATRASO DO MOVIMENTO EM RELAÇÃO À ROLAGEM, EM SEGUNDOS
  },

  flutuantes: {
    inicio: 1, // ALTERE AQUI QUANDO OS CARDS FLUTUANTES APARECEM
    duracao: 0.9, // ALTERE AQUI A DURAÇÃO DA ENTRADA DOS CARDS FLUTUANTES
    intervalo: 0.14, // ALTERE AQUI O INTERVALO ENTRE OS CARDS FLUTUANTES
    deslocamento: 40, // ALTERE AQUI QUANTOS PIXELS OS CARDS SOBEM AO ENTRAR
    subidaOfensiva: -130, // ALTERE AQUI O QUANTO O CARD OFENSIVA SOBE AO ROLAR, EM %
    subidaInbox: -70, // ALTERE AQUI O QUANTO O CARD INBOX SOBE AO ROLAR, EM %
    forcaMouseOfensiva: 1.5, // ALTERE AQUI O QUANTO O CARD OFENSIVA SEGUE O MOUSE. 0 DESLIGA
    forcaMouseInbox: 2.4, // ALTERE AQUI O QUANTO O CARD INBOX SEGUE O MOUSE. 0 DESLIGA
    alcanceMouseX: 22, // ALTERE AQUI O ALCANCE HORIZONTAL DO MOVIMENTO COM O MOUSE, EM PIXELS
    alcanceMouseY: 16, // ALTERE AQUI O ALCANCE VERTICAL DO MOVIMENTO COM O MOUSE, EM PIXELS
    duracaoMouse: 1, // ALTERE AQUI A SUAVIDADE COM QUE OS CARDS SEGUEM O MOUSE
  },

  entradaAoRolar: {
    deslocamento: 36, // ALTERE AQUI QUANTOS PIXELS OS BLOCOS SOBEM AO APARECER
    duracao: 0.9, // ALTERE AQUI A DURAÇÃO DOS BLOCOS APARECENDO
    intervalo: 0.09, // ALTERE AQUI O INTERVALO ENTRE OS BLOCOS
    gatilho: 'top 90%', // ALTERE AQUI EM QUE ALTURA DA TELA OS BLOCOS APARECEM
  },

  titulosDeSecao: {
    duracao: 1, // ALTERE AQUI A DURAÇÃO DA ENTRADA DOS TÍTULOS DE SEÇÃO
    intervaloLinhas: 0.09, // ALTERE AQUI O INTERVALO ENTRE AS LINHAS DOS TÍTULOS DE SEÇÃO
    deslocamento: 105, // ALTERE AQUI DE QUANTO OS TÍTULOS SOBEM, EM % DA ALTURA DA LINHA
    curva: 'expo.out', // ALTERE AQUI A ACELERAÇÃO DOS TÍTULOS DE SEÇÃO
    gatilho: 'top 86%', // ALTERE AQUI EM QUE ALTURA DA TELA OS TÍTULOS APARECEM
  },

  rotulos: {
    duracao: 0.9, // ALTERE AQUI A DURAÇÃO DO EFEITO DE LETRAS EMBARALHADAS
    velocidade: 0.5, // ALTERE AQUI A VELOCIDADE DO EMBARALHAMENTO: 0.1 A 2
    gatilho: 'top 90%', // ALTERE AQUI EM QUE ALTURA DA TELA OS RÓTULOS APARECEM
  },

  cards: {
    duracaoBarras: 1.2, // ALTERE AQUI A DURAÇÃO DAS BARRAS DE META CRESCENDO
    duracaoQuadrados: 0.5, // ALTERE AQUI A DURAÇÃO DE CADA QUADRADO DA OFENSIVA APARECENDO
    intervaloQuadrados: 0.04, // ALTERE AQUI O INTERVALO ENTRE OS QUADRADOS DA OFENSIVA
    gatilho: 'top 90%', // ALTERE AQUI EM QUE ALTURA DA TELA ESSES EFEITOS COMEÇAM
  },

  menu: {
    esconderDepoisDe: 180, // ALTERE AQUI QUANTOS PIXELS ROLAR ATÉ O MENU PODER SUMIR
    fundoDepoisDe: 24, // ALTERE AQUI QUANTOS PIXELS ROLAR ATÉ O MENU GANHAR FUNDO
  },

};
