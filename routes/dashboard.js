const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  // Sadece admin görebilsin
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Yetkiniz yok." });
  }

  try {
    // — Toplam ürün satışı
    const salesAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: null, totalSales: { $sum: "$items.quantity" } } },
    ]);
    const totalSales = salesAgg[0]?.totalSales || 0;

    // — Toplam gelir
    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // — Toplam müşteri sayısı
    const totalCustomers = await User.countDocuments();

    // — Son 6 aya ait array’ler
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7)); // "2025-04"
    }
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // — Aylık ürün satışı
    const monthlySalesAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: "$items.quantity" },
        },
      },
    ]);
    const monthlyProductSales = months.map((m) => {
      const found = monthlySalesAgg.find((x) => x._id === m);
      return { month: m, count: found?.count || 0 };
    });

    // — Aylık yeni müşteri sayısı
    const monthlyCustomerAgg = await User.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);
    const monthlyCustomerGrowth = months.map((m) => {
      const found = monthlyCustomerAgg.find((x) => x._id === m);
      return { month: m, count: found?.count || 0 };
    });

    return res.json({
      totalSales,
      totalCustomers,
      totalRevenue,
      monthlyProductSales,
      monthlyCustomerGrowth,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
