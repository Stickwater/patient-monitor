// 诊疗建议数据访问对象
const { TreatmentAdvice } = require('../models');

const findByPk = (id, options) => TreatmentAdvice.findByPk(id, options);
const findOne = (where, options) => TreatmentAdvice.findOne({ where, ...options });
const findAll = (where, options) => TreatmentAdvice.findAll({ where, ...options });
const findAndCountAll = (where, options) => TreatmentAdvice.findAndCountAll({ where, ...options });
const create = (data) => TreatmentAdvice.create(data);
const update = (id, data) => TreatmentAdvice.update(data, { where: { advice_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: TreatmentAdvice };
