/********************************************************
	•	/Applications/Works/e-commerce/backend/routes/dashboard.js
********************************************************/
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  // Sadece admin erişebilsin
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bu alana erişim izniniz yok.",
    });
  }

  try {
    // 1) Toplam müşteri sayısı
    const totalCustomers = await User.countDocuments({});

    // 2) Toplam satış adedi
    const salesAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: null, total: { $sum: "$items.quantity" } } },
    ]);
    const totalSales = salesAgg[0]?.total || 0;

    // 3) Toplam ciro
    const revenueAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // 4) Son 6 ay ürün satış artışı
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyProductSales = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: "$items.quantity" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", count: 1, _id: 0 } },
    ]);

    // 5) Son 6 ay müşteri artışı
    const monthlyCustomerGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", count: 1, _id: 0 } },
    ]);

    // 6) Başarılı yanıtı döndür
    return res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalCustomers,
        totalRevenue,
        monthlyProductSales,
        monthlyCustomerGrowth,
      },
      message: "Dashboard verileri başarıyla getirildi.",
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Dashboard verileri alınırken bir hata oluştu.",
    });
  }
});

module.exports = router;
