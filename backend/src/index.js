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
    console.log('Verificando banco de dados...');

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        initials TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        color TEXT NOT NULL DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`);

    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        requester TEXT NOT NULL,
        assignee_id INTEGER NOT NULL REFERENCES users(id),
        priority TEXT NOT NULL DEFAULT 'Media',
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'Pendente',
        description TEXT DEFAULT '',
        what_to_do TEXT DEFAULT '',
        created_by INTEGER NOT NULL REFERENCES users(id),
        checklist JSONB DEFAULT '[]'::jsonb,
        recurrence TEXT,
        filial TEXT,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS filial TEXT`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0`);

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

    const adminExists = await queryOne('SELECT id FROM users WHERE email = $1', [process.env.ADMIN_EMAIL || 'admin@prodoeste.com.br']);
    if (!adminExists) {
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await query(
        'INSERT INTO users (name, email, password, initials, role, color) VALUES ($1,$2,$3,$4,$5,$6)',
        ['Administrador', process.env.ADMIN_EMAIL || 'admin@prodoeste.com.br', hash, 'AD', 'admin', '#111827']
      );
      console.log('Admin criado: ' + (process.env.ADMIN_EMAIL || 'admin@prodoeste.com.br'));
    }

    const existing = await query("SELECT id FROM users WHERE role = 'user'");
    if (existing.length === 0) {
      const users = [
        { name: 'Antonio Diniz',  email: 'antonio.diniz@prodoeste.com.br',  initials: 'AD', color: '#6366f1' },
        { name: 'Andre Resende',  email: 'andre.resende@prodoeste.com.br',  initials: 'AR', color: '#0891b2' },
        { name: 'Bianca Fuentes', email: 'bianca.fuentes@prodoeste.com.br', initials: 'BF', color: '#10b981' },
      ];
      for (const u of users) {
        const hash = bcrypt.hashSync('senha123', 10);
        await query(
          'INSERT INTO users (name, email, password, initials, role, color) VALUES ($1,$2,$3,$4,$5,$6)',
          [u.name, u.email, hash, u.initials, 'user', u.color]
        );
        console.log('Usuario criado: ' + u.email);
      }
    }

    console.log('Banco de dados pronto!');
  } catch (err) {
    console.error('Erro ao inicializar banco:', err.message);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log('\nBackend Filiais rodando em http://localhost:' + PORT + '\n');
  });
});