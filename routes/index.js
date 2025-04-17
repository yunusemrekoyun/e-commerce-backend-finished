/********************************************************
 * /Applications/Works/e-commerce/backend/routes/index.js
 ********************************************************/
const express = require("express");
const router = express.Router();

const categoryRoute = require("./categories.js");
const authRoute = require("./auth.js");
const productRoute = require("./products.js");
const couponRoute = require("./coupons.js");
const userRoute = require("./users.js");
const paymentRoute = require("./payment.js");
const addressRoute = require("./address.js");
const ordersRoute = require("./orders.js");

router.use("/orders", ordersRoute);
router.use("/categories", categoryRoute);
router.use("/auth", authRoute);
router.use("/products", productRoute);
router.use("/coupons", couponRoute);
router.use("/users", userRoute);
router.use("/payment", paymentRoute);
router.use("/address", addressRoute);

module.exports = router;
