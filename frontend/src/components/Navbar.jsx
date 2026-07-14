import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ tasks = [] }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const total = tasks.length;
  const overdue = tasks.filter(t => {
    if (!t.deadline || t.status === 'Concluída' || t.status === 'Cancelada') return false;
    return new Date(t.deadline) < new Date(new Date().toDateString());
  }).length;
  const urgent = tasks.filter(t => t.priority === 'Urgente' && t.status !== 'Concluída' && t.status !== 'Cancelada').length;

  return (
    <header style={{ background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: '#111827', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏢</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Melhorias Filiais</span>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Total <strong style={{ color: 'var(--text)' }}>{total}</strong></span>
          <span style={{ fontSize: 13, color: overdue > 0 ? '#dc2626' : 'var(--text-3)' }}>Atrasadas <strong>{overdue}</strong></span>
          <span style={{ fontSize: 13, color: urgent > 0 ? '#d97706' : 'var(--text-3)' }}>Urgentes <strong>{urgent}</strong></span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
            <div className="avatar" style={{ background: user?.color || '#6366f1', width: 30, height: 30, fontSize: 11 }}>{user?.initials}</div>
            <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</span>
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setMenuOpen(false)} />
              <div style={{ position: 'absolute', right: 0, top: '110%', background: 'white', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-md)', minWidth: 160, overflow: 'hidden', zIndex: 201 }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f1f3' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{user?.email}</div>
                </div>
                <button onClick={() => { logout(); setMenuOpen(false); }}
                  style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#dc2626' }}>
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
