// 用户数据访问对象
const { User } = require('../models');

const findByPk = (id, options) => User.findByPk(id, options);
const findOne = (where, options) => User.findOne({ where, ...options });
const findAll = (where, options) => User.findAll({ where, ...options });
const findAndCountAll = (where, options) => User.findAndCountAll({ where, ...options });
const create = (data) => User.create(data);
const update = (id, data) => User.update(data, { where: { user_id: id } });

module.exports = { findByPk, findOne, findAll, findAndCountAll, create, update, Model: User };
