/********************************************************
 * /Applications/Works/e-commerce/backend/routes/address.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");

// 📌 Adres Ekleme
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { name, phone, address, city, district } = req.body;

    // 🔄 Email’i kullanıcıdan al
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newAddress = new Address({
      name,
      email: user.email, // ✅ Email artık backend'den geliyor
      phone,
      address,
      city,
      district,
      userId: req.user.id,
    });

    await newAddress.save();

    res.status(201).json({
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    console.error("Adres ekleme sırasında hata:", error);
    res.status(500).json({
      message: "Error adding address",
      error: error.message,
    });
  }
});

// 📌 Kullanıcının adreslerini görüntüleme
router.get("/", authMiddleware, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id });
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching addresses",
      error: error.message,
    });
  }
});

// 📌 Adres Güncelleme
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, city, district } = req.body;

    // 🔄 Email’i yine backend'den çek
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updated = await Address.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      {
        name,
        phone,
        address,
        city,
        district,
        email: user.email, // ✅ Güncellenen adresin email'i güncel kalır
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Address not found or unauthorized",
      });
    }

    res.status(200).json({
      message: "Address updated successfully",
      address: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating address",
      error: error.message,
    });
  }
});

module.exports = router;
