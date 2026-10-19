const { getDashboardData } = require('../modules/dashboardModule');

async function getDashboard(req, res, next) {
  try {
    const range = req.query.range || 'month';
    const data = await getDashboardData(range);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard
};
