// Status metadata only. "Enabled" means configured, not merely that an OAuth scaffold exists.
export type IntegrationStatus = { enabled: boolean; note: string; stage: 'available' | 'testing' | 'setup' | 'planned' };
export const integrations = {
  auth: { enabled: true, stage: 'testing', note: 'Autenticação configurada; validar fluxos completos.' },
  database: { enabled: true, stage: 'testing', note: 'Persistência configurada; aplicar migrações pendentes e validar isolamento.' },
  checkout: { enabled: false, stage: 'setup', note: 'Links Kiwify cadastrados; confirmar webhooks, identificação do assinante e ativação automática ponta a ponta.' },
  whatsapp: { enabled: false, stage: 'setup', note: 'Webhook verifica a assinatura, mas ainda não processa nem armazena mensagens.' },
  sheets: { enabled: false, stage: 'testing', note: 'Endpoint de leitura/escrita e OAuth preparados; falta validar credenciais, migrações e chamadas reais.' },
  gmail: { enabled: false, stage: 'testing', note: 'OAuth e leitura de metadados preparados; falta validar credenciais e chamadas reais.' },
  outlook: { enabled: false, stage: 'testing', note: 'OAuth e leitura de mensagens preparados; falta configurar Microsoft Entra e validar chamadas reais.' },
  facebook: { enabled: false, stage: 'setup', note: 'OAuth inicial preparado; faltam seleção de páginas, permissões finais e testes da API.' },
  instagram: { enabled: false, stage: 'setup', note: 'OAuth inicial preparado; faltam validação de conta profissional, permissões finais e testes da API.' },
  drive: { enabled: false, stage: 'testing', note: 'OAuth e listagem de arquivos preparados; falta validar escopos, migrações e chamadas reais.' },
  onedrive: { enabled: false, stage: 'testing', note: 'OAuth e listagem de arquivos preparados; falta configurar Microsoft Entra e validar chamadas reais.' },
  excel: { enabled: false, stage: 'planned', note: 'Operações específicas de planilhas Excel ainda não implementadas.' },
  ai: { enabled: true, stage: 'testing', note: 'Gemini está configurado no servidor; validar cada fluxo de agente e limites por plano.' },
} satisfies Record<string, IntegrationStatus>;
