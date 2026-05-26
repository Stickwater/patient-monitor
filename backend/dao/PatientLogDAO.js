// 患者日志数据访问对象
const { PatientLog } = require('../models');

const findByPk = (id, options) => PatientLog.findByPk(id, options);
const findOne = (where, options) => PatientLog.findOne({ where, ...options });
const findAll = (where, options) => PatientLog.findAll({ where, ...options });
const findAndCountAll = (where, options) => PatientLog.findAndCountAll({ where, ...options });
const create = (data) => PatientLog.create(data);
const update = (id, data) => PatientLog.update(data, { where: { log_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: PatientLog };
