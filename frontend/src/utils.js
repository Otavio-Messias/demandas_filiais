export const STATUSES = [
  { key: 'Pendente', color: '#9ca3af', bg: '#f3f4f6' },
  { key: 'Em andamento', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'Aguardando retorno', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'Concluída', color: '#10b981', bg: '#ecfdf5' },
  { key: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
];

export function getStatus(key) {
  return STATUSES.find(s => s.key === key) || STATUSES[0];
}

export const PRIORITIES = ['Alta', 'Média', 'Baixa', 'Urgente'];

export function getPriorityClass(p) {
  const map = { Alta: 'alta', Média: 'media', Baixa: 'baixa', Urgente: 'urgente' };
  return `badge badge-${map[p] || 'media'}`;
}

export function formatDate(d) {
  if (!d) return null;
  try { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; } catch { return d; }
}

export function isOverdue(deadline, status) {
  if (!deadline || status === 'Concluída' || status === 'Cancelada') return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}
