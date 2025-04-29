const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon.js");

// 📌 Yeni Kupon Oluşturma
router.post("/", async (req, res) => {
  try {
    const { code } = req.body;
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Bu kupon kodu zaten mevcut.",
      });
    }
    const newCoupon = new Coupon(req.body);
    await newCoupon.save();
    res.status(201).json({
      success: true,
      data: newCoupon,
      message: "Kupon başarıyla oluşturuldu.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kupon oluşturulurken bir hata oluştu.",
    });
  }
});

// 📌 Tüm Kuponları Getirme
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({
      success: true,
      data: coupons,
      message: "Kuponlar başarıyla getirildi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kuponlar getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Kuponu ID ile Getirme
router.get("/:couponId", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Kupon bulunamadı.",
      });
    }
    res.status(200).json({
      success: true,
      data: coupon,
      message: "Kupon başarıyla getirildi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kupon getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Kuponu Kod ile Getirme
router.get("/code/:couponCode", async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.couponCode });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Kupon bulunamadı.",
      });
    }
    res.status(200).json({
      success: true,
      data: { discountPercent: coupon.discountPercent },
      message: "Kupon başarıyla getirildi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kupon getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Kupon Güncelleme
router.put("/:couponId", async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const existingCoupon = await Coupon.findById(couponId);
    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        message: "Kupon bulunamadı.",
      });
    }
    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, req.body, {
      new: true,
    });
    res.status(200).json({
      success: true,
      data: updatedCoupon,
      message: "Kupon başarıyla güncellendi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kupon güncellenirken bir hata oluştu.",
    });
  }
});

// 📌 Kupon Silme
router.delete("/:couponId", async (req, res) => {
  try {
    const deletedCoupon = await Coupon.findByIdAndDelete(req.params.couponId);
    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: "Kupon bulunamadı.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Kupon başarıyla silindi.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Kupon silinirken bir hata oluştu.",
    });
  }
});

module.exports = router;
