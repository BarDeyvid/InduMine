const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  SALES: 'sales',
  GUEST: 'guest'
};

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: ROLES.GUEST,
    enum: Object.values(ROLES)
  },
  allowedCategories: [{ 
    type: String,
    default: []
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date 
  }
});

// Middleware para hash da senha
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para obter categorias permitidas
UserSchema.methods.getAccessibleCategories = function() {
  const defaultCategories = {
    [ROLES.ADMIN]: ['Motores', 'Drives', 'Softstarters', 'Painéis', 'Geradores', 'Transformadores'],
    [ROLES.ENGINEER]: ['Motores', 'Drives', 'Softstarters'],
    [ROLES.SALES]: ['Motores', 'Drives', 'Painéis'],
    [ROLES.GUEST]: ['Motores']
  };
  
  if (this.allowedCategories && this.allowedCategories.length > 0) {
    return this.allowedCategories;
  }
  
  return defaultCategories[this.role] || defaultCategories[ROLES.GUEST];
};

// Método para gerar token payload
UserSchema.methods.toTokenPayload = function() {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    role: this.role,
    allowed_categories: this.getAccessibleCategories()
  };
};

// Criar usuários demo se não existirem
UserSchema.statics.createDemoUsers = async function() {
  const demoUsers = [
    {
      username: 'admin_user',
      email: 'admin@weg.com',
      password: '1234',
      role: ROLES.ADMIN
    },
    {
      username: 'engineer_user',
      email: 'engineer@weg.com',
      password: 'engineer123',
      role: ROLES.ENGINEER
    },
    {
      username: 'sales_user',
      email: 'sales@weg.com',
      password: 'sales123',
      role: ROLES.SALES
    },
    {
      username: 'guest_user',
      email: 'guest@weg.com',
      password: 'guest123',
      role: ROLES.GUEST
    }
  ];

  for (const demoUser of demoUsers) {
    const exists = await this.findOne({ email: demoUser.email });
    if (!exists) {
      await this.create(demoUser);
      console.log(`✅ Usuário demo criado: ${demoUser.email}`);
    }
  }
};

module.exports = mongoose.model('User', UserSchema);
module.exports.ROLES = ROLES;