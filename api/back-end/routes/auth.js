const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: true,
      message: 'Token não fornecido' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ 
      error: true,
      message: 'Token inválido ou expirado' 
    });
  }
};

// Criar usuários demo na inicialização
router.get('/init-demo', async (req, res) => {
  try {
    await User.createDemoUsers();
    res.json({ 
      success: true, 
      message: 'Usuários demo criados com sucesso' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: true, 
      message: 'Erro ao criar usuários demo' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'Email ou senha incorretos'
      });
    }

    // Verificar senha
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: true,
        message: 'Email ou senha incorretos'
      });
    }

    // Atualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Gerar payload para token
    const tokenPayload = user.toTokenPayload();

    // Gerar token JWT
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      message: 'Login bem-sucedido',
      access_token: token,
      token_type: 'bearer',
      expires_in: JWT_EXPIRES_IN,
      user: tokenPayload
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno no servidor'
    });
  }
});

// Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'guest' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: true,
        message: 'Todos os campos são obrigatórios'
      });
    }

    // Verificar se usuário já existe
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: 'Email ou nome de usuário já cadastrado'
      });
    }

    // Criar novo usuário
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password,
      role: User.ROLES[role.toUpperCase()] || User.ROLES.GUEST
    });

    await newUser.save();

    // Gerar token para o novo usuário
    const tokenPayload = newUser.toTokenPayload();
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      access_token: token,
      token_type: 'bearer',
      user: tokenPayload
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro ao registrar usuário'
    });
  }
});

// Verificar token
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Obter usuário atual
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout (apenas no cliente)
router.post('/logout', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

// Obter usuários (apenas admin)
router.get('/users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'Acesso negado'
      });
    }

    const users = await User.find({}, { password: 0 });
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: true,
      message: 'Erro ao buscar usuários'
    });
  }
});

module.exports = router;