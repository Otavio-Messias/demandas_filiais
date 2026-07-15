import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import { STATUSES, FILIAIS, ALL_FILIAIS } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const PRIORITY_ORDER = { 'Urgente': 0, 'Alta': 1, 'Media': 2, 'Baixa': 3 };

function sortTasks(tasks, sortBy) {
  const copy = [...tasks];
  if (sortBy === 'prioridade') return copy.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
  if (sortBy === 'prazo') return copy.sort((a, b) => { if (!a.deadline && !b.deadline) return 0; if (!a.deadline) return 1; if (!b.deadline) return -1; return new Date(a.deadline) - new Date(b.deadline); });
  if (sortBy === 'criacao_desc') return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sortBy === 'criacao_asc') return copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return copy;
}

export default function BoardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('Todas as prioridades');
  const [filialFilter, setFilialFilter] = useState('Todas as filiais');
  const [userFilter, setUserFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('prioridade');
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [users, setUsers] = useState([]);

  const loadTasks = useCallback(() => {
    api.get('/tasks').then(r => { setTasks(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTasks();
    api.get('/users/all').then(r => setUsers(r.data)).catch(() => {});
  }, [loadTasks]);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.requester.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    const matchPriority = priorityFilter === 'Todas as prioridades' || t.priority === priorityFilter;
    const matchFilial = filialFilter === 'Todas as filiais' || t.filial === filialFilter;
    const matchUser = userFilter === 'todos' || t.assignee_id === parseInt(userFilter);
    return matchSearch && matchPriority && matchFilial && matchUser;
  });

  const columns = STATUSES.map(s => ({
    ...s,
    tasks: sortTasks(filtered.filter(t => t.status === s.key), sortBy)
  }));

  const selectedUser = users.find(u => u.id === parseInt(userFilter));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', maxWidth: '100vw' }}>
      <Navbar tasks={tasks} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 20px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 220 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14 }}>🔍</span>
          <input className="form-input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        {/* Filtro por filial */}
        <select className="form-select" value={filialFilter} onChange={e => setFilialFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="Todas as filiais">Todas as filiais</option>
          {Object.entries(FILIAIS).map(([grupo, filiais]) => (
            <optgroup key={grupo} label={grupo}>
              {filiais.map(f => <option key={f} value={f}>{f}</option>)}
            </optgroup>
          ))}
        </select>

        <select className="form-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ maxWidth: 170 }}>
          <option>Todas as prioridades</option>
          <option>Alta</option><option>Media</option><option>Baixa</option><option>Urgente</option>
        </select>

        <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="prioridade">Por prioridade</option>
          <option value="prazo">Por prazo</option>
          <option value="criacao_desc">Mais recentes</option>
          <option value="criacao_asc">Mais antigas</option>
        </select>

        {users.length > 0 && (
          <select className="form-select" value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="todos">Todos os usuarios</option>
            {users.filter(u => u.role !== 'admin').map(u => (
              <option key={u.id} value={u.id}>{u.id === user.id ? u.name + ' (voce)' : u.name}</option>
            ))}
          </select>
        )}

        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ flexShrink: 0 }}>+ Nova tarefa</button>
      </div>

      {/* Banners de filtro ativos */}
      {(filialFilter !== 'Todas as filiais' || selectedUser) && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 20px', background: '#f8f9fb', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {filialFilter !== 'Todas as filiais' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>📍 {filialFilter}</span>
              <button onClick={() => setFilialFilter('Todas as filiais')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', fontSize: 12, padding: 0, lineHeight: 1 }}>x</button>
            </div>
          )}
          {selectedUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: selectedUser.color + '18', border: '1px solid ' + selectedUser.color + '40', borderRadius: 20, padding: '3px 10px' }}>
              <div className="avatar" style={{ background: selectedUser.color, width: 18, height: 18, fontSize: 8 }}>{selectedUser.initials}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: selectedUser.color }}>{selectedUser.id === user.id ? 'Suas tarefas' : selectedUser.name}</span>
              <button onClick={() => setUserFilter('todos')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedUser.color, fontSize: 12, padding: 0, lineHeight: 1 }}>x</button>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
            {filtered.length} tarefa{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {loading ? <div className="loading">Carregando tarefas...</div> : (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: 12, minWidth: 0, width: '100%' }}>
          {columns.map(col => (
            <div key={col.key} style={{ flexShrink: 0, width: 280, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{col.key}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: col.bg || '#f3f4f6', color: col.color, padding: '2px 7px', borderRadius: 20 }}>{col.tasks.length}</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                {col.tasks.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12, border: '2px dashed var(--border)', borderRadius: 10 }}>Sem tarefas aqui</div>
                ) : (
                  col.tasks.map(task => (
                    <TaskCard key={task.id} task={task} isOwner={task.assignee_id === user.id || task.created_by === user.id} onClick={t => setDetailId(t.id)} />
                  ))
                )}
              </div>

              <button className="btn btn-ghost" onClick={() => setShowForm(true)} style={{ justifyContent: 'flex-start', color: 'var(--text-3)', fontSize: 12 }}>
                + Adicionar tarefa
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <TaskForm task={null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); loadTasks(); }} />}
      {detailId && <TaskDetail taskId={detailId} onClose={() => setDetailId(null)} onUpdate={loadTasks} />}
    </div>
  );
}