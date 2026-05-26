// 医疗报告数据访问对象
const { MedicalReport } = require('../models');

const findByPk = (id, options) => MedicalReport.findByPk(id, options);
const findOne = (where, options) => MedicalReport.findOne({ where, ...options });
const findAll = (where, options) => MedicalReport.findAll({ where, ...options });
const findAndCountAll = (where, options) => MedicalReport.findAndCountAll({ where, ...options });
const create = (data) => MedicalReport.create(data);
const update = (id, data) => MedicalReport.update(data, { where: { report_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: MedicalReport };
