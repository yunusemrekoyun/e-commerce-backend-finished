const mongoose = require("mongoose");

// 1) ReviewSchema’a `approved` alanı ekliyoruz.
const ReviewSchema = mongoose.Schema(
  {
    text: { type: String, required: true },
    rating: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approved: { type: Boolean, default: false }, // Yeni
  },
  { timestamps: true }
);

const ProductSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    img: [{ data: Buffer, contentType: String }],
    reviews: [ReviewSchema],
    colors: [{ type: String, required: false, default: [] }],
    sizes: [{ type: String, required: false, default: [] }],
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
    averageRating: { type: Number, default: 0 }, // Yeni alan
  },
  { timestamps: true }
);

// Ortalama puanı güncelleyen pre-save hook'u
ProductSchema.pre('save', function (next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = totalRating / this.reviews.length; // Ortalama puan hesaplama
  } else {
    this.averageRating = 0; // İnceleme yoksa 0 olarak ayarla
  }
  next();
});

module.exports = mongoose.model("Product", ProductSchema);