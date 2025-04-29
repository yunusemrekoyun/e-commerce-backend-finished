/********************************************************
	•	/Applications/Works/e-commerce/backend/routes/orders.js
********************************************************/
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Address = require("../models/Address");
const Order = require("../models/Order");
const Product = require("../models/Product");

// 📌 Kullanıcı kendi siparişlerini görür
router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      data: orders,
      message: "Siparişler başarıyla getirildi.",
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({
      success: false,
      message: "Siparişler getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Admin tüm siparişleri görür
router.get("/all", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu alana erişim izniniz yok.",
      });
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: orders,
      message: "Tüm siparişler başarıyla getirildi.",
    });
  } catch (error) {
    console.error("Fetch all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Siparişler getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Sipariş oluştur (Create)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { addressId, items } = req.body;

    if (!addressId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Adres ID ve ürünler zorunludur.",
      });
    }

    // 1) Adres kontrolü
    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.id,
    });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Adres bulunamadı.",
      });
    }

    // 2) Ürün bilgilerini çek
    const prodIds = items.map((it) => it.productId);
    const products = await Product.find({ _id: { $in: prodIds } })
      .select("name brand colors sizes")
      .populate("category", "name");

    // 3) Ürün bilgilerini zenginleştir
    const enrichedItems = items.map((it) => {
      const p = products.find((p) => p._id.equals(it.productId));
      return {
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
        name: p.name,
        brand: p.brand,
        category: p.category.name,
        color: it.selectedColor || null,
        size: it.selectedSize || null,
      };
    });

    // 4) Toplam hesapla
    const total = enrichedItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );

    // 5) Siparişi kaydet
    const newOrder = new Order({
      userId: req.user.id,
      addressId,
      name: address.name,
      email: address.email,
      phone: address.phone,
      address: address.address,
      city: address.city,
      district: address.district,
      items: enrichedItems,
      total,
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      data: { orderId: newOrder._id },
      message: "Sipariş başarıyla oluşturuldu.",
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: "Sipariş oluşturulurken bir hata oluştu.",
    });
  }
});

// 📌 Admin sipariş durumu güncelleme
router.put("/:orderId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu işlemi sadece adminler yapabilir.",
      });
    }

    const { status } = req.body;
    const validStatuses = [
      "Sipariş Alındı",
      "Sipariş Onaylandı",
      "Kargoya Verildi",
      "Teslim Edildi",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz sipariş durumu.",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Sipariş bulunamadı.",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: "Sipariş durumu başarıyla güncellendi.",
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Sipariş durumu güncellenirken bir hata oluştu.",
    });
  }
});

module.exports = router;
