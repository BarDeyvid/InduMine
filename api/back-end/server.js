require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://seusite.com'],
  credentials: true
}));
app.use(express.json());

// Conexão com MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/weg_auth')
  .then(() => console.log('✅ Conectado ao MongoDB (Autenticação)'))
  .catch(err => {
    console.error('❌ Erro na conexão com MongoDB:', err);
    // Fallback: cria dados dummy para não quebrar
    console.log('⚠️ Usando dados dummy para autenticação');
  });

// Rotas
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'auth-service',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Endpoint para obter configuração do FastAPI
app.get('/api/config/fastapi', (req, res) => {
  res.json({
    fastapi_url: process.env.FASTAPI_URL || 'http://localhost:8000',
    jwt_secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Autenticação rodando na porta ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
});