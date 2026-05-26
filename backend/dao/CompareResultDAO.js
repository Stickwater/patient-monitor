// 比对结果数据访问对象
const { CompareResult } = require('../models');

const findByPk = (id, options) => CompareResult.findByPk(id, options);
const findOne = (where, options) => CompareResult.findOne({ where, ...options });
const findAll = (where, options) => CompareResult.findAll({ where, ...options });
const findAndCountAll = (where, options) => CompareResult.findAndCountAll({ where, ...options });
const create = (data) => CompareResult.create(data);
const update = (id, data) => CompareResult.update(data, { where: { result_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: CompareResult };
