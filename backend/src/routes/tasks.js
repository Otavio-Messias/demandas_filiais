const express = require('express');
const { query, queryOne } = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

async function addHistory(taskId, userId, content) {
  await query(
    `INSERT INTO comments (task_id, user_id, content, type) VALUES ($1,$2,$3,'history')`,
    [taskId, userId, content]
  );
}

const PRIORITY_ORDER = { 'Urgente': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };

// GET /api/tasks — todos veem todas as tarefas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await query(`
      SELECT t.*,
        u.name as assignee_name, u.initials as assignee_initials, u.color as assignee_color,
        creator.name as creator_name,
        (SELECT COUNT(*) FROM comments WHERE task_id = t.id)::int as comment_count
      FROM tasks t
      JOIN users u ON t.assignee_id = u.id
      JOIN users creator ON t.created_by = creator.id
      ORDER BY t.created_at DESC
    `);
    res.json(tasks);
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/tasks/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne(`
      SELECT t.*, u.name as assignee_name, u.initials as assignee_initials, u.color as assignee_color, creator.name as creator_name
      FROM tasks t JOIN users u ON t.assignee_id = u.id JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const comments = await query(`
      SELECT c.*, u.name as user_name, u.initials as user_initials, u.color as user_color
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1 ORDER BY c.created_at ASC
    `, [task.id]);

    res.json({ ...task, comments });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/tasks — qualquer usuário cria, atribui a si mesmo
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, requester, priority = 'Média', deadline, status = 'Pendente', description, what_to_do, checklist, recurrence } = req.body;
    if (!title || !requester) return res.status(400).json({ error: 'Título e solicitante são obrigatórios' });

    const finalRecurrence = ['diaria', 'semanal', 'mensal'].includes(recurrence) ? recurrence : null;
    const safeChecklist = Array.isArray(checklist)
      ? checklist.map((item, i) => ({ id: item.id || `c${Date.now()}_${i}`, text: String(item.text || '').slice(0, 300), done: !!item.done }))
      : [];

    const result = await queryOne(`
      INSERT INTO tasks (title, requester, assignee_id, priority, deadline, status, description, what_to_do, created_by, checklist, recurrence)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
    `, [title, requester, req.user.id, priority, deadline || null, status, description || '', what_to_do || '', req.user.id, JSON.stringify(safeChecklist), finalRecurrence]);

    await addHistory(result.id, req.user.id, `Tarefa criada com status "${status}".`);
    res.status(201).json(await queryOne('SELECT * FROM tasks WHERE id = $1', [result.id]));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// PUT /api/tasks/:id — só o criador/responsável edita
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    // Só o responsável pode editar
    if (task.assignee_id !== req.user.id && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Somente o responsável pode editar esta tarefa' });
    }

    const { title, requester, priority, deadline, status, description, what_to_do, checklist, recurrence } = req.body;
    const finalStatus = status || task.status;
    const finalChecklist = Array.isArray(checklist)
      ? checklist.map((item, i) => ({ id: item.id || `c${Date.now()}_${i}`, text: String(item.text || '').slice(0, 300), done: !!item.done }))
      : (task.checklist || []);
    const finalRecurrence = recurrence !== undefined
      ? (['diaria', 'semanal', 'mensal'].includes(recurrence) ? recurrence : null)
      : task.recurrence;

    await query(`
      UPDATE tasks SET title=$1, requester=$2, priority=$3, deadline=$4,
      status=$5, description=$6, what_to_do=$7, checklist=$8, recurrence=$9, updated_at=NOW()
      WHERE id=$10
    `, [
      title || task.title, requester || task.requester, priority || task.priority,
      deadline !== undefined ? (deadline || null) : task.deadline,
      finalStatus, description !== undefined ? description : task.description,
      what_to_do !== undefined ? what_to_do : task.what_to_do,
      JSON.stringify(finalChecklist), finalRecurrence, task.id
    ]);

    if (status && status !== task.status) {
      await addHistory(task.id, req.user.id, `Status alterado de "${task.status}" para "${finalStatus}".`);
    }

    res.json(await queryOne('SELECT * FROM tasks WHERE id = $1', [task.id]));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// DELETE /api/tasks/:id — só o responsável deleta
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (task.assignee_id !== req.user.id && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Somente o responsável pode excluir esta tarefa' });
    }
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// Checklist
router.patch('/:id/checklist/:itemId', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (task.assignee_id !== req.user.id && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Somente o responsável pode marcar o checklist' });
    }
    const { done } = req.body;
    const updated = (task.checklist || []).map(item =>
      item.id === req.params.itemId ? { ...item, done: !!done } : item
    );
    await query('UPDATE tasks SET checklist=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(updated), task.id]);
    res.json({ success: true, checklist: updated });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// Comments
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comentário não pode ser vazio' });
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const result = await queryOne(
      `INSERT INTO comments (task_id, user_id, content, type) VALUES ($1,$2,$3,'comment') RETURNING id`,
      [task.id, req.user.id, content]
    );
    await query(`UPDATE tasks SET updated_at=NOW() WHERE id=$1`, [task.id]);
    res.status(201).json(await queryOne(`
      SELECT c.*, u.name as user_name, u.initials as user_initials, u.color as user_color
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1
    `, [result.id]));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
