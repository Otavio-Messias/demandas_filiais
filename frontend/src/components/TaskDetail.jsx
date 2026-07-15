import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStatus, getPriorityClass, formatDate, isOverdue, STATUSES, FILIAIS } from '../utils';
import TaskForm from './TaskForm';
import api from '../api';

export default function TaskDetail({ taskId, onClose, onUpdate }) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const commentsRef = useRef(null);

  const load = () => {
    api.get('/tasks/' + taskId).then(r => { setTask(r.data); setLoading(false); }).catch(() => onClose());
  };

  useEffect(() => { load(); }, [taskId]);
  useEffect(() => { if (commentsRef.current) commentsRef.current.scrollTop = commentsRef.current.scrollHeight; }, [task?.comments]);

  const isOwner = task && (task.assignee_id === user.id || task.created_by === user.id || user.role === 'admin');

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try { await api.post('/tasks/' + taskId + '/comments', { content: comment }); setComment(''); load(); onUpdate(); }
    finally { setSubmitting(false); }
  };

  const handleStatusChange = async (newStatus) => {
    await api.put('/tasks/' + taskId, { status: newStatus });
    load(); onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm('Excluir esta tarefa?')) return;
    await api.delete('/tasks/' + taskId);
    onClose(); onUpdate();
  };

  const toggleChecklistItem = async (itemId, currentDone) => {
    try { await api.patch('/tasks/' + taskId + '/checklist/' + itemId, { done: !currentDone }); load(); onUpdate(); }
    catch { load(); }
  };

  if (loading) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal"><div className="loading">Carregando...</div></div>
    </div>
  );

  const st = getStatus(task.status);
  const overdue = isOverdue(task.deadline, task.status);

  // Tarefa duplicada — cópia sem filial para o usuário escolher
  const duplicateTask = {
    ...task,
    id: null,
    filial: '',
    title: task.title,
    checklist: (task.checklist || []).map(i => ({ ...i, done: false })), // reseta checklist
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 0', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{task.status}</span>
              <span className={getPriorityClass(task.priority)}>{task.priority}</span>
              {task.filial && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>📍 {task.filial}</span>}
              {overdue && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Atrasada</span>}
              {task.recurrence && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#f5f3ff', color: '#7c3aed' }}>🔁 {task.recurrence === 'diaria' ? 'Diaria' : task.recurrence === 'semanal' ? 'Semanal' : 'Mensal'}</span>}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{task.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isOwner && (
              <button onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 7, cursor: 'pointer' }}>
                Editar
              </button>
            )}
            <button onClick={() => setDuplicating(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 7, cursor: 'pointer' }}>
              Duplicar
            </button>
            {isOwner && (
              <button onClick={handleDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer' }}>
                Excluir
              </button>
            )}
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>x</button>
          </div>
        </div>

        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 8 }}>
            <MetaItem label="Solicitante" value={task.requester} />
            <MetaItem label="Responsavel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="avatar" style={{ background: task.assignee_color, width: 22, height: 22, fontSize: 9 }}>{task.assignee_initials}</div>
                <span style={{ fontSize: 13 }}>{task.assignee_name}</span>
                {task.assignee_id === user.id && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(voce)</span>}
              </div>
            </MetaItem>
            {task.deadline && <MetaItem label="Prazo"><span style={{ color: overdue ? '#dc2626' : 'inherit', fontWeight: overdue ? 600 : 400, fontSize: 13 }}>{formatDate(task.deadline)}</span></MetaItem>}
            <MetaItem label="Criado por" value={task.creator_name} />
          </div>

          {isOwner && task.status !== 'Cancelada' && (
            <div className="form-group">
              <label className="form-label">Mover para</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUSES.map(s => (
                  <button key={s.key} className="btn btn-sm btn-secondary" disabled={task.status === s.key} onClick={() => handleStatusChange(s.key)}
                    style={{ background: task.status === s.key ? s.bg : '', color: task.status === s.key ? s.color : '', borderColor: task.status === s.key ? s.color : '', fontWeight: task.status === s.key ? 600 : 400 }}>
                    {s.key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {task.description && (
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Descricao</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</p>
            </div>
          )}

          {task.what_to_do && (
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>O que precisa ser feito</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.what_to_do}</p>
            </div>
          )}

          {task.checklist && task.checklist.length > 0 && (() => {
            const doneCount = task.checklist.filter(i => i.done).length;
            const total = task.checklist.length;
            return (
              <div>
                <div className="form-label" style={{ marginBottom: 6 }}>Checklist ({doneCount}/{total})</div>
                <div style={{ height: 5, background: '#f0f1f3', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: ((doneCount / total) * 100) + '%', background: '#10b981', transition: 'width 0.2s' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {task.checklist.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 8, cursor: isOwner ? 'pointer' : 'default' }}>
                      <input type="checkbox" checked={item.done} disabled={!isOwner} onChange={() => toggleChecklistItem(item.id, item.done)} style={{ width: 16, height: 16, cursor: isOwner ? 'pointer' : 'default', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-3)' : 'var(--text)' }}>{item.text}</span>
                    </label>
                  ))}
                </div>
                {!isOwner && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Somente o responsavel pode marcar os itens.</p>}
              </div>
            );
          })()}

          <div>
            <div className="form-label" style={{ marginBottom: 10 }}>Comentarios e historico</div>
            <div ref={commentsRef} style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {task.comments?.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Nenhum comentario ainda.</p>}
              {task.comments?.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: c.type === 'history' ? '6px 10px' : '8px 10px', background: c.type === 'history' ? '#f8f9fb' : 'white', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                  {c.type !== 'history' && <div className="avatar" style={{ background: c.user_color, width: 26, height: 26, fontSize: 9, flexShrink: 0 }}>{c.user_initials}</div>}
                  <div style={{ flex: 1 }}>
                    {c.type !== 'history' && <span style={{ fontSize: 11, fontWeight: 600 }}>{c.user_name} </span>}
                    {c.type === 'history' && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>🕐 </span>}
                    <span style={{ fontSize: 12, color: c.type === 'history' ? 'var(--text-3)' : 'var(--text-2)' }}>{c.content}</span>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{new Date(c.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="avatar" style={{ background: user.color, width: 28, height: 28, fontSize: 10, flexShrink: 0, marginTop: 1 }}>{user.initials}</div>
              <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                <input className="form-input" placeholder="Adicionar comentario..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()} />
                <button className="btn btn-primary btn-sm" onClick={sendComment} disabled={submitting || !comment.trim()}>Enviar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editing && <TaskForm task={task} onClose={() => setEditing(false)} onSave={() => { setEditing(false); load(); onUpdate(); }} />}
      {duplicating && <TaskForm task={duplicateTask} onClose={() => setDuplicating(false)} onSave={() => { setDuplicating(false); onClose(); onUpdate(); }} />}
    </div>
  );
}

function MetaItem({ label, value, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
      {children || <div style={{ fontSize: 13 }}>{value || '-'}</div>}
    </div>
  );
}