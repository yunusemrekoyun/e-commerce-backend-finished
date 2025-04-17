const express = require("express");
const Category = require("../models/Category.js");
const router = express.Router();
const Product = require("../models/Product.js");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Yeni endpoint: /api/products/filters
router.get("/filters", async (req, res) => {
  try {
    // 1) Renkleri distinct olarak çek
    const distinctColors = await Product.distinct("colors");
    // 2) Bedenleri distinct olarak çek
    const distinctSizes = await Product.distinct("sizes");
    // 3) Markaları distinct olarak çek
    const distinctBrands = await Product.distinct("brand");

    return res.json({
      colors: distinctColors,
      sizes: distinctSizes,
      brands: distinctBrands,
    });
  } catch (error) {
    console.error("filters endpoint error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

// Yeni bir ürün oluşturma (Create)
router.post("/", upload.array("img", 6), async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      description,
      colors,
      sizes,
      current,
      discount,
    } = req.body;

    if (!name || !category || !brand || !description) {
      return res
        .status(400)
        .json({ error: "Name, category, brand ve description gerekli." });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "En az bir görsel gerekli." });
    }

    const priceObj = {
      current: Number(current) || 0,
      discount: Number(discount) || 0,
    };

    const colorArr = Array.isArray(colors)
      ? colors
      : colors.split(",").map((c) => c.trim());
    const sizeArr = Array.isArray(sizes)
      ? sizes
      : sizes.split(",").map((s) => s.trim());

    const images = req.files.map((file) => ({
      data: file.buffer,
      contentType: file.mimetype,
    }));

    const newProduct = new Product({
      name,
      img: images,
      description,
      colors: colorArr,
      sizes: sizeArr,
      price: priceObj,
      category,
      brand, // ← burayı ekledik
    });

    await newProduct.save();
    return res.status(201).json({ message: "Product created successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Tüm ürünleri getirme (Read - All)
router.get("/", async (req, res) => {
  try {
    const { category, colors, sizes, priceMin, priceMax, sort, brand } =
      req.query;

    const queryObj = {};

    // 1) Kategori (isim üzerinden)
    if (category) {
      const foundCat = await Category.findOne({ name: category });
      if (!foundCat) {
        return res.status(200).json([]); // kategori yok => boş dizi
      }
      queryObj.category = foundCat._id;
    }

    // 2) Brand filtresi
    if (brand) {
      const brandArr = brand.split(",");
      queryObj.brand = { $in: brandArr };
    }

    // 3) Colors
    if (colors) {
      const colorArr = colors.split(",");
      queryObj.colors = { $in: colorArr };
    }

    // 4) Sizes
    if (sizes) {
      const sizeArr = sizes.split(",");
      queryObj.sizes = { $in: sizeArr };
    }

    // 5) Price
    const minVal = priceMin ? Number(priceMin) : 0;
    const maxVal = priceMax ? Number(priceMax) : 999999;
    queryObj["price.current"] = { $gte: minVal, $lte: maxVal };

    // 6) Build query
    let query = Product.find(queryObj);

    // 7) Sort
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
          break;
      }
    }

    const products = await query;

    // 8) Buffer -> Base64 + brand ekle
    const productsWithBase64 = products.map((prod) => {
      const base64Images = prod.img.map(
        (fileObj) =>
          `data:${fileObj.contentType};base64,${fileObj.data.toString(
            "base64"
          )}`
      );
      return {
        _id: prod._id,
        name: prod.name,
        img: base64Images,
        colors: prod.colors,
        sizes: prod.sizes,
        price: prod.price,
        category: prod.category,
        brand: prod.brand, // ← döndürülüyor
        description: prod.description,
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt,
      };
    });

    res.status(200).json(productsWithBase64);
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

    const imageObjects = product.img.map((fileObj) => ({
      _id: fileObj._id,
      base64: `data:${fileObj.contentType};base64,${fileObj.data.toString(
        "base64"
      )}`,
    }));

    const productWithBase64 = {
      _id: product._id,
      name: product.name,
      img: imageObjects,
      colors: product.colors,
      sizes: product.sizes,
      price: product.price,
      category: product.category,
      brand: product.brand, // ← burada da
      description: product.description,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      reviews: product.reviews || [],
    };

    res.status(200).json(productWithBase64);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Ürün güncelleme (Update)
router.put("/:productId", upload.array("img", 6), async (req, res) => {
  try {
    const productId = req.params.productId;
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found." });
    }

    const {
      name,
      category,
      brand,
      description,
      current,
      discount,
      colors,
      sizes,
      keepImages,
    } = req.body;

    // Text fields
    if (name) existingProduct.name = name;
    if (category) existingProduct.category = category;
    if (brand) existingProduct.brand = brand; // ← güncelle
    if (description) existingProduct.description = description;
    if (current || discount) {
      existingProduct.price.current = Number(current) || 0;
      existingProduct.price.discount = Number(discount) || 0;
    }

    // Colors, sizes parse
    if (colors) {
      existingProduct.colors = Array.isArray(colors)
        ? colors
        : colors.split(",").map((c) => c.trim());
    }
    if (sizes) {
      existingProduct.sizes = Array.isArray(sizes)
        ? sizes
        : sizes.split(",").map((s) => s.trim());
    }

    // Images: keepImages & new files (aynı kaldı)
    let keepIDs = [];
    if (keepImages) {
      try {
        keepIDs = JSON.parse(keepImages);
      } catch (e) {
        console.error("keepImages parse error:", e);
      }
    }
    existingProduct.img = existingProduct.img.filter((imgSubDoc) =>
      keepIDs.includes(imgSubDoc._id.toString())
    );
    if (req.files && req.files.length) {
      req.files.forEach((file) =>
        existingProduct.img.push({
          data: file.buffer,
          contentType: file.mimetype,
        })
      );
    }
    if (existingProduct.img.length > 6) {
      return res
        .status(400)
        .json({ error: "En fazla 6 görsel yükleyebilirsiniz." });
    }

    await existingProduct.save();
    res.status(200).json({ message: "Product updated successfully." });
  } catch (error) {
    console.error(error);
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
    res.status(200).json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Ürün isme göre arama
router.get("/search/:productName", async (req, res) => {
  try {
    const productName = req.params.productName;
    const products = await Product.find({
      name: { $regex: productName, $options: "i" },
    });

    const productsWithBase64 = products.map((prod) => ({
      _id: prod._id,
      name: prod.name,
      img: prod.img.map(
        (fileObj) =>
          `data:${fileObj.contentType};base64,${fileObj.data.toString(
            "base64"
          )}`
      ),
      brand: prod.brand, // ← ekledik
    }));

    res.status(200).json(productsWithBase64);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
