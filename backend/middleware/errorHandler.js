// 全局异常处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('全局错误:', err);

  // Sequelize验证错误
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({
      code: 400,
      message: '数据验证失败',
      errors
    });
  }

  // Sequelize唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      code: 400,
      message: '数据已存在，请勿重复添加'
    });
  }

  // 自定义业务错误
  if (err.isBusinessError) {
    return res.status(err.status || 400).json({
      code: err.status || 400,
      message: err.message
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: 'Token无效'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      message: 'Token已过期'
    });
  }

  // 默认错误
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
};

// 404处理
const notFoundHandler = (req, res) => {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在'
  });
};

// 业务异常类
class BusinessError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.isBusinessError = true;
    this.status = status;
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  BusinessError
};
