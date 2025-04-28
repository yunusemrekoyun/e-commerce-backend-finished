/*/Applications/Works/e-commerce/backend/routes/discount.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Category = require("../models/Category");
const Product = require("../models/Product");

// **Yalnızca admin erişimi**
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: admin only." });
  }
  next();
};

// 1) İndirimli ürünler listesi
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
    res.json(list);
  } catch (err) {
    console.error("GET /discounts/products", err);
    res.status(500).json({ error: "Server error." });
  }
});

// 2) İndirim uygula
// POST /api/discounts/apply
// body: { categoryId: string, brandIds?: string[], discount: number }
router.post("/apply", authMiddleware, requireAdmin, async (req, res) => {
  try {

    const { categoryId, brandIds, discount, updateAll } = req.body;
    if (!categoryId || typeof discount !== "number") {
      return res.status(400).json({ error: "categoryId ve discount zorunlu." });
    }

    const filter = {
      category: categoryId,
    };

    if (!updateAll) {
      filter["price.discount"] = { $eq: 0 }; // 🔥 sadece indirimi olmayan ürünler
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


    res.json({
      message: `Etkilenen doküman sayısı: ${result.modifiedCount}`,
    });
  } catch (err) {
    console.error("POST /discounts/apply", err);
    res.status(500).json({ error: "Server error." });
  }
});
// Seçilen kategori ve markalarda indirimli ürün var mı kontrolü
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

    res.json({ hasDiscountedProducts: count > 0 });
  } catch (err) {
    console.error("POST /discounts/check", err);
    res.status(500).json({ error: "Server error." });
  }
});
router.delete("/:productId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Ürün bulunamadı." });
    }

    product.price.discount = 0;
    await product.save();

    res.json({ message: "İndirim kaldırıldı." });
  } catch (err) {
    console.error("DELETE /discounts/:productId", err);
    res.status(500).json({ error: "Server error." });
  }
});
module.exports = router;
