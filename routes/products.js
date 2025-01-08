const express = require("express");
const Category = require("../models/Category.js");
const router = express.Router();
const Product = require("../models/Product.js");

// Yeni endpoint: /api/products/filters
router.get("/filters", async (req, res) => {
  try {
    // 1) Renkleri distinct olarak çek
    const distinctColors = await Product.distinct("colors");
    // 2) Bedenleri distinct olarak çek
    const distinctSizes = await Product.distinct("sizes");

    return res.json({
      colors: distinctColors,
      sizes: distinctSizes,
    });
  } catch (error) {
    console.error("filters endpoint error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});
// Yeni bir ürün oluşturma (Create)
router.post("/", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();

    res.status(201).json(newProduct);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});
// Tüm ürünleri getirme (Read - All)
router.get("/", async (req, res) => {
  try {
    const {
      category, // kategori ismi => bulup category._id
      colors, // "Red,Blue"
      sizes, // "M,L"
      priceMin, // "0"
      priceMax, // "300"
      sort, // "priceAsc" "priceDesc" "nameAsc" "nameDesc" "dateAsc" "dateDesc"
    } = req.query;

    const queryObj = {};

    // 1) Kategori
    if (category) {
      const foundCat = await Category.findOne({ name: category });
      if (!foundCat) {
        return res.status(200).json([]); // kategori yok => boş
      }
      queryObj.category = foundCat._id;
    }

    // 2) Colors => eğer "Red,Blue" => { colors: { $in: ["Red","Blue"] } }
    if (colors) {
      const colorArr = colors.split(",");
      queryObj.colors = { $in: colorArr };
    }

    // 3) Sizes => eğer "M,L" => { sizes: { $in: ["M","L"] } }
    if (sizes) {
      const sizeArr = sizes.split(",");
      queryObj.sizes = { $in: sizeArr };
    }

    // 4) Price => { "price.current": { $gte: +priceMin, $lte: +priceMax } }
    const minVal = priceMin ? Number(priceMin) : 0;
    const maxVal = priceMax ? Number(priceMax) : 999999;
    queryObj["price.current"] = { $gte: minVal, $lte: maxVal };

    // 5) find
    let query = Product.find(queryObj);

    // 6) Sort
    // "priceAsc", "priceDesc", "nameAsc", "nameDesc", "dateAsc", "dateDesc"
    if (sort) {
      switch (sort) {
        case "priceAsc":
          query = query.sort({ "price.current": 1 });
          break;
        case "priceDesc":
          query = query.sort({ "price.current": -1 });
          break;
        case "nameAsc":
          query = query.sort({ name: 1 });
          break;
        case "nameDesc":
          query = query.sort({ name: -1 });
          break;
        case "dateAsc":
          query = query.sort({ createdAt: 1 });
          break;
        case "dateDesc":
          query = query.sort({ createdAt: -1 });
          break;
        default:
          // no sort
          break;
      }
    }

    const products = await query;
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error." });
  }
});

// Belirli bir ürünü getirme (Read - Single)
router.get("/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.status(200).json(product);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

//ürün güncelleme
router.put("/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const updates = req.body;
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      res.status(404).json({ error: "Product not found." });
    }
    const updatedProduct = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Ürün silme (Delete)
router.delete("/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.status(200).json(deletedProduct);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});
//Ürünleri isme göre arama
router.get("/search/:productName", async (req, res) => {
  try {
    const productName = req.params.productName;
    const products = await Product.find({
      name: { $regex: productName, $options: "i" },
    });
    res.status(200).json(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});
module.exports = router;
