const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const jwt = require('jsonwebtoken'); 

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    
    try {
        let userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ msg: 'Usuário com este e-mail já existe.' });
        }
        let user = new User({ 
            username, 
            email, 
            password, 
            role: role || 'user' 
        });
        await user.save();
        res.status(201).json({ 
            msg: 'Usuário registrado com sucesso!', 
            token: generateToken(user._id),
            user: { username: user.username, email: user.email, role: user.role } 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no Servidor ao registrar usuário');
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            res.json({
                msg: 'Login bem-sucedido',
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({ msg: 'Email ou PIN inválido.' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no Servidor');
    }
});

module.exports = router;