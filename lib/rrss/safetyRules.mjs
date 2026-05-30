export const FORBIDDEN_PHRASES = [
  { pattern: "garantizado", risk: "high", reason: "No se puede garantizar nada en transacciones marketplace" },
  { pattern: "sin riesgo", risk: "high", reason: "Toda transacción tiene riesgo" },
  { pattern: "100% seguro", risk: "high", reason: "No prometer seguridad absoluta" },
  { pattern: "sin comisiones ocultas", risk: "medium", reason: "Usar 'Comisión transparente: 5% solo si se vende'" },
  { pattern: "pago confirmado", risk: "high", reason: "No confirmar pagos sin verificación" },
  { pattern: "te pagamos ya", risk: "high", reason: "No prometer pagos inmediatos" },
  { pattern: "envía tu clave", risk: "critical", reason: "Nunca pedir claves por redes" },
  { pattern: "envía tu contraseña", risk: "critical", reason: "Nunca pedir contraseñas por redes" },
  { pattern: "envía cédula por DM", risk: "critical", reason: "No pedir documentos de identidad por DM" },
  { pattern: "datos bancarios completos por DM", risk: "critical", reason: "No pedir datos bancarios por DM" },
  { pattern: "disputa", risk: "high", reason: "Derivar a humano" },
  { pattern: "reclamo", risk: "high", reason: "Derivar a humano" },
  { pattern: "disponible siempre", risk: "medium", reason: "No prometer disponibilidad absoluta" },
  { pattern: "disponible 24/7", risk: "medium", reason: "No prometer disponibilidad absoluta" },
];

export const REQUIRED_HUMAN_REVIEW_FOR = [
  "pago",
  "dinero",
  "precio",
  "costo",
  "comisión",
  "disputa",
  "reclamo",
  "garantía",
  "devolución",
  "reembolso",
];

export function scanCaption(text) {
  const flags = [];
  const lower = (text || "").toLowerCase();

  for (const rule of FORBIDDEN_PHRASES) {
    if (lower.includes(rule.pattern.toLowerCase())) {
      flags.push({
        type: "forbidden_phrase",
        phrase: rule.pattern,
        risk: rule.risk,
        reason: rule.reason,
      });
    }
  }

  for (const keyword of REQUIRED_HUMAN_REVIEW_FOR) {
    if (lower.includes(keyword)) {
      const existing = flags.find((f) => f.phrase === keyword);
      if (!existing) {
        flags.push({
          type: "human_review_recommended",
          phrase: keyword,
          risk: "medium",
          reason: `Menciona "${keyword}". Revisión humana recomendada.`,
        });
      }
    }
  }

  return flags;
}

export function assessRisk(flags) {
  if (flags.length === 0) return "low";
  const hasCritical = flags.some((f) => f.risk === "critical");
  const hasHigh = flags.some((f) => f.risk === "high");
  if (hasCritical) return "high";
  if (hasHigh) return "high";
  const hasMedium = flags.some((f) => f.risk === "medium");
  if (hasMedium) return "medium";
  return "low";
}

export function canAutoApprove(flags) {
  return flags.every((f) => f.risk !== "critical" && f.risk !== "high");
}

export function validateItem(item) {
  const allText = [item.caption, item.title, ...(item.hashtags || [])].join(" ");
  const flags = scanCaption(allText);
  const riskLevel = assessRisk(flags);
  return {
    flags,
    riskLevel,
    canAutoApprove: canAutoApprove(flags),
    requiresHumanReview: riskLevel === "high" || flags.length > 0,
  };
}
