const express = require("express");
const router = express.Router();
const Category = require("../models/Category.js");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Yeni bir kategori oluşturma (Create)
router.post("/", upload.single("img"), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required." });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Category image (img) is required." });
    }

    const newCategory = new Category({
      name,
      img: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    await newCategory.save();
    res.status(201).json({ message: "Category created successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Tüm kategorileri getirme (Read - All)
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();

    // Buffer'ları base64 string'e çevir
    const categoriesWithImages = categories.map((cat) => {
      let base64Image = "";
      if (cat.img && cat.img.data) {
        base64Image = `data:${
          cat.img.contentType
        };base64,${cat.img.data.toString("base64")}`;
      }

      return {
        _id: cat._id,
        name: cat.name,
        img: base64Image,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      };
    });

    res.status(200).json(categoriesWithImages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Belirli bir kategoriyi getirme (Read - Single)
router.get("/:categoryId", async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }

    let base64Image = "";
    if (category.img && category.img.data) {
      base64Image = `data:${
        category.img.contentType
      };base64,${category.img.data.toString("base64")}`;
    }

    const categoryWithImage = {
      _id: category._id,
      name: category.name,
      img: base64Image,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };

    res.status(200).json(categoryWithImage);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Kategori güncelleme
router.put("/:categoryId", upload.single("img"), async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { name } = req.body;

    // removeImage query parametresiyle resmi sıfırlayabiliyoruz (opsiyonel)
    const removeImage = req.query.removeImage === "true";

    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found." });
    }

    // Name güncellenebilir
    if (name) {
      existingCategory.name = name;
    }

    // Eğer removeImage=true ise resmi sıfırla
    if (removeImage) {
      existingCategory.img = { data: null, contentType: "" };
    }

    // Yeni resim yüklenmişse, eskisinin üzerine yaz
    if (req.file) {
      existingCategory.img = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    await existingCategory.save();
    res.status(200).json({ message: "Category updated successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Kategori silme (Delete)
router.delete("/:categoryId", async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return res.status(404).json({ error: "Category not found." });
    }
    res.status(200).json({ message: "Category deleted successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
