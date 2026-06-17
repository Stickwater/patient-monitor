// 仪表盘控制器
const { dashboardService } = require('../services');

const getOverview = async (req, res, next) => {
  try {
    const result = await dashboardService.getOverview();
    res.json({ code: 200, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview };
