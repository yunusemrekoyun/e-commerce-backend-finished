/********************************************************
	•	/Applications/Works/e-commerce/backend/routes/products.js
********************************************************/
const express = require("express");
const router = express.Router();
const Category = require("../models/Category.js");
const Product = require("../models/Product.js");
const multer = require("multer");
const authMiddleware = require("../middlewares/authMiddleware");
const storage = multer.memoryStorage();
const upload = multer({ storage });

/********************************************************
Yorum İşlemleri
********************************************************/
// 📌 Kullanıcıdan yeni yorum alma
router.post("/:productId/reviews", authMiddleware, async (req, res) => {
  try {
    const { text, rating } = req.body;
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı.",
      });
    }

    product.reviews.push({
      text,
      rating,
      user: req.user.id,
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message:
        "Yorumunuz başarıyla alındı, onaylandıktan sonra yayınlanacaktır.",
    });
  } catch (err) {
    console.error("Create review error:", err);
    return res.status(500).json({
      success: false,
      message: "Yorum gönderilirken bir hata oluştu.",
    });
  }
});

// 📌 Admin için yorumları listeleme
router.get("/admin/reviews", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu alana erişim izniniz yok.",
      });
    }

    const { approved } = req.query;
    const products = await Product.find().populate("reviews.user", "username");
    let allReviews = [];

    products.forEach((p) => {
      p.reviews.forEach((r) => {
        if (`${r.approved}` === approved) {
          allReviews.push({
            productId: p._id,
            productName: p.name,
            reviewId: r._id,
            text: r.text,
            rating: r.rating,
            user: r.user?.username || "Bilinmiyor",
            createdAt: r.createdAt,
            approved: r.approved,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: allReviews,
      message: "Yorumlar başarıyla listelendi.",
    });
  } catch (err) {
    console.error("Fetch reviews error:", err);
    res.status(500).json({
      success: false,
      message: "Yorumlar listelenirken bir hata oluştu.",
    });
  }
});

// 📌 Admin yorum onaylama
router.put(
  "/:productId/reviews/:reviewId/approve",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Bu işlemi sadece adminler yapabilir.",
        });
      }

      const { productId, reviewId } = req.params;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı.",
        });
      }

      const review = product.reviews.id(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Yorum bulunamadı.",
        });
      }

      review.approved = true;
      await product.save();

      res.status(200).json({
        success: true,
        message: "Yorum başarıyla onaylandı.",
      });
    } catch (err) {
      console.error("Approve review error:", err);
      res.status(500).json({
        success: false,
        message: "Yorum onaylanırken bir hata oluştu.",
      });
    }
  }
);
// 📌 Admin yorum silme
router.delete(
  "/:productId/reviews/:reviewId",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Bu işlemi sadece adminler yapabilir.",
        });
      }

      const { productId, reviewId } = req.params;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı.",
        });
      }

      const review = product.reviews.id(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Yorum bulunamadı.",
        });
      }
      product.reviews = product.reviews.filter(
        (r) => r._id.toString() !== reviewId
      );
      await product.save();

      res.status(200).json({
        success: true,
        message: "Yorum başarıyla silindi.",
      });
    } catch (err) {
      console.error("Delete review error:", err);
      res.status(500).json({
        success: false,
        message: "Yorum silinirken bir hata oluştu.",
      });
    }
  }
);
/********************************************************
Yorum İşlemleri
********************************************************/

/*--------------------------------------------------------*/

/********************************************************
Admin İşlemleri
********************************************************/
// Yeni bir ürün oluşturma (Create) -
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Yetkiniz yok." });
  }
  next();
};

// ✅ Yeni bir ürün oluşturma
router.post(
  "/",
  authMiddleware,
  requireAdmin,
  upload.array("img", 6),
  async (req, res) => {
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
          .json({ error: "İsim, kategori, marka ve açıklama zorunludur." });
      }

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ error: "En az bir görsel yüklenmelidir." });
      }

      const priceObj = {
        current: Number(current) || 0,
        discount: Number(discount) || 0,
      };

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

      const normalizedBrand = brand.trim().toLowerCase();

      const newProduct = new Product({
        name,
        img: images,
        description,
        colors: colorArr,
        sizes: sizeArr,
        price: priceObj,
        category,
        brand: normalizedBrand,
      });

      await newProduct.save();

      return res.status(201).json({ message: "Ürün başarıyla oluşturuldu." });
    } catch (error) {
      console.error("Ürün oluşturulurken hata:", error.message);
      console.error("Detaylı hata:", error);
      return res.status(500).json({ error: "Sunucu hatası." });
    }
  }
);

// Ürün güncelleme (Update) -
router.put(
  "/:productId",
  authMiddleware,
  requireAdmin,
  upload.array("img", 6),
  async (req, res) => {
    try {
      const productId = req.params.productId;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı." });
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
        deletedImages,
      } = req.body;

      // 🔵 Mevcut resimlerden korunacak olanları filtrele
      let keepIDs = [];
      if (keepImages) {
        try {
          keepIDs = JSON.parse(keepImages);
          product.img = product.img.filter((img) =>
            keepIDs.includes(img._id.toString())
          );
        } catch (err) {
          return res
            .status(400)
            .json({ error: "keepImages formatı geçersiz." });
        }
      }

      // 🔵 Silinecek resimleri kaldır
      if (deletedImages) {
        try {
          const deletedIDs = JSON.parse(deletedImages);
          if (Array.isArray(deletedIDs) && deletedIDs.length > 0) {
            product.img = product.img.filter(
              (img) => !deletedIDs.includes(img._id.toString())
            );
          }
        } catch (err) {
          return res
            .status(400)
            .json({ error: "deletedImages formatı geçersiz." });
        }
      }

      // 🔵 Diğer alanları güncelle
      if (name) product.name = name;
      if (category) product.category = category;
      if (brand) product.brand = brand.trim().toLowerCase();
      if (description) product.description = description;
      if (current) product.price.current = Number(current);
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

      // 🔵 Yeni görselleri ekle
      if (req.files?.length > 0) {
        const newImages = req.files.map((file) => ({
          data: file.buffer,
          contentType: file.mimetype,
        }));
        product.img.push(...newImages);
      }

      // 🔵 Maksimum 6 görsel kuralı
      if (product.img.length > 6) {
        return res
          .status(400)
          .json({ error: "En fazla 6 görsel yükleyebilirsiniz." });
      }

      await product.save();

      // 🔵 Resimleri base64 formatında döndür
      const base64Imgs = product.img.map((f) => ({
        _id: f._id,
        base64: `data:${f.contentType};base64,${f.data.toString("base64")}`,
      }));

      return res.status(200).json({
        ...product.toObject(),
        img: base64Imgs,
      });
    } catch (err) {
      console.error("Ürün güncelleme hatası:", err);
      return res.status(500).json({ error: "Sunucu hatası." });
    }
  }
);

// Ürün silme (Delete) -
router.delete("/:productId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.productId;
    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({ error: "Ürün bulunamadı." });
    }

    return res.status(200).json({ message: "Ürün başarıyla silindi." });
  } catch (error) {
    console.error("Ürün silme hatası:", error);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
});
/********************************************************
Admin İşlemleri
********************************************************/

/*--------------------------------------------------------*/

/********************************************************
User İşlemleri
********************************************************/
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
      /* brand paramı ya dizi (  ?brand=clear&brand=gliss  )
         ya da tek string (     ?brand=clear,gliss         ) gelebilir   */
      const brandArr = Array.isArray(brand)
        ? brand.map((b) => b.trim().toLowerCase())
        : brand.split(",").map((b) => b.trim().toLowerCase());

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
    return res.status(500).json({ error: "Sunucu hatası." });
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
      return res.status(404).json({ error: "Ürün bulunamadı." });
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
    return res.status(500).json({ error: "Sunucu hatası." });
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

    if (!productName.trim()) {
      return res.status(400).json({ error: "Arama terimi boş olamaz." });
    }

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
      price: prod.price,
    }));

    res.status(200).json(productsWithBase64);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

/********************************************************
User İşlemleri
********************************************************/

/*--------------------------------------------------------*/

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
