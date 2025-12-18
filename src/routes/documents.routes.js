import { Router } from "express";
import fetch from "node-fetch";

const router = Router();


router.post("/", async (req, res) => {
  try {
    const { orderId, customerId } = req.body;

   
    if (!orderId || !customerId) {
      return res.status(400).json({
        ok: false,
        error: "orderId e customerId são obrigatórios."
      });
    }

    const response = await fetch(
      `${process.env.VENDUS_BASE_URL}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VENDUS_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "invoice",
          order_id: orderId,
          customer_id: customerId
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const documentData = await response.json();

    return res.json({
      ok: true,
      invoiceId: documentData.data.id,
      invoiceNumber: documentData.data.number,
      totalNet: documentData.data.total_net,
      totalGross: documentData.data.total_gross,
      issuedAt: documentData.data.created_at,
      status: "INVOICE_CREATED"
    });

  } catch (error) {
    console.error("Erro /documents:", error.message);

    res.status(500).json({
      ok: false,
      error: "Erro ao criar fatura"
    });
  }
});

export default router;
