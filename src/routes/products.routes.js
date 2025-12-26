import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const VENDUS_PUBLIC_HOST = "https://www.vendus.pt";

/**
 * Devolve a primeira imagem disponível (produto -> variantes)
 */
function pickFirstImage(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0];
  }

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
  if (!path || typeof path !== "string") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${VENDUS_PUBLIC_HOST}${path}`;
}

/**
 * Categorias pedidas (heurística por nome)
 */
function inferCategory(nameRaw) {
  const name = (nameRaw || "").toLowerCase();

  const has = (...words) => words.some((w) => name.includes(w));

  if (has("água", "agua", "coca", "cola", "fanta", "sprite", "sumo", "suco", "icer tea", "ice tea", "cerveja", "beer", "vinho", "wine", "café", "cafe", "chá", "cha")) {
    return "bebidas";
  }

  if (has("sopa", "caldo", "creme")) {
    return "sopas";
  }

  if (has("hamb", "hambúrg", "hamburg", "sanduíche", "sanduiche", "tosta", "panini", "wrap", "bifana")) {
    return "sanduíches";
  }

  if (has("entrada", "entradas", "aperitivo", "azeitonas", "pão", "pao", "tapas", "bruschetta", "croquete", "rissol", "chamuça", "chamuça", "chamuças", "nugget")) {
    return "entradas";
  }

  if (has("sobremesa", "doce", "bolo", "mousse", "gelado", "pudim", "tarte", "cheesecake", "brownie")) {
    return "sobremesa";
  }

  if (has("prato", "bife", "frango", "carne", "peixe", "massa", "pizza", "lasanha", "risotto", "arroz", "salada")) {
    return "pratos principais";
  }

  // fallback
  return "comida";
}

/**
 * Fallback de imagem por categoria (podes trocar por URLs reais teus)
 */
function fallbackImageByCategory(cat) {
  // podes meter isto a apontar para o teu backend ou CDN
  // ex: https://teusite.com/img/food.png
  switch (cat) {
    case "bebidas":
      return "https://via.placeholder.com/300x300?text=Bebidas";
    case "sopas":
      return "https://via.placeholder.com/300x300?text=Sopas";
    case "sanduíches":
      return "https://via.placeholder.com/300x300?text=Sanduiches";
    case "entradas":
      return "https://via.placeholder.com/300x300?text=Entradas";
    case "sobremesa":
      return "https://via.placeholder.com/300x300?text=Sobremesa";
    case "pratos principais":
      return "https://via.placeholder.com/300x300?text=Pratos+Principais";
    default:
      return "https://via.placeholder.com/300x300?text=Comida";
  }
}

/**
 * GET /products
 * Vai buscar produtos ao Vendus e normaliza (inclui imagem + categoria)
 */
router.get("/", async (req, res) => {
  try {
    const baseUrl = process.env.VENDUS_BASE_URL;
    const token = process.env.VENDUS_API_TOKEN;

    if (!baseUrl) {
      return res.status(500).json({ ok: false, error: "Configuração inválida: VENDUS_BASE_URL não definida." });
    }
    if (!token) {
      return res.status(500).json({ ok: false, error: "Configuração inválida: VENDUS_API_TOKEN não definida." });
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

    const rows = Array.isArray(vendusData?.data)
      ? vendusData.data
      : Array.isArray(vendusData)
        ? vendusData
        : [];

    const products = rows.map((p) => {
      const img = pickFirstImage(p);

      const name = p.title ?? p.name ?? "";
      const category = inferCategory(name);

      const imageUrl = toAbsoluteUrl(img?.m ?? img?.url ?? null) || fallbackImageByCategory(category);
      const imageUrlSmall = toAbsoluteUrl(img?.xs ?? null) || imageUrl;

      return {
        id: p.id,
        name,
        price: p.price ?? 0,
        stock: p.stock_total ?? p.stock ?? null,
        category,
        imageUrl,
        imageUrlSmall
      };
    });

    return res.json({ ok: true, data: products });
  } catch (error) {
    console.error("Erro /products:", error);
    return res.status(500).json({ ok: false, error: "Erro interno do servidor" });
  }
});

export default router;
