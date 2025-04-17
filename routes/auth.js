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
 * /change-password
 * Body: { oldPassword, newPassword, confirmPassword }
 ********************************************************/
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ error: "All password fields are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match." });
    }

    // Mevcut kullanıcıyı al
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Eski şifre kontrolü
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect old password." });
    }

    // Yeni şifreyi hashleyip kaydet
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    // İstersen tüm eski access token'ları geçersizleyecek blacklist adımı ekleyebilirsin
    // blacklistedTokens.add(req.headers.authorization.split(" ")[1]);

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Change-password error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

/********************************************************
 * /refresh
 ********************************************************/
router.post("/refresh", (req, res) => {
  try {
    const { refreshToken, oldAccessToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token missing" });
    }
    jwt.verify(refreshToken, REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }

      if (oldAccessToken) {
        blacklistedTokens.add(oldAccessToken);
      }

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
 ********************************************************/
router.post("/logout", authMiddleware, (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      blacklistedTokens.add(token);
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Server error." });
  }
});

/********************************************************
 * /me
 ********************************************************/
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
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
