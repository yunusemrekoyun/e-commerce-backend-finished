/********************************************************
 * /Applications/Works/e-commerce/backend/routes/auth.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const authMiddleware = require("../middlewares/authMiddleware");
const blacklistedTokens = require("../utils/blacklistedTokens");

// Rastgele avatar için fonksiyon
const generateRandomAvatar = () => {
  const randomAvatar = Math.floor(Math.random() * 71);
  return `https://i.pravatar.cc/300?img=${randomAvatar}`;
};

const SECRET_KEY = process.env.SECRET_KEY || "default_secret_key";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

/********************************************************
 * /register
 ********************************************************/
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const defaultAvatar = generateRandomAvatar();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email address is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar: defaultAvatar,
      // role: "user",
    });

    await newUser.save();

    return res.status(201).json({ message: "Register successful" });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

/********************************************************
 * /login
 * Access token (15m), refresh token (7d)
 * role bilgisini de front-end'e döndürüyoruz
 ********************************************************/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password." });
    }

    // Access token => 15m
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "15m" }
    );

    // Refresh token => 7d
    const refreshToken = jwt.sign(
      { id: user._id, email: user.email },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      role: user.role,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

/********************************************************
 * /refresh
 * Eski access token kara listeye at
 * Yeni access token üret
 ********************************************************/
router.post("/refresh", (req, res) => {
  try {
    const { refreshToken, oldAccessToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token missing" });
    }
    // 1) refreshToken doğrula
    jwt.verify(refreshToken, REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }

      // 2) Eski accessToken'ı kara listeye al => "kullanılmasın"
      if (oldAccessToken) {
        blacklistedTokens.add(oldAccessToken);
      }

      // 3) Yeni access token => 15m
      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        SECRET_KEY,
        { expiresIn: "15m" }
      );

      return res.status(200).json({
        message: "Access token refreshed",
        token: newAccessToken,
      });
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

/********************************************************
 * /logout
 * Token'ı kara listeye ekle (opsiyonel)
 ********************************************************/
router.post("/logout", authMiddleware, (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      blacklistedTokens.add(token); // Bu token tekrar kullanılamaz
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

/********************************************************
 * /me
 * Kullanıcı verisi + istersen adresleri dönebiliriz
 ********************************************************/
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Eğer adres bilgilerini de eklemek istersen:
    // const addresses = await Address.find({ userId: req.user.id });
    // res.status(200).json({ user, addresses });
    // Şimdilik sadece user döndürüyoruz:

    res.status(200).json({
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("/me error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
