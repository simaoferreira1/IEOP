export function requireInternalKey(req, res, next) {
  const expected = process.env.INTERNAL_API_KEY;
  const provided = req.headers["x-api-key"];

  if (!expected) {
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_API_KEY não configurada no servidor."
    });
  }

  if (!provided || provided !== expected) {
    return res.status(401).json({
      ok: false,
      error: "Não autorizado (x-api-key inválida ou em falta)."
    });
  }

  next();
}
