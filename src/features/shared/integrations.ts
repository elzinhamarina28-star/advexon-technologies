// Status metadata only. A connector is not considered connected until OAuth/API flows are implemented and verified.
export type IntegrationStatus = { enabled: boolean; note: string };
export const integrations = {
  auth: { enabled: true, note: 'Autenticação configurada; fluxos reais ainda precisam de validação completa.' },
  database: { enabled: true, note: 'Banco e persistência configurados; isolamento e fluxos reais devem ser testados.' },
  checkout: { enabled: false, note: 'Links de checkout cadastrados; webhook, IDs e liberação automática ainda precisam de validação ponta a ponta.' },
  whatsapp: { enabled: false, note: 'Planejado: requer WhatsApp Cloud API, aplicativo Meta, webhook e credenciais seguras no servidor.' },
  sheets: { enabled: false, note: 'Planejado: requer OAuth Google, consentimento e permissões mínimas para planilhas.' },
  gmail: { enabled: false, note: 'Planejado: requer OAuth Google, escopos Gmail e validação do fluxo de mensagens.' },
  outlook: { enabled: false, note: 'Planejado: requer registro no Microsoft Entra e integração Microsoft Graph.' },
  facebook: { enabled: false, note: 'Planejado: requer aplicativo Meta, página comercial, permissões e possíveis revisões.' },
  instagram: { enabled: false, note: 'Planejado: requer conta profissional elegível, permissões e APIs da Meta.' },
  drive: { enabled: false, note: 'Planejado: requer OAuth Google, escopos de Drive e controle de acesso por empresa.' },
  onedrive: { enabled: false, note: 'Planejado: requer OAuth Microsoft Graph e permissões de arquivos.' },
  excel: { enabled: false, note: 'Planejado: requer OAuth Microsoft e validação de acesso aos arquivos.' },
  ai: { enabled: true, note: 'Gemini API configurada no servidor; cada fluxo de agente ainda requer testes de produção.' },
} satisfies Record<string, IntegrationStatus>;
