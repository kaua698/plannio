import { Link, NavLink } from 'react-router-dom';

const CENTRO = 200;
const HORA_ATUAL = 860; // 14:20, em minutos desde 00:00
const ARCOS = [
  [390, 420, 'd'], [480, 720, 'd'], [720, 780, 'd'], [840, 930, 'n'],
  [930, 990, ''], [1020, 1110, ''], [1170, 1200, ''], [1350, 1380, ''],
];
const ROTULOS = { 0: '00', 6: '06', 12: '12', 18: '18' };

const ponto = (hora, raio) => {
  const angulo = (hora / 24) * 2 * Math.PI - Math.PI / 2;
  return [CENTRO + raio * Math.cos(angulo), CENTRO + raio * Math.sin(angulo)];
};

// O dia inteiro em um relógio de 24 horas: cada arco é uma atividade.
function Relogio() {
  return (
    <svg className="auth-dial" viewBox="0 0 400 400">
      <circle className="auth-dial-base" cx={CENTRO} cy={CENTRO} r="150" />
      <circle className="auth-dial-inner" cx={CENTRO} cy={CENTRO} r="118" />
      <g transform={`rotate(-90 ${CENTRO} ${CENTRO})`}>
        {ARCOS.map(([ini, fim, tipo], i) => (
          <circle
            key={ini}
            className={`auth-arc k-${tipo || 'x'}`}
            cx={CENTRO}
            cy={CENTRO}
            r="150"
            pathLength="1440"
            strokeDashoffset={-ini}
            style={{ '--len': fim - ini, animationDelay: `${120 + i * 70}ms` }}
          />
        ))}
      </g>
      {Array.from({ length: 24 }, (_, h) => {
        const [x, y] = ponto(h, 184);
        return ROTULOS[h]
          ? <text key={h} className="auth-dial-hour" x={x} y={y}>{ROTULOS[h]}</text>
          : <circle key={h} className="auth-dial-dot" cx={x} cy={y} r="1.6" />;
      })}
      <g className="auth-dial-hand" style={{ '--giro': `${(HORA_ATUAL / 1440) * 360}deg` }}>
        <line x1={CENTRO} y1="32" x2={CENTRO} y2="78" />
        <circle cx={CENTRO} cy="32" r="4" />
      </g>
      <text className="auth-dial-now" x={CENTRO} y="166">Agora</text>
      <text className="auth-dial-title" x={CENTRO} y="200">Hora de estudar</text>
      <text className="auth-dial-clock" x={CENTRO} y="244">01:10</text>
    </svg>
  );
}

// Moldura de entrar e criar conta: o dia em um relógio de um lado e o formulário do outro.
export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <Link className="auth-brand" to="/" aria-label="Plannio, página inicial">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 6.500V12l3.500 2" /></svg>
        <span>Plannio</span>
      </Link>
      <aside className="auth-art" aria-hidden="true"><Relogio /></aside>
      <main className="auth-card">
        <nav className="auth-tabs" aria-label="Acesso">
          <NavLink to="/login">Entrar</NavLink>
          <NavLink to="/cadastro">Criar conta</NavLink>
        </nav>
        <div className="auth-form">{children}</div>
      </main>
    </div>
  );
}
