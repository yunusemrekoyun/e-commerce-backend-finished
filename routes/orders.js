const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Address = require("../models/Address");
const Order = require("../models/Order");
const Product = require("../models/Product");

/** Kullanıcı kendi siparişlerini görür **/
router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ error: "Server error." });
  }
});

/** Admin tüm siparişleri görür **/
router.get("/all", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Yetkiniz yok." });
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Fetch all orders error:", error);
    res.status(500).json({ error: "Server error." });
  }
});

/** Sipariş oluştur (Create) **/
// POST /api/orders
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { addressId, items } = req.body;
    if (!addressId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "addressId ve items gerekli." });
    }

    // 1) Adresi al & doğrula
    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.id,
    });
    if (!address) return res.status(404).json({ error: "Adres bulunamadı." });

    // 2) Ürünleri çek + kategori adını populate ile al
    const prodIds = items.map((it) => it.productId);
    const products = await Product.find({ _id: { $in: prodIds } })
      .select("name brand colors sizes")
      .populate("category", "name");

    // 3) Zenginleştirilmiş item dizisi
    const enrichedItems = items.map((it) => {
      const p = products.find((p) => p._id.equals(it.productId));
      return {
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
        name: p.name,
        brand: p.brand,
        category: p.category.name,
        color: it.selectedColor || null, // ✅ yeni eklenen alan
        size: it.selectedSize || null, // ✅ yeni eklenen alan
      };
    });

    // 4) Toplamı hesapla
    const total = enrichedItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );

    // 5) Kaydet
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
      // status: default zaten "Sipariş Alındı"
    });
    await newOrder.save();

    res.status(201).json({ message: "Order created", orderId: newOrder._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

/** Admin sipariş durumu güncelleme **/
router.put("/:orderId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Yetkiniz yok." });
    }
    const { status } = req.body;
    const valid = [
      "Sipariş Alındı",
      "Sipariş Onaylandı",
      "Kargoya Verildi",
      "Teslim Edildi",
    ];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: "Geçersiz status." });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order bulunamadı." });
    res.status(200).json(order);
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
