// 诊疗建议控制器
const { treatmentAdviceService } = require('../services');

const createAdvice = async (req, res, next) => {
  try {
    const result = await treatmentAdviceService.createAdvice(req.body, req.userId);
    res.json({ code: 200, message: '创建成功', data: result });
  } catch (error) {
    next(error);
  }
};

const getAdvicesByPatient = async (req, res, next) => {
  try {
    const advices = await treatmentAdviceService.getAdvicesByPatient(
      req.params.patientId,
      req.query.type
    );
    res.json({ code: 200, message: '获取成功', data: advices });
  } catch (error) {
    next(error);
  }
};

const getMyAdvices = async (req, res, next) => {
  try {
    const advices = await treatmentAdviceService.getMyAdvices(
      req.userId,
      req.query.type
    );
    res.json({ code: 200, message: '获取成功', data: advices });
  } catch (error) {
    next(error);
  }
};

const deleteAdvice = async (req, res, next) => {
  try {
    const result = await treatmentAdviceService.deleteAdvice(
      req.params.adviceId,
      req.userId
    );
    res.json({ code: 200, message: '删除成功', data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAdvice,
  getAdvicesByPatient,
  getMyAdvices,
  deleteAdvice
};
