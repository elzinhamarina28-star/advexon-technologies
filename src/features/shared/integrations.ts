// Configuration status only; enabled does not imply every real user flow has been verified.
export type IntegrationStatus = { enabled: boolean; note: string };
export const integrations = {
  auth: { enabled: true, note: 'Autenticação configurada no Lovable Cloud; fluxos reais ainda não integralmente verificados.' },
  database: { enabled: true, note: 'Banco e persistência da conta configurados; fluxos reais ainda não integralmente verificados.' },
  checkout: { enabled: false, note: 'Links oficiais cadastrados. Liberação automática ainda não validada; faltam token, IDs dos produtos e entrega oficial do webhook.' },
  whatsapp: { enabled: false, note: 'Canal de atendimento da ATHENA — futuro.' },
  sheets: { enabled: false, note: 'Planejado para START, GROWTH e PRO. Falta conectar a conta Google e autorizar acesso às planilhas.' },
  gmail: { enabled: false, note: 'Planejado para GROWTH e PRO. Falta autorização Google para o Gmail e validação da integração.' },
  excel: { enabled: false, note: 'Planejado para PRO. Falta autorização Microsoft e validação de acesso aos arquivos.' },
  instagram: { enabled: false, note: 'Planejado para PRO. Falta conta profissional Meta, permissões e aprovação da integração.' },
  ai: { enabled: true, note: 'Gemini API via servidor (GEMINI_API_KEY).' },
} satisfies Record<string, IntegrationStatus>;
