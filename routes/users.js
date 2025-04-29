/********************************************************
	•	/Applications/Works/e-commerce/backend/routes/users.js
********************************************************/
const express = require("express");
const router = express.Router();
const User = require("../models/User.js");

// 📌 Tüm kullanıcıları getirme
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      data: users,
      message: "Kullanıcılar başarıyla getirildi.",
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Kullanıcılar getirilirken bir hata oluştu.",
    });
  }
});

// 📌 Kullanıcı güncelleme
router.put("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updatedUser = await User.findOneAndUpdate({ email }, req.body, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Kullanıcı bilgileri başarıyla güncellendi.",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Kullanıcı güncellenirken bir hata oluştu.",
    });
  }
});

// 📌 Kullanıcı silme
router.delete("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const deletedUser = await User.findOneAndDelete({ email });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    res.status(200).json({
      success: true,
      data: deletedUser,
      message: "Kullanıcı başarıyla silindi.",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Kullanıcı silinirken bir hata oluştu.",
    });
  }
});

module.exports = router;
