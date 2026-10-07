// Future integration points. Nothing here is connected yet; every flag stays false until a real service is configured.
export type IntegrationStatus = { enabled: boolean; note: string };
export const integrations = {
  auth: { enabled: false, note: 'Contas de cliente — futuro (Lovable Cloud).' },
  database: { enabled: false, note: 'Persistência de diagnósticos e painel — futuro.' },
  checkout: { enabled: false, note: 'Kiwify — preencher checkoutUrl em pricing/config.ts.' },
  whatsapp: { enabled: false, note: 'Canal de atendimento da ATHENA — futuro.' },
  ai: { enabled: true, note: 'Gemini API via servidor (GEMINI_API_KEY).' },
} satisfies Record<string, IntegrationStatus>;
