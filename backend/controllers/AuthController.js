// 认证控制器
const { authService } = require('../services');
const { validationResult } = require('express-validator');
const { BusinessError } = require('../middleware/errorHandler');
const { getTokenFromHeader } = require('../config/jwt');

// 登录
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BusinessError(errors.array()[0].msg, 400);
    }

    const { username, password, rememberMe } = req.body;
    const result = await authService.login(username, password, rememberMe);

    res.json({
      code: 200,
      message: '登录成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 登出
const logout = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    const result = await authService.logout(token, req.userId);

    res.json({
      code: 200,
      message: '登出成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 找回密码
const forgotPassword = async (req, res, next) => {
  try {
    const { phone, verifyCode, newPassword, confirmPassword } = req.body;
    const result = await authService.forgotPassword(phone, verifyCode, newPassword, confirmPassword);

    res.json({
      code: 200,
      message: '密码重置成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 获取当前用户信息
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.userId);

    res.json({
      code: 200,
      message: '获取成功',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// 修改密码
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const result = await authService.changePassword(req.userId, oldPassword, newPassword, confirmPassword);

    res.json({
      code: 200,
      message: '密码修改成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  forgotPassword,
  getCurrentUser,
  changePassword
};
