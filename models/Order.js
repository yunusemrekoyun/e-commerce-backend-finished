const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true }, // artık kategori adı
    colors: [{ type: String, required: false }], // Boş olabilir
    sizes: [{ type: String, required: false }],  // Boş olabilir
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String },

    items: [OrderItemSchema],
    total: { type: Number, required: true },

    // YENİ: durum alanı
    status: {
      type: String,
      enum: [
        "Sipariş Alındı",
        "Sipariş Onaylandı",
        "Kargoya Verildi",
        "Teslim Edildi",
      ],
      default: "Sipariş Alındı",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
