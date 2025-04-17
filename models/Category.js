/*
 * /Applications/Works/e-commerce/backend/models/Category.js
 */
const mongoose = require("mongoose");

const CategorySchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    // Her kategori için markalar dizisi
    brands: [{ type: String }],
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", CategorySchema);
module.exports = Category;
