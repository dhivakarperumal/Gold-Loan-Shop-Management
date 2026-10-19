const { pool } = require('../config/db');

async function getDashboardData(range = 'month') {
  try {
    // 1. Loans metrics
    const [[loanCounts]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_loans
      FROM loans
    `);

    const [statusRows] = await pool.query(`
      SELECT loan_status, COUNT(*) AS count
      FROM loans
      GROUP BY loan_status
    `);

    const [recentLoanRows] = await pool.query(`
      SELECT 
        l.id,
        l.loan_number,
        l.jewellery_type,
        l.gold_purity,
        l.gross_weight,
        l.net_gold_weight,
        l.principal_amount,
        l.gold_valuation,
        l.loan_status,
        l.loan_date,
        l.created_at,
        c.id AS customer_id,
        c.full_name AS customer_name,
        c.mobile AS customer_mobile,
        c.photo_url AS customer_photo
      FROM loans l
      LEFT JOIN loan_customers c ON l.customer_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    // Match the Users page total: count every account in the users table.
    const [[{ total_users }]] = await pool.query(`
      SELECT COUNT(*) AS total_users FROM users
    `);
    const totalCustomers = Number(total_users) || 0;

    // 3. Products metrics
    const [[{ total_gold_stock_value }]] = await pool.query(`
      SELECT COALESCE(SUM(COALESCE(net_gold_weight, gross_weight, 0) * total_stock * COALESCE(gold_rate_per_gram, 0)), 0) AS total_gold_stock_value
      FROM products
      WHERE total_stock > 0
    `);
    const [[productCounts]] = await pool.query(`
      SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN total_stock > 0 AND total_stock < 10 THEN 1 ELSE 0 END) AS low_stock_products
      FROM products
    `);
    const [[{ total_categories }]] = await pool.query(`
      SELECT COUNT(*) AS total_categories FROM categories
    `);

    const [productRows] = await pool.query(`
      SELECT 
        id, product_code, name, category, purity, mrp, offer_price, total_stock, images, rating
      FROM products
      ORDER BY id DESC
      LIMIT 10
    `);

    // 4. Active Gold Rates
    const [goldRateRows] = await pool.query(`
      SELECT metal_type, purity, rate_per_gram, rate_date, effective_from
      FROM gold_rates
      WHERE status = 'Active'
      ORDER BY metal_type ASC, purity DESC
    `);

    // Build dashboard metrics exclusively from current database values.
    const realLoansCount = Number(loanCounts.total_loans) || 0;
    const realGoldStockValue = Number(total_gold_stock_value) || 0;
    const totalProducts = Number(productCounts.total_products) || 0;
    const lowStockProducts = Number(productCounts.low_stock_products) || 0;
    const totalCategories = Number(total_categories) || 0;

    // Status distribution
    const statusMap = {
      Active: 0,
      Processing: 0,
      Pending: 0,
      Overdue: 0,
      Closed: 0,
      Completed: 0
    };
    for (const row of statusRows) {
      if (statusMap[row.loan_status] !== undefined) {
        statusMap[row.loan_status] += Number(row.count);
      }
    }
    const completedLoans = Number(statusMap.Completed) || 0;

    const loanStatusCounts = {
      Active: statusMap.Active,
      Processing: statusMap.Processing,
      Pending: statusMap.Pending,
      Overdue: statusMap.Overdue,
    };

    const formattedRecentLoans = recentLoanRows.map((l) => {
      let img = "/images/categories/necklacecat.png";
      const type = (l.jewellery_type || '').toLowerCase();
      if (type.includes('chain')) img = "/images/categories/choker.png";
      else if (type.includes('ring')) img = "/images/categories/rings.png";
      else if (type.includes('bangle')) img = "/images/categories/bangles.png";
      else if (type.includes('earring')) img = "/images/categories/earrings.png";

      return {
        id: l.loan_number ? `#${l.loan_number.replace('GL-', 'GL')}` : `#GL${1000 + l.id}`,
        customer: l.customer_name || "Customer",
        jewellery: `${l.jewellery_type || 'Jewellery'} (${l.gold_purity || '22K'})`,
        purity: l.gold_purity || '22K',
        amount: `₹ ${Number(l.principal_amount || l.gold_valuation || 0).toLocaleString('en-IN')}`,
        rawAmount: Number(l.principal_amount || 0),
        status: l.loan_status || 'Active',
        date: l.loan_date ? new Date(l.loan_date).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
        img,
        rawId: l.id
      };
    });

    const formattedTopProducts = productRows.map((p) => {
      let img = "/images/categories/necklacecat.png";
      if (p.images) {
        try {
          const parsed = JSON.parse(p.images);
          if (Array.isArray(parsed) && parsed[0]) img = parsed[0];
        } catch {
          if (typeof p.images === 'string' && p.images.length > 2) img = p.images;
        }
      }
      return {
        id: p.id,
        name: p.name,
        cat: p.category || "Jewellery",
        price: p.offer_price ?? p.mrp ?? null,
        img
      };
    });

    const salesRange = ['week', 'month', 'year'].includes(range) ? range : 'month';
    const revenueQueries = {
      week: `
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS period_key,
          MIN(DATE_FORMAT(created_at, '%a')) AS label,
          MIN(DATE_FORMAT(created_at, '%b %d, %Y')) AS date,
          SUM(total_amount) AS revenue
        FROM billings
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          AND created_at < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `,
      month: `
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS period_key,
          MIN(DATE_FORMAT(created_at, '%b %d')) AS label,
          MIN(DATE_FORMAT(created_at, '%b %d, %Y')) AS date,
          SUM(total_amount) AS revenue
        FROM billings
        WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
          AND created_at < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `,
      year: `
        SELECT DATE_FORMAT(created_at, '%Y-%m-01') AS period_key,
          MIN(DATE_FORMAT(created_at, '%b')) AS label,
          MIN(DATE_FORMAT(created_at, '%b %Y')) AS date,
          SUM(total_amount) AS revenue
        FROM billings
        WHERE created_at >= MAKEDATE(YEAR(CURDATE()), 1)
          AND created_at < MAKEDATE(YEAR(CURDATE()) + 1, 1)
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY YEAR(created_at), MONTH(created_at)
      `
    };
    const [revenueRows] = await pool.query(revenueQueries[salesRange]);
    const revenueTrends = revenueRows.map((row) => ({
      label: row.label,
      date: row.date,
      revenue: Number(row.revenue) || 0
    }));

    const totalCustomersFormatted = totalCustomers.toLocaleString('en-IN');
    const goldStockValueFormatted = `₹ ${realGoldStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return {
      stats: [
        {
          id: "total_customers",
          label: "Total Customers",
          value: totalCustomersFormatted,
          trend: "Users table count",
          trendUp: true,
          icon: "users",
          color: "emerald"
        },
        {
          id: "active_gold_loans",
          label: "Active Gold Loans",
          value: statusMap.Active.toLocaleString('en-IN'),
          trend: "Live API count",
          trendUp: true,
          icon: "loan",
          color: "amber"
        },
        {
          id: "today_collection",
          label: "Today's Collection",
          value: "—",
          trend: "No loan payment data",
          trendUp: true,
          icon: "rupee",
          color: "emerald"
        },
        {
          id: "gold_stock_value",
          label: "Gold Stock Value",
          value: goldStockValueFormatted,
          trend: "Live API estimate",
          trendUp: true,
          icon: "gold",
          color: "amber"
        },
        {
          id: "total_products",
          label: "Total Products",
          value: totalProducts.toLocaleString('en-IN'),
          trend: "Inventory items",
          trendUp: true,
          icon: "products",
          color: "blue"
        },
        {
          id: "total_categories",
          label: "Total Categories",
          value: totalCategories.toLocaleString('en-IN'),
          trend: "Product categories",
          trendUp: true,
          icon: "categories",
          color: "purple"
        },
        {
          id: "completed_loans",
          label: "Completed Loans",
          value: completedLoans.toLocaleString('en-IN'),
          trend: "Closed loans",
          trendUp: true,
          icon: "completed",
          color: "teal"
        },
        {
          id: "low_stock_products",
          label: "Low Stock Products",
          value: lowStockProducts.toLocaleString('en-IN'),
          trend: "Below 10 units",
          trendUp: false,
          icon: "low-stock",
          color: "rose"
        }
      ],
      loanStatusCounts,
      totalLoansCount: realLoansCount,
      recentLoans: formattedRecentLoans.slice(0, 5),
      topProducts: formattedTopProducts.slice(0, 5),
      revenueTrends,
      goldRates: goldRateRows
    };
  } catch (error) {
    console.error("Dashboard Module Error:", error);
    throw error;
  }
}

module.exports = {
  getDashboardData
};
