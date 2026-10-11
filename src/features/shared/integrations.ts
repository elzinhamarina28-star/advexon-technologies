// Configuration status only; enabled does not imply every real user flow has been verified.
export type IntegrationStatus = { enabled: boolean; note: string };
export const integrations = {
  auth: { enabled: true, note: 'Autenticação configurada no Lovable Cloud; fluxos reais ainda não integralmente verificados.' },
  database: { enabled: true, note: 'Banco e persistência da conta configurados; fluxos reais ainda não integralmente verificados.' },
  checkout: { enabled: false, note: 'Kiwify — preencher checkoutUrl em pricing/config.ts.' },
  whatsapp: { enabled: false, note: 'Canal de atendimento da ATHENA — futuro.' },
  ai: { enabled: true, note: 'Gemini API via servidor (GEMINI_API_KEY).' },
} satisfies Record<string, IntegrationStatus>;
