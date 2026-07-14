const express = require('express');
const { query } = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Todos os usuários podem ver a lista (para exibir responsáveis nas tarefas)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    res.json(await query('SELECT id, name, email, initials, color FROM users ORDER BY name'));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
