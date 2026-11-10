import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Shell from './components/Shell.jsx';
import './components/registerDialogs.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Progress from './pages/Progress.jsx';
import Today from './pages/Today.jsx';
import Plan from './pages/Plan.jsx';
import Week from './pages/Week.jsx';
import Repeats from './pages/Repeats.jsx';
import Inbox from './pages/Inbox.jsx';
import Settings from './pages/Settings.jsx';
import { Privacidade, Termos } from './pages/Legal.jsx';

// A landing fica em um arquivo separado: as animações não pesam no aplicativo.
const Landing = lazy(() => import('./landing/Landing.jsx'));

function RequireAuth({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <p className="loading">Carregando…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function PublicOnly({ children }) {
  const { user, status } = useAuth();
  if (status === 'loading') return <p className="loading">Carregando…</p>;
  return user ? <Navigate to="/hoje" replace /> : children;
}

function Home() {
  const { user } = useAuth();
  if (user) return <Navigate to="/hoje" replace />;
  return <Suspense fallback={<div className="lp-wait" />}><Landing /></Suspense>;
}

export const PAGES = {
  today: Today,
  plan: Plan,
  week: Week,
  repeats: Repeats,
  inbox: Inbox,
  progress: Progress,
  settings: Settings,
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/cadastro" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/termos" element={<Termos />} />
          <Route element={<RequireAuth><Shell /></RequireAuth>}>
            <Route path="hoje" element={<PAGES.today />} />
            <Route path="planejar" element={<PAGES.plan />} />
            <Route path="semana" element={<PAGES.week />} />
            <Route path="repeticoes" element={<PAGES.repeats />} />
            <Route path="inbox" element={<PAGES.inbox />} />
            <Route path="progresso" element={<PAGES.progress />} />
            <Route path="configuracoes" element={<PAGES.settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}
