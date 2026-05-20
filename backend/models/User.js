// 用户模型
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.STRING(32),
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('nurse', 'doctor', 'patient'),
    allowNull: false
  },
  real_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'locked'),
    defaultValue: 'active'
  },
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lock_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false
});

// 密码加密
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// 密码验证
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// 检查是否被锁定
User.prototype.isLocked = function() {
  if (this.status === 'locked' && this.lock_until) {
    return new Date() < new Date(this.lock_until);
  }
  return false;
};

module.exports = User;
