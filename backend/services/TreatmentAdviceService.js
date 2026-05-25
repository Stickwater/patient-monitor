// 诊疗建议服务
const { TreatmentAdvice, Patient, User } = require('../models');
const { BusinessError } = require('../middleware/errorHandler');

// 创建诊疗建议
const createAdvice = async (data, doctorId) => {
  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw new BusinessError('患者不存在', 404);

  const adviceId = 'TA' + Date.now();
  const advice = await TreatmentAdvice.create({
    advice_id: adviceId,
    patient_id: data.patientId,
    doctor_id: doctorId,
    type: data.type || 'treatment',
    title: data.title,
    content: data.content,
    is_active: true,
    create_time: new Date()
  });

  return advice;
};

// 获取患者诊疗建议列表
const getAdvicesByPatient = async (patientId, type) => {
  const where = { patient_id: patientId, is_active: true };
  if (type) where.type = type;

  return await TreatmentAdvice.findAll({
    where,
    include: [
      { model: User, as: 'doctor', attributes: ['user_id', 'real_name'] }
    ],
    order: [['create_time', 'DESC']]
  });
};

// 获取我的诊疗建议（患者端）
const getMyAdvices = async (userId, type) => {
  const user = await User.findByPk(userId);
  if (!user) throw new BusinessError('用户不存在', 404);

  // 通过真实姓名查找患者
  const patient = await Patient.findOne({
    where: { name: user.real_name }
  });

  if (!patient) return [];

  const where = { patient_id: patient.patient_id, is_active: true };
  if (type) where.type = type;

  return await TreatmentAdvice.findAll({
    where,
    include: [
      { model: User, as: 'doctor', attributes: ['user_id', 'real_name'] }
    ],
    order: [['create_time', 'DESC']]
  });
};

// 删除诊疗建议
const deleteAdvice = async (adviceId, doctorId) => {
  const advice = await TreatmentAdvice.findByPk(adviceId);
  if (!advice) throw new BusinessError('建议不存在', 404);

  await advice.update({ is_active: false });
  return { message: '删除成功' };
};

module.exports = {
  createAdvice,
  getAdvicesByPatient,
  getMyAdvices,
  deleteAdvice
};
