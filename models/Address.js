/********************************************************
 * /Applications/Works/e-commerce/backend/models/Address.js
 ********************************************************/
const mongoose = require("mongoose");

const AddressSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", AddressSchema);
module.exports = Address;
