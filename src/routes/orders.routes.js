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

router.post("/", async (req, res) => {
  try {
    const baseUrl = getEnvOrFail(res, "VENDUS_BASE_URL");
    if (!baseUrl) return;

    const token = getEnvOrFail(res, "VENDUS_API_TOKEN");
    if (!token) return;

    const createPath = "/documents"; 

    const { customerId, items, paymentMethod, notes, externalRef } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "Pedido inválido. customerId e items são obrigatórios." });
    }

    const productsUrl = `${baseUrl.replace(/\/+$/, "")}/products`;
    const productsResponse = await fetch(productsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const productsText = await productsResponse.text();
    const productsData = safeJsonParse(productsText);

    if (!productsResponse.ok) {
       console.warn("Aviso: Não foi possível validar stock no Vendus, a prosseguir mesmo assim.");
    }

    const productsRows = Array.isArray(productsData?.data)
      ? productsData.data
      : Array.isArray(productsData)
        ? productsData
        : [];

    let total = 0;

    const orderLines = items.map((item) => {
      const productId = item.productId ?? item.id;
      const qty = Number(item.quantity ?? item.qty ?? 0);

      const product = productsRows.find((p) => String(p.id) === String(productId));
      
      const price = product ? Number(product.price ?? 0) : 0; 
      
      return {
        product_id: productId,
        qty: qty,
        price: price 
      };
    });

    const createUrl = `${baseUrl.replace(/\/+$/, "")}${createPath}`;

    const bodyToVendus = {
      type: "EC",                 
      payment_method_id: 1,      
      items: orderLines,         
      
      client: { id: customerId }, 
      
      notes: notes || undefined,
      reference: externalRef || undefined
    };

    console.log("A enviar para o Vendus:", JSON.stringify(bodyToVendus)); 

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
      console.error("Erro Vendus:", orderData);
      return res.status(orderResponse.status).json({
        ok: false,
        error: "Erro ao criar Encomenda no Vendus",
        details: orderData
      });
    }

    return res.json({
      ok: true,
      orderId: orderData.id, 
      status: "Pendente",
      details: orderData
    });

  } catch (err) {
    console.error("Erro /orders:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Erro interno do servidor" });
  }
});

router.get("/", async (req, res) => {
  try {
    const baseUrl = getEnvOrFail(res, "VENDUS_BASE_URL");
    if (!baseUrl) return;
    const token = getEnvOrFail(res, "VENDUS_API_TOKEN");
    if (!token) return;

    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/documents`);
    url.searchParams.set("type", "EC"); 

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const text = await response.text();
    const data = safeJsonParse(text);

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: "Erro ao listar encomendas", details: data });
    }

    return res.json({ ok: true, data }); 
  } catch (err) {
    console.error("Erro GET /orders:", err);
    return res.status(500).json({ ok: false, error: "Erro interno do servidor" });
  }
});

export default router;