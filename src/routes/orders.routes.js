import { Router } from "express";
import fetch from "node-fetch";

const router = Router();


router.post("/", async (req, res) => {
  try {
    const { customerId, items, paymentMethod } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Pedido inválido. Cliente e itens são obrigatórios."
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        ok: false,
        error: "Método de pagamento obrigatório."
      });
    }

    const productsResponse = await fetch(
      `${process.env.VENDUS_BASE_URL}/products`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VENDUS_API_KEY}`
        }
      }
    );

    if (!productsResponse.ok) {
      throw new Error("Erro ao obter produtos do Vendus");
    }

    const productsData = await productsResponse.json();

    let total = 0;

    const orderLines = items.map(item => {
      const product = productsData.data.find(
        p => p.id === item.productId
      );

      if (!product) {
        throw new Error(`Produto ${item.productId} inválido`);
      }

      if (product.stock_total < item.quantity) {
        throw new Error(
          `Stock insuficiente para o produto ${product.title}`
        );
      }

      const subtotal = product.price * item.quantity;
      total += subtotal;

      return {
        product_id: product.id,
        qty: item.quantity,
        price: product.price
      };
    });

     const orderResponse = await fetch(
      `${process.env.VENDUS_BASE_URL}/orders/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VENDUS_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_id: customerId,
          payment_method: paymentMethod,
          products: orderLin
