/********************************************************
 * /Applications/Works/e-commerce/backend/routes/orders.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Address = require("../models/Address");
const Order = require("../models/Order");
const Product = require("../models/Product");

// Kullanıcıya ait siparişleri getir (Read - All)
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

// Yeni sipariş oluştur (Create)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { addressId, items } = req.body;
    if (!addressId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "addressId ve items gerekli." });
    }

    // 1) Adresi al ve doğrula
    const address = await Address.findOne({
      _id: addressId,
      userId: req.user.id,
    });
    if (!address) {
      return res.status(404).json({ error: "Adres bulunamadı." });
    }

    // 2) Ürün bilgilerini çekerek snapshot hazırla
    const prodIds = items.map((it) => it.productId);
    const products = await Product.find({ _id: { $in: prodIds } }).select(
      "name brand category colors sizes"
    );

    const enrichedItems = items.map((it) => {
      const p = products.find((p) => p._id.equals(it.productId));
      return {
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
        name: p.name,
        brand: p.brand,
        category:
          typeof p.category === "string" ? p.category : p.category.toString(),
        colors: p.colors,
        sizes: p.sizes,
      };
    });

    // 3) Toplam tutarı hesapla
    const total = enrichedItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );

    // 4) Order oluştur
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
      // status: "Processing"     // istersen sonradan ekleyebilirsin
    });
    await newOrder.save();

    res.status(201).json({ message: "Order created", orderId: newOrder._id });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
