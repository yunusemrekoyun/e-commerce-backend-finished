const express = require("express");
const router = express.Router();
const Category = require("../models/Category.js");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Yeni bir kategori oluşturma (Create)
router.post("/", async (req, res) => {
  try {
    const { name, brands } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Category name is required." });
    }
    const newCategory = new Category({ name, brands: brands || [] });
    await newCategory.save();
    res.status(201).json({
      message: "Category created successfully.",
      category: newCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Tüm kategorileri getirme (Read - All)
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Belirli bir kategoriyi getirme (Read - Single)
router.get("/:categoryId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Kategori güncelleme
router.put("/:categoryId", async (req, res) => {
  try {
    const { name, brands } = req.body;
    const cat = await Category.findById(req.params.categoryId);
    if (!cat) {
      return res.status(404).json({ error: "Category not found." });
    }
    if (name) cat.name = name;
    if (Array.isArray(brands)) cat.brands = brands;
    await cat.save();
    res
      .status(200)
      .json({ message: "Category updated successfully.", category: cat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Kategori silme (Delete)
router.delete("/:categoryId", async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.categoryId);
    if (!deleted) {
      return res.status(404).json({ error: "Category not found." });
    }
    res.status(200).json({ message: "Category deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
