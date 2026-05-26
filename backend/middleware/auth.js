// 认证中间件
const { verifyToken, getTokenFromHeader } = require('../config/jwt');
const { userDAO } = require('../dao');
const { Op } = require('sequelize');
const cacheService = require('../services/CacheService');

// JWT认证中间件
const authenticate = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '未登录，请先登录'
      });
    }

    // 检查 token 是否在黑名单（登出后不可再用）
    const isBlacklisted = await cacheService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        code: 401,
        message: 'Token已失效，请重新登录'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        code: 401,
        message: 'Token已失效，请重新登录'
      });
    }

    // 验证用户是否存在
    const user = await userDAO.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在'
      });
    }

    // 检查用户状态
    if (user.status === 'locked') {
      if (user.lock_until && new Date() < new Date(user.lock_until)) {
        return res.status(403).json({
          code: 403,
          message: '账号已被锁定，请稍后再试'
        });
      } else {
        // 解锁用户
        await user.update({ status: 'active', login_attempts: 0, lock_until: null });
      }
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    return res.status(500).json({
      code: 500,
      message: '认证失败'
    });
  }
};

// 角色权限中间件
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '请先登录'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        code: 403,
        message: '无权限访问该功能'
      });
    }

    next();
  };
};

// 患者只能访问自己的数据
const authorizePatient = async (req, res, next) => {
  try {
    // 护士和医生可以访问所有数据
    if (req.user.role === 'nurse' || req.user.role === 'doctor') {
      return next();
    }

    // 患者只能访问自己的数据
    if (req.user.role === 'patient') {
      const patientId = req.params.patientId || req.body.patientId;
      
      if (patientId) {
        // 从患者表查找用户的patient_id
        const { Patient } = require('../models');
        const patient = await Patient.findOne({
          where: {
            patient_id: patientId,
            [Op.or]: [
              { patient_id: req.user.user_id },
              { name: req.user.real_name }
            ]
          }
        });

        if (!patient) {
          return res.status(403).json({
            code: 403,
            message: '无权访问该患者数据'
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('权限校验错误:', error);
    return res.status(500).json({
      code: 500,
      message: '权限校验失败'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizePatient
};
