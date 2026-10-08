import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from './data';
import { canUse, type PaidFeature } from './entitlements';

export function PaidAccess({ feature, children }: { feature: PaidFeature; children: ReactNode }) {
  const sub = useSubscription();
  if (sub.isLoading) return <div className="cd-card cd-center app-gap"><Loader2 className="cd-spin" />Verificando acesso…</div>;
  if (sub.isError) return <div className="cd-card app-gap" role="alert">Não foi possível verificar seu acesso.<Button variant="ghost" onClick={() => sub.refetch()}>Tentar novamente</Button><Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button></div>;
  if (!canUse(sub.data, feature)) return <article className="cd-card app-gap"><h2><Lock size={16} /> Recurso dos planos GROWTH e PRO</h2><p className="cd-small">Disponível com acesso GROWTH ou PRO ativo.</p><Button asChild variant="nexa"><Link to="/app/assinatura">Minha assinatura</Link></Button></article>;
  return <>{children}</>;
}