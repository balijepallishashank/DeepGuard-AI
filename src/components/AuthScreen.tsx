import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight, User, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { soundManager } from '../utils/soundEffects';

export const AuthScreen: React.FC = () => {
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    loginAsDemo,
    isConfigured,
    configError,
    authError,
    clearError
  } = useAuth();

  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD'>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessNotice(null);
    soundManager.playDropChime();
    setIsLoading(true);

    if (mode === 'FORGOT_PASSWORD') {
      const res = await resetPasswordForEmail(email);
      setIsLoading(false);
      if (res.success) {
        setSuccessNotice(`Password reset link sent to ${email}. Please check your inbox.`);
        soundManager.playScanComplete();
      }
      return;
    }

    if (mode === 'SIGN_UP') {
      const res = await signUpWithPassword(email, password, fullName);
      setIsLoading(false);
      if (res.success) {
        if (res.requiresEmailVerification) {
          setSuccessNotice(`Account created! A verification link has been sent to ${email}. Please verify your email before logging in.`);
        } else {
          setSuccessNotice('Account created successfully! Signing you into your workspace...');
        }
        soundManager.playScanComplete();
      }
      return;
    }

    // SIGN_IN mode
    const res = await signInWithPassword(email, password);
    setIsLoading(false);
    if (res.success) {
      soundManager.playScanComplete();
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setSuccessNotice(null);
    soundManager.playDropChime();
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  const handleDemoAccess = () => {
    soundManager.playDropChime();
    loginAsDemo();
  };

  return (
    <div className="login-page-container">
      
      {/* ========================================================================= */}
      {/* SCULPTED SOFT UI BACKGROUND FORMS (EMBOSSED DIMENSIONAL DEPTH) */}
      {/* ========================================================================= */}
      <div className="login-sculpted-form-1" aria-hidden="true" />
      <div className="login-sculpted-form-2" aria-hidden="true" />

      {/* ========================================================================= */}
      {/* SUBTLE FORENSIC SIGNALS (TECHNICAL RADAR & CALIBRATION LINES) */}
      {/* ========================================================================= */}
      <svg
        className="login-forensic-overlay"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="centerFade" cx="50%" cy="50%" r="42%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="65%" stopColor="#000000" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </radialGradient>
          <mask id="calmCenterMask">
            <rect width="100%" height="100%" fill="url(#centerFade)" />
          </mask>
        </defs>

        <g mask="url(#calmCenterMask)">
          <g transform="translate(1420, 120)" stroke="#202124" strokeWidth="1" opacity="0.075">
            <circle r="120" fill="none" strokeDasharray="3 4" />
            <circle r="220" fill="none" />
            <circle r="340" fill="none" strokeDasharray="6 6" />
            <circle r="480" fill="none" />
            <circle r="640" fill="none" strokeDasharray="2 6" />
            <line x1="-700" y1="0" x2="100" y2="0" />
            <line x1="0" y1="-100" x2="0" y2="700" />
            <line x1="-480" y1="-480" x2="50" y2="50" strokeDasharray="4 8" />
          </g>
        </g>
      </svg>

      {/* ========================================================================= */}
      {/* RAISED NEUMORPHIC AUTHENTICATION CARD */}
      {/* ========================================================================= */}
      <div className="login-card neu-raised" style={{ maxWidth: '460px', width: '100%', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        {/* Brand Header with Inset Shield Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div className="neu-inset" style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-primary, #202124)'
          }}>
            <ShieldCheck size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.28rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
                DEEPGUARD<span style={{ color: 'var(--brand-accent, #3b82f6)' }}>.AI</span>
              </h1>
              <span className="badge font-mono" style={{ fontSize: '0.62rem', padding: '3px 8px' }}>
                SECURE AUTH
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
              Multimodal Deepfake Forensics & Cloud History
            </p>
          </div>
        </div>

        {/* Configuration Notice if Supabase keys not set */}
        {!isConfigured && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(217, 119, 6, 0.1)',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            borderRadius: '10px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.78rem',
            color: '#b45309'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Setup Notice:</strong> {configError}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {authError && (
          <div
            id="auth-error-banner"
            role="alert"
            style={{
              padding: '12px 14px',
              background: 'rgba(153, 27, 27, 0.1)',
              border: '1px solid rgba(153, 27, 27, 0.25)',
              borderRadius: '10px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.82rem',
              color: '#991b1b'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{authError}</span>
          </div>
        )}

        {/* Success Banner */}
        {successNotice && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(22, 101, 52, 0.1)',
            border: '1px solid rgba(22, 101, 52, 0.25)',
            borderRadius: '10px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.82rem',
            color: '#166534'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Mode Selector Tabs (Sign In / Create Account) */}
        {mode !== 'FORGOT_PASSWORD' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => { setMode('SIGN_IN'); clearError(); setSuccessNotice(null); }}
              className={mode === 'SIGN_IN' ? 'btn-primary' : 'btn-outline'}
              style={{ flex: 1, padding: '9px 12px', fontSize: '0.84rem' }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('SIGN_UP'); clearError(); setSuccessNotice(null); }}
              className={mode === 'SIGN_UP' ? 'btn-primary' : 'btn-outline'}
              style={{ flex: 1, padding: '9px 12px', fontSize: '0.84rem' }}
            >
              Create Account
            </button>
          </div>
        )}

        {mode === 'FORGOT_PASSWORD' && (
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Reset Your Password
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Enter your account email to receive a password recovery link.
            </p>
          </div>
        )}

        {/* Primary Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Full Name Field (Sign Up Only) */}
          {mode === 'SIGN_UP' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivers"
                  className="neu-input"
                  style={{ height: '46px', paddingLeft: '44px' }}
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="neu-input"
                style={{ height: '46px', paddingLeft: '44px' }}
              />
            </div>
          </div>

          {/* Password Field (Sign In & Sign Up) */}
          {mode !== 'FORGOT_PASSWORD' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Password
                </label>
                {mode === 'SIGN_IN' && (
                  <button
                    type="button"
                    onClick={() => { setMode('FORGOT_PASSWORD'); clearError(); setSuccessNotice(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="neu-input"
                  style={{ height: '46px', paddingLeft: '44px', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Remember Device Checkbox (Sign In Only) */}
          {mode === 'SIGN_IN' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '2px' }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#202124', cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <label htmlFor="remember" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Keep session persistent across restarts
              </label>
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: '100%',
              height: '48px',
              fontSize: '0.92rem',
              marginTop: '4px'
            }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} className="spin" /> Processing...
              </span>
            ) : mode === 'FORGOT_PASSWORD' ? (
              'Send Password Reset Link'
            ) : mode === 'SIGN_UP' ? (
              'Create Account'
            ) : (
              'Sign In to Workspace'
            )}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Back to Sign In button if on Forgot Password */}
        {mode === 'FORGOT_PASSWORD' && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => { setMode('SIGN_IN'); clearError(); setSuccessNotice(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* OAuth Separator */}
        {mode !== 'FORGOT_PASSWORD' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '20px 0 16px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-neutral)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-neutral)' }} />
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="btn-outline"
              style={{
                width: '100%',
                height: '44px',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Instant Demo Account Access Button */}
            <button
              id="demo-login-btn"
              type="button"
              onClick={handleDemoAccess}
              className="btn-outline"
              style={{
                width: '100%',
                height: '40px',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginTop: '10px',
                color: 'var(--text-muted)'
              }}
            >
              <ShieldCheck size={15} /> Explore Demo Investigator Account
            </button>
          </>
        )}

      </div>
    </div>
  );
};
