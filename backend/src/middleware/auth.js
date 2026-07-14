const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'filiais_secret_2024';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
