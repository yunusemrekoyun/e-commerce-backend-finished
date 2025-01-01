/********************************************************
 * /Applications/Works/e-commerce/backend/middlewares/authMiddleware.js
 ********************************************************/
const jwt = require("jsonwebtoken");


const blacklistedTokens = require("../utils/blacklistedTokens");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <ACCESS_TOKEN>

  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  // Kara listede mi?
  if (blacklistedTokens.has(token)) {
    return res.status(401).json({
      message: "This token is invalid (blacklisted). Please re-login.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET_KEY || "default_secret_key"
    );
    req.user = decoded; // Token'dan kullanıcı bilgilerini al
    next(); // İşleme devam et
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired access token",
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
