import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

function getEnvOrFail(res, key) {
  const v = process.env[key];
  if (!v) {
    res.status(500).json({ ok: false, error: `Configuração inválida: ${key} não definida.` });
    return null;
  }
  return v;
}

function safeJsonParse(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

/**
 * POST /orders
 * body:
 * {
 *   customerId: number|string,
 *   items: [{ productId, quantity }],
 *   paymentMethod: string,
 *   notes?: string,
 *   externalRef?: string
 * }
 *
 * response:
 * { ok: true, orderId, details }
 */
router.post("/", async (req, res) => {
  try {
    const baseUrl = getEnvOrFail(res, "VENDUS_BASE_URL");
    if (!baseUrl) return;

    const token = getEnvOrFail(res, "VENDUS_API_TOKEN");
    if (!token) return;

    // Permite troca fácil do endpoint de criação sem mexer no código
    const createPath = process.env.VENDUS_ORDERS_CREATE_PATH || "/orders";

    const { customerId, items, paymentMethod, notes, externalRef } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "Pedido inválido. customerId e items são obrigatórios." });
    }
    if (!paymentMethod) {
      return res.status(400).json({ ok: false, error: "paymentMethod obrigatório." });
    }

    // 1) Buscar produtos para validar preços/stock (podes optimizar com cache)
    const productsUrl = `${baseUrl.replace(/\/+$/, "")}/products`;
    const productsResponse = await fetch(productsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const productsText = await productsResponse.text();
    const productsData = safeJsonParse(productsText);

    if (!productsResponse.ok) {
      return res.status(productsResponse.status).json({
        ok: false,
        error: "Erro ao obter produtos do Vendus",
        details: productsData
      });
    }

    const productsRows = Array.isArray(productsData?.data)
      ? productsData.data
      : Array.isArray(productsData)
        ? productsData
        : [];

    let total = 0;

    // 2) Montar linhas
    const orderLines = items.map((item) => {
      const productId = item.productId ?? item.id;
      const qty = Number(item.quantity ?? item.qty ?? 0);

      if (!productId || !Number.isFinite(qty) || qty <= 0) {
        throw new Error("Item inválido: precisa productId e quantity>0");
      }

      const product = productsRows.find((p) => String(p.id) === String(productId));

      if (!product) {
        throw new Error(`Produto ${productId} inválido (não encontrado no Vendus)`);
      }

      const stock = product.stock_total ?? product.stock ?? null;
      if (typeof stock === "number" && stock < qty) {
        throw new Error(`Stock insuficiente para o produto ${product.title ?? product.name ?? product.id}`);
      }

      const price = Number(product.price ?? 0);
      const subtotal = price * qty;
      total += subtotal;

      return {
        product_id: product.id,
        qty,
        price
      };
    });

    // 3) Criar order/document no Vendus
    const createUrl = `${baseUrl.replace(/\/+$/, "")}${createPath.startsWith("/") ? "" : "/"}${createPath}`;

    const bodyToVendus = {
      customer_id: customerId,
      payment_method: paymentMethod,
      products: orderLines,
      // extras (se o Vendus aceitar):
      notes: notes || undefined,
      reference: externalRef || undefined,
      total: total || undefined
    };

    const orderResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyToVendus)
    });

    const orderText = await orderResponse.text();
    const orderData = safeJsonParse(orderText);

    if (!orderResponse.ok) {
      return res.status(orderResponse.status).json({
        ok: false,
        error: "Erro ao criar order no Vendus",
        details: orderData
      });
    }

    // 4) Obter orderId (vários formatos possíveis)
    const orderId =
      orderData?.id ??
      orderData?.data?.id ??
      orderData?.order?.id ??
      orderData?.data?.order?.id ??
      null;

    return res.json({
      ok: true,
      orderId,
      details: orderData
    });
  } catch (err) {
    console.error("Erro /orders:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Erro interno do servidor" });
  }
});

/**
 * (Opcional) GET /orders?customerId=123
 * Para listar orders de um cliente (se o Vendus suportar)
 */
router.get("/", async (req, res) => {
  try {
    const baseUrl = getEnvOrFail(res, "VENDUS_BASE_URL");
    if (!baseUrl) return;

    const token = getEnvOrFail(res, "VENDUS_API_TOKEN");
    if (!token) return;

    const { customerId } = req.query;
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/orders`);
    if (customerId) url.searchParams.set("customer_id", String(customerId));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const text = await response.text();
    const data = safeJsonParse(text);

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: "Erro ao listar orders no Vendus", details: data });
    }

    return res.json({ ok: true, data });
  } catch (err) {
    console.error("Erro GET /orders:", err);
    return res.status(500).json({ ok: false, error: "Erro interno do servidor" });
  }
});

export default router;
