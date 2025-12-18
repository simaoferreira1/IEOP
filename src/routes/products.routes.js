import { Router } from "express";
import fetch from "node-fetch";
import { requireInternalKey } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /products
 * Vai buscar os produtos reais ao Vendus
 */
router.get("/", requireInternalKey, async (req, res) => {
  try {
    const response = await fetch(
      `${process.env.VENDUS_BASE_URL}/products`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.VENDUS_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        ok: false,
        error: "Erro ao comunicar com o Vendus",
        details: errorText
      });
    }

    const vendusData = await response.json();

    /**
     * Normalização dos dados
     * (muito importante para o PowerApps)
     */
    const products = vendusData.data.map(p => ({
      id: p.id,
      name: p.title,
      price: p.price,
      stock: p.stock_total
    }));

    res.json({
      ok: true,
      data: products
    });

  } catch (error) {
    console.error("Erro /products:", error);

    res.status(500).json({
      ok: false,
      error: "Erro interno do servidor"
    });
  }
});

export default router;
