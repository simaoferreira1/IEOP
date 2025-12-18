import { Router } from "express";
import fetch from "node-fetch";

const router = Router();


router.post("/", async (req, res) => {
  try {
    const { nome, email, telefone, nif } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        ok: false,
        error: "Nome e telefone são obrigatórios."
      });
    }

    const listResponse = await fetch(
      `${process.env.VENDUS_BASE_URL}/customers/list`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.VENDUS_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!listResponse.ok) {
      throw new Error("Erro ao consultar clientes no Vendus");
    }

    const listData = await listResponse.json();

    // Procurar cliente existente (por telefone ou NIF)
    const existingCustomer = listData.data.find(c =>
      (telefone && c.phone === telefone) ||
      (nif && c.fiscal_id === nif)
    );

    if (existingCustomer) {
      return res.json({
        ok: true,
        customerId: existingCustomer.id,
        created: false
      });
    }


    const createResponse = await fetch(
      `${process.env.VENDUS_BASE_URL}/customers/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VENDUS_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: nome,
          email: email || "",
          phone: telefone,
          fiscal_id: nif && nif.length === 9 ? nif : ""
        })
      }
    );

    if (!createResponse.ok) {
      const err = await createResponse.text();
      throw new Error(err);
    }

    const createdCustomer = await createResponse.json();

    return res.json({
      ok: true,
      customerId: createdCustomer.data.id,
      created: true
    });

  } catch (error) {
    console.error("Erro /customers:", error);

    res.status(500).json({
      ok: false,
      error: "Erro ao processar cliente"
    });
  }
});

export default router;
