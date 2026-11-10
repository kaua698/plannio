# Plannio: relatório

Data: 10 de novembro de 2026.

## Resumo

O projeto funciona em ambiente local, com banco PostgreSQL, e está preparado para a Vercel. **O deploy real na Vercel ainda não foi feito.** A construção foi simulada em uma cópia só com os arquivos versionáveis.

## O que mudou

| Área | Mudança |
|---|---|
| Cadastro | Cadastro comum: nome, e-mail e senha com pelo menos 8 caracteres. A pessoa entra logo depois. |
| E-mail | Removidos o envio de mensagens, a confirmação de e-mail, a recuperação de senha e a fila de envio. |
| Senhas | Guardadas como hash bcrypt, em JavaScript puro, sem dependência nativa. |
| Vercel | Entrada em `api/index.js`, rotas e construção em `vercel.json`, e migrações pela conexão direta da Neon. |
| Login e cadastro | Relógio de 24 horas com as atividades do dia, cartão com abas de acesso, temas claro e escuro. |
| Landing | A seção de Dúvidas fica oculta e continua na configuração. |
| Banco | Migração `20261110090000_remove_email` remove as tabelas e a coluna de e-mail. |

## Conferência de segurança para o repositório

| Item | Resultado |
|---|---|
| `.env` | Ignorado pelo Git e nunca presente no histórico. |
| `.env.example` | Sem valores secretos. |
| Pasta `docs/` | Ignorada pelo Git. |
| Busca por chaves e senhas nos arquivos versionáveis | Nada encontrado. |
| `npm audit` | Sem vulnerabilidades conhecidas. |
| Senha `plannio` em `infra/docker-compose.yml` | Só do banco local, acessível apenas na própria máquina. |

## Documentação

| Seção esperada | Onde está no README |
|---|---|
| Termo de abertura: título, problema, proposta de valor e escopo | Início, O problema, A solução e proposta de valor, Escopo |
| Histórias de usuário | Histórias de usuário |
| Requisitos funcionais e não funcionais | Requisitos do sistema, com códigos RF e RNF |
| Caso de uso principal e tratamento de erros | Fluxo principal e Tratamento de erros |
| Arquitetura, tecnologias e justificativa | Arquitetura e tecnologias |
| Critérios de aceite e definição de pronto | Critérios de aceite e Definição de pronto |

## Testes

| Teste | Situação |
|---|---|
| Regras compartilhadas: 112 testes | Aprovado |
| API: 97 testes | Aprovado |
| Telas: 125 testes | Aprovado |
| Regras no PostgreSQL: 72 testes | Aprovado |
| Chromium e Firefox, em computador e celular: 107 testes, 9 ignorados | Aprovado |
| Cópia limpa com a construção da Vercel, respondendo em modo produção | Aprovado |
| Lista de arquivos da função, calculada com a biblioteca da Vercel | Aprovado |
| WebKit para Windows | Não executado nesta versão; teve travamentos intermitentes na anterior |
| Deploy real na Vercel | Não executado |

## Limitações

- Não há confirmação de e-mail nem recuperação de senha.
- Não há limite de tentativas de login.
- Os cabeçalhos de segurança valem para a API. As telas estáticas na Vercel ainda não os recebem.
- O primeiro acesso depois de um tempo parado pode demorar alguns segundos, enquanto a função e o banco acordam.
