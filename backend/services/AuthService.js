// 认证服务
const { userDAO } = require('../dao');
const { generateToken } = require('../config/jwt');
const { BusinessError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES) || 30;

// 登录
const login = async (username, password, rememberMe = false) => {
  const user = await userDAO.findOne({ username });

  if (!user) {
    throw new BusinessError('账号或密码错误', 401);
  }

  // 检查是否被锁定
  if (user.isLocked()) {
    const lockTime = new Date(user.lock_until);
    const remainingMinutes = Math.ceil((lockTime - new Date()) / 60000);
    throw new BusinessError(`账号已被锁定，请在${remainingMinutes}分钟后重试`, 403);
  }

  // 验证密码
  const isValid = await user.validatePassword(password);
  if (!isValid) {
    // 增加登录失败次数
    const attempts = user.login_attempts + 1;
    
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
      await user.update({
        login_attempts: attempts,
        status: 'locked',
        lock_until: lockUntil
      });
      throw new BusinessError(`连续${MAX_LOGIN_ATTEMPTS}次登录失败，账号已锁定${LOCK_DURATION_MINUTES}分钟`, 403);
    }

    await user.update({ login_attempts: attempts });
    throw new BusinessError(`账号或密码错误，剩余${MAX_LOGIN_ATTEMPTS - attempts}次机会`, 401);
  }

  // 登录成功，重置计数
  await user.update({
    login_attempts: 0,
    status: 'active',
    lock_until: null
  });

  // 生成Token
  const token = generateToken({
    userId: user.user_id,
    username: user.username,
    role: user.role
  }, rememberMe);

  return {
    token,
    user: {
      userId: user.user_id,
      username: user.username,
      realName: user.real_name,
      role: user.role,
      department: user.department
    }
  };
};

// 找回密码
const forgotPassword = async (phone, verifyCode, newPassword, confirmPassword) => {
  // 验证密码一致性
  if (newPassword !== confirmPassword) {
    throw new BusinessError('两次输入的密码不一致', 400);
  }

  // 验证密码格式（8-20位，必须包含字母和数字）
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new BusinessError('新密码长度8-20位，必须包含字母和数字', 400);
  }

  // 验证验证码（实际项目中应使用Redis存储验证码）
  // 这里简化处理，假设验证码已通过外部服务验证
  if (!verifyCode || verifyCode.length !== 6) {
    throw new BusinessError('验证码格式错误', 400);
  }

  // 查找用户
  const user = await userDAO.findOne({ phone });
  if (!user) {
    throw new BusinessError('该手机号未注册', 404);
  }

  // 检查新密码是否与旧密码相同（需要先获取旧密码hash）
  const isSamePassword = await user.validatePassword(newPassword);
  if (isSamePassword) {
    throw new BusinessError('新密码不能与旧密码相同', 400);
  }

  // 更新密码
  await user.update({ password: newPassword });

  return { message: '密码重置成功' };
};

// 获取当前用户信息
const getCurrentUser = async (userId) => {
  const user = await userDAO.findByPk(userId, {
    attributes: ['user_id', 'username', 'role', 'real_name', 'phone', 'email', 'department', 'status']
  });

  if (!user) {
    throw new BusinessError('用户不存在', 404);
  }

  return user;
};

// 修改密码（已登录用户）
const changePassword = async (userId, oldPassword, newPassword, confirmPassword) => {
  const user = await userDAO.findByPk(userId);

  if (!user) {
    throw new BusinessError('用户不存在', 404);
  }

  // 验证新密码一致性
  if (newPassword !== confirmPassword) {
    throw new BusinessError('两次输入的密码不一致', 400);
  }

  // 验证旧密码
  const isValid = await user.validatePassword(oldPassword);
  if (!isValid) {
    throw new BusinessError('原密码错误', 400);
  }

  // 验证新密码格式
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new BusinessError('新密码长度8-20位，必须包含字母和数字', 400);
  }

  // 检查新密码是否与旧密码相同
  const isSamePassword = await user.validatePassword(newPassword);
  if (isSamePassword) {
    throw new BusinessError('新密码不能与旧密码相同', 400);
  }

  // 更新密码
  await user.update({ password: newPassword });

  return { message: '密码修改成功' };
};

module.exports = {
  login,
  forgotPassword,
  getCurrentUser,
  changePassword
};
