/********************************************************
	•	/Applications/Works/e-commerce/backend/routes/discount.js
********************************************************/
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Category = require("../models/Category");
const Product = require("../models/Product");

// 📌 Yalnızca admin erişimi middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bu işlemi sadece adminler gerçekleştirebilir.",
    });
  }
  next();
};

// 📌 1) İndirimli ürünler listesi
// GET /api/discounts/products
router.get("/products", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const prods = await Product.find({ "price.discount": { $gt: 0 } }).populate(
      "category",
      "name"
    );

    const list = prods.map((p) => ({
      _id: p._id,
      name: p.name,
      img: p.img.length
        ? `data:${p.img[0].contentType};base64,${p.img[0].data.toString(
            "base64"
          )}`
        : null,
      price: p.price,
      category: p.category?.name || null,
      brand: p.brand,
    }));

    res.status(200).json({
      success: true,
      data: list,
      message: "İndirimli ürünler başarıyla getirildi.",
    });
  } catch (err) {
    console.error("GET /discounts/products", err);
    res.status(500).json({
      success: false,
      message: "İndirimli ürünler getirilirken bir hata oluştu.",
    });
  }
});

// 📌 2) İndirim uygula
// POST /api/discounts/apply
router.post("/apply", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { categoryId, brandIds, discount, updateAll } = req.body;

    if (!categoryId || typeof discount !== "number") {
      return res.status(400).json({
        success: false,
        message: "Kategori ID'si ve indirim yüzdesi zorunludur.",
      });
    }

    const filter = { category: categoryId };

    if (!updateAll) {
      filter["price.discount"] = { $eq: 0 };
    }

    if (
      Array.isArray(brandIds) &&
      brandIds.length > 0 &&
      !brandIds.includes("all")
    ) {
      filter.brand = { $in: brandIds.map((b) => new RegExp(`^${b}$`, "i")) };
    }

    const result = await Product.updateMany(filter, {
      $set: { "price.discount": discount },
    });

    res.status(200).json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `İndirim başarıyla uygulandı. Güncellenen ürün sayısı: ${result.modifiedCount}`,
    });
  } catch (err) {
    console.error("POST /discounts/apply", err);
    res.status(500).json({
      success: false,
      message: "İndirim uygulanırken bir hata oluştu.",
    });
  }
});

// 📌 3) Seçilen kategori ve markalarda indirimli ürün var mı kontrolü
// POST /api/discounts/check
router.post("/check", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { categoryId, brandIds } = req.body;

    const filter = { category: categoryId, "price.discount": { $gt: 0 } };

    if (
      Array.isArray(brandIds) &&
      brandIds.length > 0 &&
      !brandIds.includes("all")
    ) {
      filter.brand = { $in: brandIds.map((b) => new RegExp(`^${b}$`, "i")) };
    }

    const count = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: { hasDiscountedProducts: count > 0 },
      message: "İndirimli ürün kontrolü başarıyla yapıldı.",
    });
  } catch (err) {
    console.error("POST /discounts/check", err);
    res.status(500).json({
      success: false,
      message: "İndirim kontrolü sırasında bir hata oluştu.",
    });
  }
});

// 📌 4) Bir ürünün indirimini kaldır
// DELETE /api/discounts/:productId
router.delete("/:productId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı.",
      });
    }

    product.price.discount = 0;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Üründen indirim başarıyla kaldırıldı.",
    });
  } catch (err) {
    console.error("DELETE /discounts/:productId", err);
    res.status(500).json({
      success: false,
      message: "İndirim kaldırılırken bir hata oluştu.",
    });
  }
});

module.exports = router;
