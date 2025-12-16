import { Router } from "express";

const router = Router();

/**
 * GET /products
 * Mock de produtos para o PowerApps já conseguir consumir.
 * Depois trocamos isto por chamada real ao Vendus.
 */
router.get("/", (req, res) => {
  const products = [
    { id: 1, name: "Café", price: 1.2, stock: 100 },
    { id: 2, name: "Água 0.5L", price: 1.0, stock: 50 },
    { id: 3, name: "Sandes", price: 3.5, stock: 25 }
  ];

  res.json({ ok: true, data: products });
});

export default router;
