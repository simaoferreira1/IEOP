import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

/**
 * GET /products
 * Vai buscar os produtos reais ao Vendus e normaliza para PowerApps
 */
router.get("/", async (req, res) => {
  try {
    const baseUrl = process.env.VENDUS_BASE_URL;
    const token = process.env.VENDUS_API_TOKEN;

    if (!baseUrl) {
      return res.status(500).json({
        ok: false,
        error: "Configuração inválida: VENDUS_BASE_URL não definida."
      });
    }

    if (!token) {
      return res.status(500).json({
        ok: false,
        error: "Configuração inválida: VENDUS_API_TOKEN não definido."
      });
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/products`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const text = await response.text();
    let vendusData = null;

    try {
      vendusData = text ? JSON.parse(text) : null;
    } catch {
      // Se o Vendus responder com algo não-JSON, devolvemos o texto
      vendusData = { raw: text };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "Erro ao comunicar com o Vendus",
        details: vendusData
      });
    }

    // Normalização (PowerApps-friendly)
    const rows = Array.isArray(vendusData?.data) ? vendusData.data : (Array.isArray(vendusData) ? vendusData : []);
    const products = rows.map(p => ({
      id: p.id,
      name: p.title ?? p.name ?? "",
      price: p.price ?? 0,
      stock: p.stock_total ?? p.stock ?? null
    }));

    return res.json({ ok: true, data: products });
  } catch (error) {
    console.error("Erro /products:", error);
    return res.status(500).json({ ok: false, error: "Erro interno do servidor" });
  }
});

export default router;
