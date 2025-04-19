/********************************************************
 * /Applications/Works/e-commerce/backend/models/Product.js
 ********************************************************/
const mongoose = require("mongoose");

// 1) ReviewSchema’a `approved` alanı ekliyoruz.
const ReviewSchema = mongoose.Schema(
  {
    text: { type: String, required: true },
    rating: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approved: { type: Boolean, default: false }, // ← Yeni
  },
  { timestamps: true }
);

const ProductSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    img: [{ data: Buffer, contentType: String }],
    reviews: [ReviewSchema],
    colors: [{ type: String, required: false }],
    sizes: [{ type: String, required: false }],
    price: {
      current: { type: Number, required: true },
      discount: { type: Number },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: { type: String, required: false },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
