const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");

// 📌 Adres Ekleme
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { name, phone, address, city, district } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    const newAddress = new Address({
      name,
      email: user.email,
      phone,
      address,
      city,
      district,
      userId: req.user.id,
    });

    await newAddress.save();

    res.status(201).json({
      success: true,
      data: newAddress,
      message: "Adres başarıyla eklendi.",
    });
  } catch (error) {
    console.error("Adres ekleme sırasında hata:", error);
    res.status(500).json({
      success: false,
      message: "Adres eklenirken bir hata oluştu.",
    });
  }
});

// 📌 Kullanıcının adreslerini görüntüleme
router.get("/", authMiddleware, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id });

    res.status(200).json({
      success: true,
      data: addresses,
      message: "Adresler başarıyla getirildi.",
    });
  } catch (error) {
    console.error("Adresleri getirme sırasında hata:", error);
    res.status(500).json({
      success: false,
      message: "Adresler getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Adres Güncelleme
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, city, district } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    const updated = await Address.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      {
        name,
        phone,
        address,
        city,
        district,
        email: user.email,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Adres bulunamadı veya yetki yok.",
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: "Adres başarıyla güncellendi.",
    });
  } catch (error) {
    console.error("Adres güncelleme sırasında hata:", error);
    res.status(500).json({
      success: false,
      message: "Adres güncellenirken bir hata oluştu.",
    });
  }
});

module.exports = router;
