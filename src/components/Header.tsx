import React, { useState, useRef, useEffect } from 'react';
import type { AppTab, User } from '../types';
import { 
  Eye, 
  Compass, 
  History as HistoryIcon, 
  HelpCircle, 
  Info, 
  Volume2, 
  VolumeX, 
  LogOut, 
  ChevronDown,
  BookOpen,
  Sparkles,
  FileQuestion
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

interface HeaderProps {
  user: User;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout
}) => {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.soundEnabled);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) {
        setShowResourcesMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
        setShowResourcesMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.soundEnabled = next;
    if (next) soundManager.playDropChime();
  };

  const handleResourceClick = (action: 'ABOUT' | 'HOW_IT_WORKS' | 'HELP' | 'FAQS') => {
    setShowResourcesMenu(false);
    if (action === 'ABOUT') {
      setActiveTab('ABOUT');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'HOW_IT_WORKS') {
      setActiveTab('ABOUT');
      setTimeout(() => {
        const el = document.getElementById('how-it-works');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else if (action === 'HELP') {
      setActiveTab('HELP');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'FAQS') {
      setActiveTab('HELP');
      setTimeout(() => {
        const el = document.getElementById('faqs');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const isResourcesActive = activeTab === 'ABOUT' || activeTab === 'HELP';

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border-neutral)',
      padding: '14px 0',
      marginBottom: '24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 14px rgba(163, 163, 173, 0.15)'
    }}>
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '0 20px' }}>
        
        {/* Brand & Tagline */}
        <div 
          onClick={() => setActiveTab('DASHBOARD')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('DASHBOARD'); }}
          aria-label="DeepGuard AI Home"
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-raised-small)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)'
          }}>
            <Eye size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                DeepGuard AI
              </h1>
              <span className="badge font-mono" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>v1.2 PRO</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0, marginTop: '2px' }}>
              "Detect. Verify. Trust."
            </p>
          </div>
        </div>

        {/* Navigation Tabs with Inset Pill Track */}
        <nav style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-inset)',
          padding: '4px',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--border-neutral)'
        }}>
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`btn-tab ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
            style={{ padding: '7px 14px', fontSize: '0.84rem' }}
          >
            <Compass size={15} /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`btn-tab ${activeTab === 'HISTORY' ? 'active' : ''}`}
            style={{ padding: '7px 14px', fontSize: '0.84rem' }}
          >
            <HistoryIcon size={15} /> History
          </button>

          {/* Resources Dropdown (replaces separate About & Help buttons) */}
          <div ref={resourcesRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowResourcesMenu(!showResourcesMenu)}
              className={`btn-tab ${isResourcesActive ? 'active' : ''}`}
              style={{ 
                padding: '7px 14px', 
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              aria-haspopup="true"
              aria-expanded={showResourcesMenu}
            >
              <BookOpen size={15} /> Resources
              <ChevronDown 
                size={13} 
                style={{ 
                  transition: 'transform 0.2s ease',
                  transform: showResourcesMenu ? 'rotate(180deg)' : 'rotate(0deg)' 
                }} 
              />
            </button>

            {showResourcesMenu && (
              <div 
                className="neu-floating" 
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '210px',
                  padding: '8px',
                  zIndex: 1000,
                  borderRadius: '16px'
                }}
                role="menu"
              >
                <button
                  onClick={() => handleResourceClick('ABOUT')}
                  className="btn-tab"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '10px',
                    textAlign: 'left'
                  }}
                  role="menuitem"
                >
                  <Info size={14} /> About DeepGuard AI
                </button>

                <button
                  onClick={() => handleResourceClick('HOW_IT_WORKS')}
                  className="btn-tab"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '10px',
                    textAlign: 'left'
                  }}
                  role="menuitem"
                >
                  <Sparkles size={14} /> How It Works
                </button>

                <div style={{ height: '1px', background: 'var(--border-neutral)', margin: '4px 0' }} />

                <button
                  onClick={() => handleResourceClick('HELP')}
                  className="btn-tab"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '10px',
                    textAlign: 'left'
                  }}
                  role="menuitem"
                >
                  <HelpCircle size={14} /> Help Center
                </button>

                <button
                  onClick={() => handleResourceClick('FAQS')}
                  className="btn-tab"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '10px',
                    textAlign: 'left'
                  }}
                  role="menuitem"
                >
                  <FileQuestion size={14} /> FAQs
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* User Profile Dropdown (Hosts relocated Audio Feedback preferences) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              id="user-profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="btn-outline"
              style={{
                padding: '4px 10px 4px 4px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              aria-haspopup="true"
              aria-expanded={showProfileMenu}
            >
              <img
                src={user.avatarUrl}
                alt={user.name}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user.name.split(' ')[0]}
              </span>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {/* Floating Dropdown Menu */}
            {showProfileMenu && (
              <div className="neu-floating" style={{
                position: 'absolute',
                top: '115%',
                right: 0,
                width: '240px',
                padding: '16px',
                zIndex: 1000
              }}>
                <div style={{ borderBottom: '1px solid var(--border-neutral)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{user.email}</div>
                  <div className="badge font-mono" style={{ fontSize: '0.68rem', marginTop: '6px' }}>{user.role}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    Member since: <strong>{user.memberSince}</strong>
                  </div>

                  {/* Relocated Preferences: Audio Feedback Toggle */}
                  <div style={{ 
                    borderTop: '1px solid var(--border-neutral)', 
                    borderBottom: '1px solid var(--border-neutral)', 
                    padding: '10px 0',
                    margin: '4px 0' 
                  }}>
                    <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Preferences
                    </div>
                    <button
                      onClick={toggleSound}
                      className="btn-outline"
                      style={{
                        width: '100%',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        fontSize: '0.78rem'
                      }}
                      title="Toggle Audio Feedback"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} color="var(--text-muted)" />}
                        <span>Audio Feedback</span>
                      </div>
                      <span className="badge font-mono" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                        {soundEnabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  <button
                    id="signout-btn"
                    onClick={onLogout}
                    className="btn-outline"
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '0.8rem',
                      color: '#991b1b',
                      justifyContent: 'center'
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};

