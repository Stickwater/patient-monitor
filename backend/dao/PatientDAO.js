// 患者数据访问对象
const { Patient } = require('../models');

const findByPk = (id, options) => Patient.findByPk(id, options);
const findOne = (where, options) => Patient.findOne({ where, ...options });
const findAll = (where, options) => Patient.findAll({ where, ...options });
const findAndCountAll = (where, options) => Patient.findAndCountAll({ where, ...options });
const create = (data) => Patient.create(data);
const update = (id, data) => Patient.update(data, { where: { patient_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: Patient };
