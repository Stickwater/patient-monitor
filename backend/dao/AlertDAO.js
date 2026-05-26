// 报警数据访问对象
const { Alert } = require('../models');

const findByPk = (id, options) => Alert.findByPk(id, options);
const findOne = (where, options) => Alert.findOne({ where, ...options });
const findAll = (where, options) => Alert.findAll({ where, ...options });
const findAndCountAll = (where, options) => Alert.findAndCountAll({ where, ...options });
const create = (data) => Alert.create(data);
const update = (id, data) => Alert.update(data, { where: { alert_id: id } });
const count = (where, options) => Alert.count({ where, ...options });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, count, Model: Alert };
