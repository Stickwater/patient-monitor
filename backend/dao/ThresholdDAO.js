// 阈值数据访问对象
const { Threshold } = require('../models');

const findByPk = (id, options) => Threshold.findByPk(id, options);
const findOne = (where, options) => Threshold.findOne({ where, ...options });
const findAll = (where, options) => Threshold.findAll({ where, ...options });
const findAndCountAll = (where, options) => Threshold.findAndCountAll({ where, ...options });
const create = (data) => Threshold.create(data);
const update = (id, data) => Threshold.update(data, { where: { threshold_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: Threshold };
