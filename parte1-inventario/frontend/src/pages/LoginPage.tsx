import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 8) {
      setError('Ingresa tu correo y una contraseña de al menos 8 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <section className="login__hero" aria-hidden="true">
        <div className="iso">
          <span className="iso__layer iso__layer--3" />
          <span className="iso__layer iso__layer--2" />
          <span className="iso__layer iso__layer--1" />
        </div>
        <h2>Controla tu inventario con precisión</h2>
        <p>Entradas, salidas y kardex en un solo lugar, con saldos que siempre cuadran.</p>
      </section>

      <section className="login__panel">
        <form className="login__card" onSubmit={submit} noValidate>
          <img className="login__logo" src="/brand/logo_vise.png" alt="VISE Ltda" />
          <h1>Bienvenido</h1>
          <p>Inicia sesión para gestionar el inventario.</p>

          <label className="field">
            <span>Correo</span>
            <div className="input-icon">
              <Mail size={18} />
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@vise.com"
              />
            </div>
          </label>

          <label className="field">
            <span>Contraseña</span>
            <div className="input-icon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-icon__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  );
}
