import React, { useState, useRef } from 'react';
import { STATUSES, PRIORITIES } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export default function TaskForm({ task, onClose, onSave }) {
  const { user } = useAuth();
  const isEdit = !!task;
  const isOwner = !isEdit || task.assignee_id === user.id || task.created_by === user.id;

  const [form, setForm] = useState({
    title: task?.title || '',
    requester: task?.requester || '',
    priority: task?.priority || 'Média',
    deadline: task?.deadline || '',
    status: task?.status || 'Pendente',
    description: task?.description || '',
    what_to_do: task?.what_to_do || '',
    recurrence: task?.recurrence || '',
  });
  const [checklist, setChecklist] = useState(task?.checklist || []);
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const dragIndexRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addItem = () => { const t = newItem.trim(); if (!t) return; setChecklist(c => [...c, { id: `c${Date.now()}`, text: t, done: false }]); setNewItem(''); };
  const toggleItem = id => setChecklist(c => c.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const removeItem = id => setChecklist(c => c.filter(i => i.id !== id));

  const onDragStart = (e, idx) => { dragIndexRef.current = idx; e.dataTransfer.setData('text/plain', String(idx)); setTimeout(() => setDraggingIndex(idx), 0); };
  const onDragOver = (e, idx) => { e.preventDefault(); setDragOverIndex(idx); };
  const onDrop = (e, toIdx) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(fromIdx) || fromIdx === toIdx) { setDraggingIndex(null); setDragOverIndex(null); return; }
    const r = [...checklist]; const [removed] = r.splice(fromIdx, 1); r.splice(toIdx, 0, removed);
    setChecklist(r); setDraggingIndex(null); setDragOverIndex(null);
  };
  const onDragEnd = () => { setDraggingIndex(null); setDragOverIndex(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.requester) { setError('Preencha os campos obrigatórios.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, checklist };
      if (isEdit) await api.put(`/tasks/${task.id}`, payload);
      else await api.post('/tasks', payload);
      onSave();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao salvar'); setSaving(false); }
  };

  const doneCount = checklist.filter(i => i.done).length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-input" placeholder="Ex: Melhoria no atendimento da filial X" value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Solicitante *</label>
                <input className="form-input" placeholder="Nome de quem solicitou" value={form.requester} onChange={e => set('requester', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Prazo de entrega</label>
                <input type="date" className="form-input" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tarefa recorrente</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[{ value: '', label: 'Não repete' }, { value: 'diaria', label: 'Diária' }, { value: 'semanal', label: 'Semanal' }, { value: 'mensal', label: 'Mensal' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => set('recurrence', opt.value)}
                    style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 500, borderRadius: 7, cursor: 'pointer', border: form.recurrence === opt.value ? '1.5px solid #7c3aed' : '1.5px solid var(--border)', background: form.recurrence === opt.value ? '#f5f3ff' : 'white', color: form.recurrence === opt.value ? '#7c3aed' : 'var(--text-2)' }}>
                    {opt.value && '🔁 '}{opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.key}>{s.key}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-textarea" placeholder="Descreva a melhoria..." value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: 90 }} />
            </div>

            <div className="form-group">
              <label className="form-label">O que precisa ser feito</label>
              <textarea className="form-textarea" placeholder="Liste as ações necessárias..." value={form.what_to_do} onChange={e => set('what_to_do', e.target.value)} style={{ minHeight: 80 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Checklist {checklist.length > 0 && `(${doneCount}/${checklist.length})`}</label>
              {checklist.length > 0 && (
                <>
                  <div style={{ height: 5, background: '#f0f1f3', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${(doneCount / checklist.length) * 100}%`, background: '#10b981', transition: 'width 0.2s' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>↕ Arraste para reordenar</p>
                </>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {checklist.map((item, idx) => (
                  <div key={item.id} draggable onDragStart={e => onDragStart(e, idx)} onDragOver={e => onDragOver(e, idx)} onDrop={e => onDrop(e, idx)} onDragEnd={onDragEnd}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: draggingIndex === idx ? '#f0f0f0' : 'var(--surface-2)', border: dragOverIndex === idx && draggingIndex !== idx ? '2px solid #6366f1' : '2px solid transparent', opacity: draggingIndex === idx ? 0.4 : 1, cursor: 'grab' }}>
                    <span style={{ color: 'var(--text-3)', fontSize: 14, userSelect: 'none' }}>⠿</span>
                    <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-3)' : 'var(--text)' }}>{item.text}</span>
                    <button type="button" onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14, padding: 2, flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" placeholder="Adicionar item..." value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Adicionar</button>
              </div>
            </div>
          </div>

          <div className="modal-body" style={{ paddingTop: 0 }}>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : '✓ Salvar'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
