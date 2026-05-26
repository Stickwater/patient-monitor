// 认证路由
const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { userDAO } = require('../dao');

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

// POST /api/v1/auth/logout - 登出（需登录）
router.post('/logout', authenticate, authController.logout);

// GET /api/v1/auth/doctors - 获取所有医生
router.get('/doctors', authenticate, async (req, res, next) => {
  try {
    const doctors = await userDAO.findAll({ role: 'doctor' }, {
      attributes: ['user_id', 'username', 'real_name', 'department', 'phone']
    });
    res.json({ code: 200, message: '获取成功', data: doctors });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
