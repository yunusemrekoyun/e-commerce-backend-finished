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
router.post("/", upload.array("img", 6), async (req, res) => {
  try {
    // req.body’de name, price.current vb. alanlar gelecek
    // req.files’de ise bir dizi resim (1-6 arası)
    const {
      name,
      category,
      description,
      colors,
      sizes,
      // price nesnesi vs. buraya tek tek ayırabilirsin veya
      // price.current, price.discount gibi
      current,
      discount,
    } = req.body;

    // Temel kontroller
    if (!name || !category || !description) {
      return res
        .status(400)
        .json({ error: "Name, category, and description are required." });
    }
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one product image is required." });
    }

    // Fiyat
    const priceObj = {
      current: Number(current) || 0,
      discount: Number(discount) || 0,
    };

    // colors & sizes string olarak geldiyse (virgüllü ya da senin formatın nasılsa) => diziye çevir
    // Frontend formundan direkt dizi de gelebilir. Örnek kalsın.
    let colorArr = [];
    if (colors) {
      // Örnek: "Red\nBlue" => satır bazlı
      // colorArr = colors.split("\n").map((c) => c.trim());
      colorArr = Array.isArray(colors)
        ? colors
        : colors.split(",").map((c) => c.trim());
    }

    let sizeArr = [];
    if (sizes) {
      sizeArr = Array.isArray(sizes)
        ? sizes
        : sizes.split(",").map((s) => s.trim());
    }

    // Görseller
    const images = req.files.map((file) => {
      return {
        data: file.buffer,
        contentType: file.mimetype,
      };
    });

    const newProduct = new Product({
      name,
      img: images,
      description,
      colors: colorArr,
      sizes: sizeArr,
      price: priceObj,
      category,
    });

    await newProduct.save();
    return res.status(201).json({ message: "Product created successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Tüm ürünleri getirme (Read - All)
router.get("/", async (req, res) => {
  try {
    const { category, colors, sizes, priceMin, priceMax, sort } = req.query;

    const queryObj = {};

    // 1) Kategori (isim üzerinden)
    if (category) {
      const foundCat = await Category.findOne({ name: category });
      if (!foundCat) {
        return res.status(200).json([]); // kategori yok => boş dizi
      }
      queryObj.category = foundCat._id;
    }

    // 2) Colors
    if (colors) {
      const colorArr = colors.split(",");
      queryObj.colors = { $in: colorArr };
    }

    // 3) Sizes
    if (sizes) {
      const sizeArr = sizes.split(",");
      queryObj.sizes = { $in: sizeArr };
    }

    // 4) Price
    const minVal = priceMin ? Number(priceMin) : 0;
    const maxVal = priceMax ? Number(priceMax) : 999999;
    queryObj["price.current"] = { $gte: minVal, $lte: maxVal };

    // 5) find
    let query = Product.find(queryObj);

    // 6) Sort
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

    // Buffer -> Base64
    const productsWithBase64 = products.map((prod) => {
      const base64Images = prod.img.map((fileObj) => {
        return `data:${fileObj.contentType};base64,${fileObj.data.toString(
          "base64"
        )}`;
      });

      return {
        _id: prod._id,
        name: prod.name,
        img: base64Images,
        colors: prod.colors,
        sizes: prod.sizes,
        price: prod.price,
        category: prod.category,
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

    // Tek üründe Base64
    // Artık her görsele subdoc._id'yi de ekleyip front-end'e gönderiyoruz
    const imageObjects = product.img.map((fileObj) => {
      return {
        _id: fileObj._id, // mongoose subdoc id
        base64: `data:${fileObj.contentType};base64,${fileObj.data.toString(
          "base64"
        )}`,
      };
    });

    const productWithBase64 = {
      _id: product._id,
      name: product.name,
      img: imageObjects, // Artık array of { _id, base64 }
      colors: product.colors,
      sizes: product.sizes,
      price: product.price,
      category: product.category,
      description: product.description,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      reviews: product.reviews || [], // eğer null/undefined ise boş array
    };

    res.status(200).json(productWithBase64);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Ürün güncelleme
router.put("/:productId", upload.array("img", 6), async (req, res) => {
  try {
    const productId = req.params.productId;
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Body’den gelen alanları kullan
    const {
      name,
      category,
      description,
      current,
      discount,
      colors,
      sizes,
      // "keepImages" parametresi JSON string olarak gelecek
      // Frontend'te "ayakta kalacak" subdoc._id'leri dizi olarak gönderiyoruz
      keepImages,
    } = req.body;

    // Text fields
    if (name) existingProduct.name = name;
    if (category) existingProduct.category = category;
    if (description) existingProduct.description = description;
    if (current || discount) {
      existingProduct.price.current = Number(current) || 0;
      existingProduct.price.discount = Number(discount) || 0;
    }

    // Colors, sizes parse
    if (colors) {
      const colorArr = Array.isArray(colors)
        ? colors
        : colors.split(",").map((c) => c.trim());
      existingProduct.colors = colorArr;
    }

    if (sizes) {
      const sizeArr = Array.isArray(sizes)
        ? sizes
        : sizes.split(",").map((s) => s.trim());
      existingProduct.sizes = sizeArr;
    }

    // 1) "keepImages" => hangi subdoc._id'ler saklansın?
    let keepIDs = [];
    if (keepImages) {
      try {
        // keepImages JSON string bekliyoruz
        // Örnek: '["64ff5de06fcd3ef5f4061b84","64ff5de06fcd3ef5f4061b85"]'
        keepIDs = JSON.parse(keepImages);
      } catch (e) {
        console.log("keepImages parse error:", e);
      }
    }

    // Mevcut product.img arrayini keepIDs listesindekilerle filtrele
    existingProduct.img = existingProduct.img.filter((imgSubDoc) =>
      keepIDs.includes(imgSubDoc._id.toString())
    );

    // 2) Yeni resimler var mı? => ekle
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        existingProduct.img.push({
          data: file.buffer,
          contentType: file.mimetype,
        });
      });
    }

    // 3) Maksimum 6 kontrolü
    if (existingProduct.img.length > 6) {
      return res
        .status(400)
        .json({ error: "En fazla 6 görsel yükleyebilirsiniz." });
    }

    await existingProduct.save();
    res.status(200).json({ message: "Product updated successfully." });
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
    res.status(200).json({ message: "Product deleted successfully." });
  } catch (error) {
    console.log(error);
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

    // Base64 dönelim
    const productsWithBase64 = products.map((prod) => {
      const base64Images = prod.img.map((fileObj) => {
        return `data:${fileObj.contentType};base64,${fileObj.data.toString(
          "base64"
        )}`;
      });

      return {
        _id: prod._id,
        name: prod.name,
        img: base64Images,
        // ... vs
      };
    });

    res.status(200).json(productsWithBase64);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
