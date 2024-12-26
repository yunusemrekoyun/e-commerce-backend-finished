const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon.js");

// Yeni bir kupon oluşturma (Create)
router.post("/", async (req, res) => {
  try {
    const { code } = req.body;
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ error: "This coupon is alread exists." });
    }
    const newCoupon = new Coupon(req.body);
    await newCoupon.save();
    res.status(201).json(newCoupon);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Tüm kuponları getirme (Read - All)
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find();

    res.status(200).json(coupons);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Belirli bir kuponu id ile getirme (Read - Single)
router.get("/:couponId", async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const coupons = await Coupon.findById(couponId);
    if (!coupons) {
      return res.status(404).json({ error: "Coupon not found." });
    }
    res.status(200).json(coupons);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Belirli bir kuponu kupon kodu ile getirme (Read - Single)
router.get("/code/:couponCode", async (req, res) => {
  try {
    const couponCode = req.params.couponCode;
    const coupons = await Coupon.findOne({ code: couponCode });
    if (!coupons) {
      return res.status(404).json({ error: "Coupon not found." });
    }
    const { discountPercent } = coupons;
    res.status(200).json({ discountPercent });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

//kupon güncelleme
router.put("/:couponId", async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const updates = req.body;
    const existingCoupon = await Coupon.findById(couponId);
    if (!existingCoupon) {
      res.status(404).json({ error: "Coupon not found." });
    }
    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, updates, {
      new: true,
    });
    res.status(200).json(updatedCoupon);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

// Kupon silme (Delete)
router.delete("/:couponId", async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
    if (!deletedCoupon) {
      return res.status(404).json({ error: "Coupon not found." });
    }
    res.status(200).json(deletedCoupon);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
