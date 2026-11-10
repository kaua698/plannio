# Plannio: tarefas

## Para publicar

- [ ] Commitar e enviar o projeto para a branch `main` do GitHub
- [ ] Importar o repositório na Vercel
- [ ] Criar a variável `JWT_SECRET` na Vercel
- [ ] Conectar um banco Neon pela aba Storage e refazer o deploy
- [ ] Testar no link publicado: cadastro, login, logout, planejar, hoje e progresso
- [ ] Testar o site publicado no celular

## Depois

- [ ] Confirmação de e-mail e recuperação de senha
- [ ] Limite de tentativas de login, guardado no banco
- [ ] Cabeçalhos de segurança também nas telas publicadas
- [ ] Trocar a senha em Configurações
- [ ] Reativar a seção de Dúvidas, com `TEXTOS.duvidas.mostrar` em `frontend/src/landing/config/personalizar.js`
- [ ] Investigar os travamentos intermitentes dos testes no WebKit para Windows

## Concluído

- [x] Cadastro comum, sem envio de e-mail
- [x] Adaptação para a Vercel: `api/index.js`, `vercel.json` e conexão com a Neon
- [x] Novas telas de login e cadastro, com relógio de 24 horas e abas de acesso
- [x] Landing explicativa, com a seção de Dúvidas oculta
- [x] Conferência de `.env`, `.gitignore` e segredos no repositório
- [x] README com termo de abertura, histórias, requisitos, caso de uso, arquitetura e critérios de aceite
