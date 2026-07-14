import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import { STATUSES } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const PRIORITY_ORDER = { 'Urgente': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };

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
    const matchUser = userFilter === 'todos' || t.assignee_id === parseInt(userFilter);
    return matchSearch && matchPriority && matchUser;
  });

  const columns = STATUSES.map(s => ({
    ...s,
    tasks: sortTasks(filtered.filter(t => t.status === s.key), sortBy)
  }));

  const selectedUser = users.find(u => u.id === parseInt(userFilter));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', maxWidth: '100vw' }}>
      <Navbar tasks={tasks} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 20px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 260 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14 }}>🔍</span>
          <input className="form-input" placeholder="Buscar tarefas..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        <select className="form-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option>Todas as prioridades</option>
          <option>Alta</option><option>Média</option><option>Baixa</option><option>Urgente</option>
        </select>

        <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: 210 }}>
          <option value="prioridade">⬆ Por prioridade</option>
          <option value="prazo">⬆ Por prazo</option>
          <option value="criacao_desc">⬆ Mais recentes</option>
          <option value="criacao_asc">⬆ Mais antigas</option>
        </select>

        {/* Filtro por usuário — todos podem ver */}
        {users.length > 0 && (
          <select className="form-select" value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="todos">Todos ({tasks.filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada').length} ativas)</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.id === user.id ? `${u.name} (você)` : u.name}
              </option>
            ))}
          </select>
        )}

        <div style={{ flex: 1 }} />

        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ flexShrink: 0 }}>+ Nova tarefa</button>
      </div>

      {/* Banner do usuário selecionado */}
      {selectedUser && (
        <div style={{ background: selectedUser.color + '18', borderBottom: `2px solid ${selectedUser.color}40`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ background: selectedUser.color, width: 26, height: 26, fontSize: 10 }}>{selectedUser.initials}</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Tarefas de {selectedUser.id === user.id ? 'você' : selectedUser.name}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            — {filtered.filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada').length} ativas
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setUserFilter('todos')} style={{ marginLeft: 'auto', fontSize: 12 }}>✕ Ver todos</button>
        </div>
      )}

      {/* Board */}
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      isOwner={task.assignee_id === user.id || task.created_by === user.id}
                      onClick={t => setDetailId(t.id)}
                    />
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
