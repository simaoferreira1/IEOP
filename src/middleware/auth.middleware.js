
export function requireInternalKey(req, res, next) {
  try {
    const expectedKey = process.env.INTERNAL_API_KEY;
    const providedKey = req.headers["x-api-key"];

    // Verificar se a API Key está configurada no servidor
    if (!expectedKey) {
      return res.status(500).json({
        ok: false,
        error: "Configuração inválida: INTERNAL_API_KEY não definida."
      });
    }

    // Verificar se o pedido tem a chave correta
    if (!providedKey || providedKey !== expectedKey) {
      return res.status(401).json({
        ok: false,
        error: "Acesso não autorizado."
      });
    }

    // Pedido autorizado
    next();

  } catch (error) {
    console.error("Erro no middleware de autenticação:", error);

    return res.status(500).json({
      ok: false,
      error: "Erro interno de autenticação."
    });
  }
}
