require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('./db/connection');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5174']
    : ['http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function initDB() {
  try {
    console.log('🔧 Verificando banco de dados...');

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        initials TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        requester TEXT NOT NULL,
        assignee_id INTEGER NOT NULL REFERENCES users(id),
        priority TEXT NOT NULL DEFAULT 'Média',
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'Pendente',
        description TEXT DEFAULT '',
        what_to_do TEXT DEFAULT '',
        created_by INTEGER NOT NULL REFERENCES users(id),
        checklist JSONB DEFAULT '[]'::jsonb,
        recurrence TEXT,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'comment',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Cria usuários iniciais se não existirem
    const existing = await query('SELECT id FROM users');
    if (existing.length === 0) {
      const users = [
        { name: 'Antônio Diniz', email: 'antonio.diniz@prodoeste.com.br', initials: 'U1', color: '#6366f1' },
        { name: 'André Resende', email: 'andre.resende@prodoeste.com.br', initials: 'U2', color: '#0891b2' },
        { name: 'Bianca Fuentes', email: 'bianca.fuentes@prodoeste.com.br', initials: 'U3', color: '#10b981' },
      ];
      for (const u of users) {
        const hash = bcrypt.hashSync('senha123', 10);
        await query(
          'INSERT INTO users (name, email, password, initials, color) VALUES ($1,$2,$3,$4,$5)',
          [u.name, u.email, hash, u.initials, u.color]
        );
        console.log(`✅ Usuário criado: ${u.email} / senha123`);
      }
    }

    console.log('✅ Banco de dados pronto!');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err.message);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend Filiais rodando em http://localhost:${PORT}\n`);
  });
});
