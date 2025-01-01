/********************************************************
 * /Applications/Works/e-commerce/backend/routes/address.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const authMiddleware = require("../middlewares/authMiddleware");

// Adres Ekleme
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { name, email, address, city, district } = req.body;

    // Yeni adres oluştur
    const newAddress = new Address({
      name,
      email,
      address,
      city,
      district,
      userId: req.user.id, // Token'dan gelen kullanıcı ID'si
    });

    await newAddress.save();

    res.status(201).json({
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding address", error: error.message });
  }
});

// Kullanıcının adreslerini görüntüleme
router.get("/", authMiddleware, async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id });
    res.status(200).json(addresses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching addresses", error: error.message });
  }
});

// Address güncelleme
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!address) {
      return res
        .status(404)
        .json({ message: "Address not found or unauthorized" });
    }

    res.status(200).json({
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating address", error: error.message });
  }
});

module.exports = router;
