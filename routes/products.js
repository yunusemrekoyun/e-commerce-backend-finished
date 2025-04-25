//backend/routes/products.js
const express = require("express");
const Category = require("../models/Category.js");
const router = express.Router();
const Product = require("../models/Product.js");
const multer = require("multer");
const authMiddleware = require("../middlewares/authMiddleware");
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

// Yeni bir ürün oluşturma (Create)
router.post("/", upload.array("img", 6), async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      description,
      colors, // Opsiyonel
      sizes, // Opsiyonel
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

    // colors ve sizes opsiyonel, boşsa boş dizi atıyoruz
    const colorArr = colors
      ? Array.isArray(colors)
        ? colors
        : colors.split(",").map((c) => c.trim())
      : [];
    const sizeArr = sizes
      ? Array.isArray(sizes)
        ? sizes
        : sizes.split(",").map((s) => s.trim())
      : [];

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
      brand,
    });

    await newProduct.save();
    return res.status(201).json({ message: "Product created successfully." });
  } catch (error) {
    console.error("Product creation failed:", error.message);
    console.error("Full error:", error);
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
      const brandArr = brand.split(",").map((b) => new RegExp(`^${b}$`, "i"));
      queryObj.brand = { $in: brandArr };
    }

    // 3) Colors
    if (colors && Array.isArray(colors)) {
      queryObj.colors = { $in: colors };
    }

    // 4) Sizes
    // 3) Colors
    if (sizes && Array.isArray(sizes)) {
      queryObj.sizes = { $in: sizes };
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
        averageRating: prod.averageRating, // 👈 EKLENDİ
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

// Read - Single (tek ürün getirme)
router.get("/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    // reviews.user’ı populate ediyoruz ki username/avatar görünsün
    // category’yi de populate ederek sadece { _id, name } dönüyoruz
    const product = await Product.findById(productId)
      .populate("reviews.user", "username avatar")
      .populate("category", "name");
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Sadece onaylı (approved===true) yorumları alıyoruz
    const approvedReviews = product.reviews
      .filter((r) => r.approved)
      .map((r) => ({
        _id: r._id,
        text: r.text,
        rating: r.rating,
        user: r.user, // burada { _id, username, avatar }
        createdAt: r.createdAt,
      }));

    // Görselleri base64 string’e çeviriyoruz
    const imageObjects = product.img.map((fileObj) => ({
      _id: fileObj._id,
      base64: `data:${fileObj.contentType};base64,${fileObj.data.toString(
        "base64"
      )}`,
    }));

    // ve yanıtı dönüyoruz
    return res.status(200).json({
      _id: product._id,
      name: product.name,
      img: imageObjects,
      colors: product.colors,
      sizes: product.sizes,
      price: product.price,
      category: product.category, // artık { _id, name }
      brand: product.brand,
      averageRating: product.averageRating,
      description: product.description,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      reviews: approvedReviews,
    });
  } catch (error) {
    console.error("GET /products/:productId error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

// Ürün güncelleme (Update)
router.put("/:productId", upload.array("img", 6), async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    /*
//Product Image Update kısmında resim override durumunda kontrol logları:
    // console.log("🔄 Güncelleme isteği alındı:");
    // console.log("Body:", req.body);
    // console.log("Yüklenen dosya sayısı:", req.files?.length || 0);
    // console.log("Önceki görseller:", product.img.map((i) => i._id.toString()));
*/
    const {
      name,
      category,
      brand,
      description,
      current,
      discount,
      colors,
      sizes,
      keepImages, // 👈 kullanıcıdan gelen tutulacak eski resimler
    } = req.body;

    // keepImages varsa işle
    let keepIDs = [];
    if (keepImages) {
      try {
        keepIDs = JSON.parse(keepImages);
        console.log("✅ Korunacak resim ID'leri:", keepIDs);
      } catch (err) {
        return res.status(400).json({ error: "Invalid keepImages format." });
      }

      // Eski resimlerden sadece belirtilenleri tut
      product.img = product.img.filter((img) =>
        keepIDs.includes(img._id.toString())
      );
      console.log(
        "🔹 Filtre sonrası kalan resimler:",
        product.img.map((i) => i._id.toString())
      );
    }

    if (name) product.name = name;
    if (category) product.category = category;
    if (brand) product.brand = brand;
    if (description) product.description = description;
    if (current) product.price.current = Number(current);
    //if (discount) product.price.discount = Number(discount);
    const d = Number(discount);
    product.price.discount = isNaN(d) ? 0 : d;
    product.colors = colors
      ? Array.isArray(colors)
        ? colors
        : colors.split(",").map((c) => c.trim())
      : [];

    product.sizes = sizes
      ? Array.isArray(sizes)
        ? sizes
        : sizes.split(",").map((s) => s.trim())
      : [];

    // Yeni görseller varsa ekle (eski korunanlara ek olarak)
    if (req.files?.length > 0) {
      const newImages = req.files.map((file) => ({
        data: file.buffer,
        contentType: file.mimetype,
      }));
      product.img.push(...newImages); // 👈 eskilerin üzerine yazma değil, ekleme!
      console.log("🆕 Yeni eklenen görsel sayısı:", newImages.length);
    }

    // Maksimum 6 görsel kontrolü
    if (product.img.length > 6) {
      return res
        .status(400)
        .json({ error: "En fazla 6 görsel yükleyebilirsiniz." });
    }

    await product.save();

    const base64Imgs = product.img.map((f) => ({
      _id: f._id,
      base64: `data:${f.contentType};base64,${f.data.toString("base64")}`,
    }));

    return res.status(200).json({
      ...product.toObject(),
      img: base64Imgs,
    });
  } catch (err) {
    console.error("❌ Update error:", err);
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

// Ürün detayını getirme (Read - Single)
router.get("/detail/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name") // category populate edilir
      .populate("brand"); // Eğer brand bir başka modele referanssa burada popülasyonu eklemelisiniz

    if (!product) {
      return res.status(404).json({ error: "Ürün bulunamadı." });
    }

    res.json(product); // Burada product içinde 'name', 'category' ve 'brand' doğru şekilde dönecektir.
  } catch (error) {
    console.error("Ürün detay getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası." });
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

/*
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
*/

/*bu kısımdaki sorgu aşağıdaki Read-Single kısmıyla aynı */
// router.get("/:productId", async (req, res) => {
//   try {
//     const productId = req.params.productId;
//     // reviews.user’ı populate ediyoruz ki username/avatar görünsün
//     const product = await Product.findById(productId).populate(
//       "reviews.user",
//       "username avatar"
//     );
//     if (!product) {
//       return res.status(404).json({ error: "Product not found." });
//     }

//     // Sadece approved === true yorumları al
//     const approvedReviews = product.reviews
//       .filter((r) => r.approved)
//       .map((r) => ({
//         _id: r._id,
//         text: r.text,
//         rating: r.rating,
//         user: r.user, // { username, avatar, _id }
//         createdAt: r.createdAt,
//       }));

//     // Görselleri base64 string’e çevir
//     const imageObjects = product.img.map((fileObj) => ({
//       _id: fileObj._id,
//       base64: `data:${fileObj.contentType};base64,${fileObj.data.toString(
//         "base64"
//       )}`,
//     }));

//     // Yanıtı döndür
//     return res.status(200).json({
//       _id: product._id,
//       name: product.name,
//       img: imageObjects,
//       colors: product.colors,
//       sizes: product.sizes,
//       price: product.price,
//       category: product.category,
//       brand: product.brand,
//       description: product.description,
//       createdAt: product.createdAt,
//       updatedAt: product.updatedAt,
//       reviews: approvedReviews, // sadece onaylı yorumlar
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Server error." });
//   }
// });

// router.get("/:productId", async (req, res) => {
//   try {
//     const productId = req.params.productId;
//     // reviews.user’ı populate ediyoruz ki username/avatar görünsün
//     const product = await Product.findById(productId).populate(
//       "reviews.user",
//       "username avatar"
//     );
//     if (!product) {
//       return res.status(404).json({ error: "Product not found." });
//     }

//     // Sadece approved === true yorumları al
//     const approvedReviews = product.reviews
//       .filter((r) => r.approved)
//       .map((r) => ({
//         _id: r._id,
//         text: r.text,
//         rating: r.rating,
//         user: r.user, // { username, avatar, _id }
//         createdAt: r.createdAt,
//       }));

//     // Görselleri base64 string’e çevir
//     const imageObjects = product.img.map((fileObj) => ({
//       _id: fileObj._id,
//       base64: `data:${fileObj.contentType};base64,${fileObj.data.toString(
//         "base64"
//       )}`,
//     }));

//     // Yanıtı döndür
//     return res.status(200).json({
//       _id: product._id,
//       name: product.name,
//       img: imageObjects,
//       colors: product.colors,
//       sizes: product.sizes,
//       price: product.price,
//       category: product.category,
//       brand: product.brand,
//       description: product.description,
//       createdAt: product.createdAt,
//       updatedAt: product.updatedAt,
//       reviews: approvedReviews, // sadece onaylı yorumlar
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Server error." });
//   }
// });

module.exports = router;
