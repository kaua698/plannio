import { Link } from 'react-router-dom';

function Pagina({ titulo, children }) {
  return (
    <div className="legal">
      <Link className="auth-brand" to="/">Plannio</Link>
      <main>
        <h1>{titulo}</h1>
        {children}
      </main>
    </div>
  );
}

export function Privacidade() {
  return (
    <Pagina titulo="Privacidade">
      <h2>O que guardamos</h2>
      <p>Nome, e-mail, senha em forma de hash e o que você cadastra: atividades, repetições, categorias, metas e histórico de alterações.</p>
      <h2>Para que usamos</h2>
      <p>Para manter sua conta e mostrar sua rotina. O e-mail serve só para entrar; o Plannio não envia mensagens.</p>
      <h2>Cookies</h2>
      <p>Usamos um cookie de sessão, necessário para manter você conectado. O navegador também guarda sua preferência de tema.</p>
      <h2>Quem acessa</h2>
      <p>Cada conta só acessa os próprios dados. As informações ficam no banco de dados da hospedagem do site.</p>
      <h2>Como apagar</h2>
      <p>Em Configurações, Excluir conta apaga sua conta e todos os seus dados.</p>
    </Pagina>
  );
}

export function Termos() {
  return (
    <Pagina titulo="Termos de uso">
      <h2>O serviço</h2>
      <p>O Plannio organiza sua rotina por horários. Ele é oferecido como está, sem garantia de disponibilidade contínua.</p>
      <h2>Sua conta</h2>
      <p>Você é responsável por manter sua senha em segurança e pelo que registra na sua conta.</p>
      <h2>Encerramento</h2>
      <p>Você pode excluir sua conta quando quiser, em Configurações. A exclusão é definitiva.</p>
    </Pagina>
  );
}
