const express = require("express");
const Category = require("../models/Category.js");
const router = express.Router();
const Product = require("../models/Product.js");
const multer = require("multer");
const authMiddleware = require("../middlewares/authMiddleware");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ————————————————————————
// 1) Kullanıcıdan yeni yorum alacak endpoint
router.post("/:productId/reviews", authMiddleware, async (req, res) => {
  try {
    const { text, rating } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found." });

    // Push edip default approved:false ile kaydediyoruz
    product.reviews.push({
      text,
      rating,
      user: req.user.id,
    });

    await product.save();
    return res.status(201).json({
      message:
        "Yorumunuz başarıyla alındı, onaylandıktan sonra yayınlanacaktır.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error." });
  }
});

// ————————————————————————
// ————————————————————————
// 2) Admin için yorumları listeleme endpoint’i
router.get("/admin/reviews", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).end();

    const { approved } = req.query; // ?approved=true veya false
    // Tüm ürünleri çekip, içindeki yorumları flatten ediyoruz
    const products = await Product.find().populate("reviews.user", "username");
    let all = [];
    products.forEach((p) => {
      p.reviews.forEach((r) => {
        // sadece query’e uyanları al
        if (`${r.approved}` === approved) {
          all.push({
            productId: p._id,
            productName: p.name,
            reviewId: r._id,
            text: r.text,
            rating: r.rating,
            user: r.user.username,
            createdAt: r.createdAt,
            approved: r.approved, // ← burayı ekleyin
          });
        }
      });
    });
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// ————————————————————————
// 3) Admin onaylama endpoint’i
router.put(
  "/:productId/reviews/:reviewId/approve",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") return res.status(403).end();
      const { productId, reviewId } = req.params;
      const product = await Product.findById(productId);
      if (!product)
        return res.status(404).json({ error: "Product not found." });

      const rev = product.reviews.id(reviewId);
      if (!rev) return res.status(404).json({ error: "Review not found." });
      rev.approved = true;
      await product.save();
      res.json({ message: "Yorum onaylandı." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  }
);

router.get("/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    // reviews.user’ı populate ediyoruz ki username/avatar görünsün
    const product = await Product.findById(productId).populate(
      "reviews.user",
      "username avatar"
    );
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Sadece approved === true yorumları al
    const approvedReviews = product.reviews
      .filter((r) => r.approved)
      .map((r) => ({
        _id: r._id,
        text: r.text,
        rating: r.rating,
        user: r.user, // { username, avatar, _id }
        createdAt: r.createdAt,
      }));

    // Görselleri base64 string’e çevir
    const imageObjects = product.img.map((fileObj) => ({
      _id: fileObj._id,
      base64: `data:${fileObj.contentType};base64,${fileObj.data.toString(
        "base64"
      )}`,
    }));

    // Yanıtı döndür
    return res.status(200).json({
      _id: product._id,
      name: product.name,
      img: imageObjects,
      colors: product.colors,
      sizes: product.sizes,
      price: product.price,
      category: product.category,
      brand: product.brand,
      description: product.description,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      reviews: approvedReviews, // sadece onaylı yorumlar
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error." });
  }
});

// ————————————————————————
// 4) Admin silme endpoint’i
router.delete(
  "/:productId/reviews/:reviewId",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") return res.status(403).end();
      const { productId, reviewId } = req.params;
      const product = await Product.findById(productId);
      if (!product)
        return res.status(404).json({ error: "Product not found." });

      product.reviews.id(reviewId).remove();
      await product.save();
      res.json({ message: "Yorum silindi." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  }
);
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

/********************************************************
 * Ürün güncelleme (Update)
 ********************************************************/
router.put("/:productId", upload.array("img", 6), async (req, res) => {
  try {
    const productId = req.params.productId;
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found." });
    }

    // 1) Temel alanları güncelle
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
      reviews,
    } = req.body;

    if (name) existingProduct.name = name;
    if (category) existingProduct.category = category;
    if (brand) existingProduct.brand = brand;
    if (description) existingProduct.description = description;
    if (current != null || discount != null) {
      existingProduct.price.current = Number(current) || 0;
      existingProduct.price.discount = Number(discount) || 0;
    }
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

    // 2) Yorum güncellemesi
    if (reviews) {
      existingProduct.reviews = Array.isArray(reviews)
        ? reviews
        : JSON.parse(reviews);
    }

    // 3) ** Sadece resim değişikliği yapıldıysa** mevcut img dizisini filtrele ve/veya yenilerini ekle
    if (keepImages || (req.files && req.files.length > 0)) {
      let keepIDs = [];
      if (keepImages) {
        try {
          keepIDs = JSON.parse(keepImages);
        } catch {}
      }
      // Sadece keepIDs içindekileri tut
      existingProduct.img = existingProduct.img.filter((imgSubDoc) =>
        keepIDs.includes(imgSubDoc._id.toString())
      );
      // Yeni yüklenenleri ekle
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
    }

    // 4) Kaydet
    await existingProduct.save();

    // 5) Güncel ürünü base64 img + tüm alanlarla döndür
    const updated = await Product.findById(productId);
    const imageObjects = updated.img.map((fileObj) => ({
      _id: fileObj._id,
      base64: `data:${fileObj.contentType};base64,${fileObj.data.toString(
        "base64"
      )}`,
    }));
    const productWithBase64 = {
      _id: updated._id,
      name: updated.name,
      img: imageObjects,
      colors: updated.colors,
      sizes: updated.sizes,
      price: updated.price,
      category: updated.category,
      brand: updated.brand,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      reviews: updated.reviews || [],
    };

    return res.status(200).json(productWithBase64);
  } catch (error) {
    console.error("PUT /products/:productId error:", error);
    return res.status(500).json({ error: "Server error." });
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
      brand: prod.brand,
      price: prod.price, // ← ekledik
    }));

    res.status(200).json(productsWithBase64);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
