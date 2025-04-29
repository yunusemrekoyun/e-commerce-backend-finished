/********************************************************
	•	/Applications/Works/e-commerce/backend/routes/payment.js
********************************************************/
const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// 📌 Ödeme Başlatma
router.post("/", async (req, res) => {
  const { products, user, cargoFee } = req.body;

  try {
    const lineItems = products.map((product) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: product.name,
        },
        unit_amount: Math.round(product.price * 100),
      },
      quantity: product.quantity,
    }));

    if (cargoFee !== 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Hızlı Kargo",
          },
          unit_amount: cargoFee * 100,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_DOMAIN}/success`,
    });

    res.status(200).json({
      success: true,
      data: { sessionId: session.id },
      message: "Ödeme oturumu başarıyla oluşturuldu.",
    });
  } catch (error) {
    console.error("Payment session creation error:", error);
    res.status(500).json({
      success: false,
      message: "Ödeme oturumu oluşturulurken bir hata oluştu.",
    });
  }
});

module.exports = router;
