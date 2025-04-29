/********************************************************
 * /Applications/Works/e-commerce/backend/middlewares/errorHandler.js
 ********************************************************/

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Sunucuda beklenmeyen bir hata oluştu.",
  });
};

module.exports = errorHandler;
