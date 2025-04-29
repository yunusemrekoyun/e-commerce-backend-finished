const express = require("express");
const router = express.Router();
const Category = require("../models/Category.js");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 📌 Yeni Kategori Oluşturma
router.post("/", async (req, res) => {
  try {
    const { name, brands } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Kategori adı zorunludur.",
      });
    }
    const newCategory = new Category({ name, brands: brands || [] });
    await newCategory.save();
    res.status(201).json({
      success: true,
      data: newCategory,
      message: "Kategori başarıyla oluşturuldu.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kategori oluşturulurken bir hata oluştu.",
    });
  }
});

// 📌 Tüm Kategorileri Getirme
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      data: categories,
      message: "Kategoriler başarıyla getirildi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kategoriler getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Belirli Bir Kategoriyi Getirme
router.get("/:categoryId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı.",
      });
    }
    res.status(200).json({
      success: true,
      data: category,
      message: "Kategori başarıyla getirildi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kategori getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Kategori Güncelleme
router.put("/:categoryId", async (req, res) => {
  try {
    const { name, brands } = req.body;
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı.",
      });
    }
    if (name) category.name = name;
    if (Array.isArray(brands)) category.brands = brands;
    await category.save();

    res.status(200).json({
      success: true,
      data: category,
      message: "Kategori başarıyla güncellendi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kategori güncellenirken bir hata oluştu.",
    });
  }
});

// 📌 Kategori Silme
router.delete("/:categoryId", async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.categoryId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Kategori başarıyla silindi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kategori silinirken bir hata oluştu.",
    });
  }
});

module.exports = router;
