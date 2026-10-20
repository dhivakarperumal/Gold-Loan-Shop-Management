const { getDashboardData } = require('../modules/dashboardModule');
const { parseDateRange } = require('../utils/dateRange');

async function getDashboard(req, res, next) {
  try {
    const range = req.query.range || 'month';
    if (Object.prototype.hasOwnProperty.call(req.query, 'datePreset')) {
      const dateRange = parseDateRange(req.query);
      if (dateRange.error) return res.status(400).json({ message: dateRange.error });
      return res.json(await getDashboardData(range, dateRange));
    }
    const data = await getDashboardData(range);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard
};
