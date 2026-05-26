// 生理信号数据访问对象
const { VitalSign } = require('../models');

const findByPk = (id, options) => VitalSign.findByPk(id, options);
const findOne = (where, options) => VitalSign.findOne({ where, ...options });
const findAll = (where, options) => VitalSign.findAll({ where, ...options });
const findAndCountAll = (where, options) => VitalSign.findAndCountAll({ where, ...options });
const create = (data) => VitalSign.create(data);
const update = (id, data) => VitalSign.update(data, { where: { signal_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: VitalSign };
