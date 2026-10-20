import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const templateRoot = resolve(process.cwd(), 'supabase/templates');
const readTemplate = (name: string) => readFileSync(resolve(templateRoot, name), 'utf8');

const templates = [
  'confirmation.html',
  'password-recovery.html',
  'email-change.html',
  'invite.html',
];

describe('ADVEXON branded email templates', () => {
  it.each(templates)('%s uses the company identity and customer support address', (name) => {
    const html = readTemplate(name);

    expect(html).toContain('ADVEXON');
    expect(html).toContain('ADVEXON Technologies');
    expect(html).toContain('suporteadvexon@gmail.com');
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('{{ .ConfirmationURL }}');
    expect(html).toContain('copie este endereço');
  });

  it.each(templates)('%s supports safe name personalization with a fallback', (name) => {
    const html = readTemplate(name);

    expect(html).toContain('{{ if .Data.full_name }}');
    expect(html).toContain('{{ else }}');
    expect(html).toContain('{{ end }}');
  });

  it('uses the supported new-email variable only in the email-change template', () => {
    expect(readTemplate('email-change.html')).toContain('{{ .NewEmail }}');
    expect(readTemplate('confirmation.html')).not.toContain('{{ .NewEmail }}');
    expect(readTemplate('password-recovery.html')).not.toContain('{{ .NewEmail }}');
    expect(readTemplate('invite.html')).not.toContain('{{ .NewEmail }}');
  });
});
