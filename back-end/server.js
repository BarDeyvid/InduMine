require('dotenv').config(); // Carregar as variáveis de ambiente

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv'); // Se estiver usando dotenv
dotenv.config();

const app = express();

// Middleware: Permite que o Express leia JSON no corpo das requisições
app.use(express.json());

const cors = require('cors');
app.use(cors());

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB!'))
  .catch(err => console.error('Erro na conexão com MongoDB:', err));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
// Rota de teste
app.get('/', (req, res) => {
  res.send('Backend funcionando!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
