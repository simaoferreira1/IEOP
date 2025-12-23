import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const VENDUS_PUBLIC_HOST = "https://www.vendus.pt";

/**
 * Devolve a primeira imagem disponível (produto -> variantes)
 */
function pickFirstImage(product) {
  // 1) Imagem direta no produto
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0]; // costuma ter { xs, m, ... }
  }

  // 2) Se não houver, tenta nas variantes
  if (Array.isArray(product?.product_variants)) {
    for (const v of product.product_variants) {
      if (Array.isArray(v?.images) && v.images.length > 0) {
        return v.images[0];
      }
    }
  }

  return null;
}

/**
 * Constrói URL absoluta a partir de uma URL relativa do Vendus (ex: "/foto/...").
 */
function toAbsoluteUrl(path) {
  if (!path) return null;
  if (typeof path !== "string") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${VENDUS_PUBLIC_HOST}${path}`;
}

/**
 * GET /products
 * Vai buscar os produtos reais ao Vendus e normaliza para PowerApps (inclui imagem)
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
    const rows = Array.isArray(vendusData?.data)
      ? vendusData.data
      : Array.isArray(vendusData)
        ? vendusData
        : [];

    const products = rows.map((p) => {
      const img = pickFirstImage(p);

      return {
        id: p.id,
        name: p.title ?? p.name ?? "",
        price: p.price ?? 0,
        stock: p.stock_total ?? p.stock ?? null,

        // ✅ URLs para o PowerApps usar num controlo Image
        imageUrl: toAbsoluteUrl(img?.m ?? img?.url ?? null),
        imageUrlSmall: toAbsoluteUrl(img?.xs ?? null)
      };
    });

    return res.json({ ok: true, data: products });
  } catch (error) {
    console.error("Erro /products:", error);
    return res.status(500).json({ ok: false, error: "Erro interno do servidor" });
  }
});

export default router;
