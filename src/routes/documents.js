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

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

router.post("/", async (req, res) => {
  try {
    const baseUrl = getEnvOrFail(res, "VENDUS_BASE_URL");
    if (!baseUrl) return;

    // Usa o mesmo nome que usámos no resto do projeto
    const token = getEnvOrFail(res, "VENDUS_API_TOKEN");
    if (!token) return;

    const { orderId, customerId } = req.body;

    if (!orderId || !customerId) {
      return res.status(400).json({
        ok: false,
        error: "orderId e customerId são obrigatórios."
      });
    }

    const url = joinUrl(baseUrl, "/documents");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "invoice",
        order_id: orderId,
        customer_id: customerId
      })
    });

    const text = await response.text();
    const data = safeJsonParse(text);

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "Erro ao criar fatura no Vendus",
        details: data
      });
    }

    const d = data?.data ?? data;

    return res.json({
      ok: true,
      invoiceId: d?.id ?? null,
      invoiceNumber: d?.number ?? null,
      totalNet: d?.total_net ?? null,
      totalGross: d?.total_gross ?? null,
      issuedAt: d?.created_at ?? null,
      status: "INVOICE_CREATED",
      LinkFatura: d?.output?.url ?? null
    });
  } catch (error) {
    console.error("Erro /documents:", error);

    return res.status(500).json({
      ok: false,
      error: "Erro ao criar fatura"
    });
  }
});

export default router;
