// 管理员路由（临时种子接口，答辩后可删除）
const express = require('express');
const router = express.Router();
const { seed } = require('../seed_mysql');

const SEED_SECRET = process.env.SEED_SECRET || 'patient2024seed';

router.get('/seed', async (req, res) => {
  if (req.query.secret !== SEED_SECRET) {
    return res.status(403).json({ code: 403, message: '无权限' });
  }
  try {
    const result = await seed();
    res.json({ code: 200, message: '种子数据灌入成功', data: result });
  } catch (err) {
    res.status(500).json({ code: 500, message: '种子数据灌入失败', error: err.message });
  }
});

module.exports = router;