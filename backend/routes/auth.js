// 认证路由
const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

// 登录验证规则
const loginValidation = [
  body('username').notEmpty().withMessage('请输入用户名'),
  body('password').notEmpty().withMessage('请输入密码')
];

// POST /api/v1/auth/login - 登录
router.post('/login', loginValidation, authController.login);

// POST /api/v1/auth/forgot-password - 找回密码
router.post('/forgot-password', authController.forgotPassword);

// GET /api/v1/auth/current - 获取当前用户信息（需登录）
router.get('/current', authenticate, authController.getCurrentUser);

// POST /api/v1/auth/change-password - 修改密码（需登录）
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
