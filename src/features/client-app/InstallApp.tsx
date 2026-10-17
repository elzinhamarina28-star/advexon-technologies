import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function InstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const available = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const installed = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', available); window.removeEventListener('appinstalled', installed); };
  }, []);
  if (!event) return null;
  return <Button variant="ghost" onClick={async () => { await event.prompt(); await event.userChoice; setEvent(null); }}><Download size={16}/>Instalar aplicativo</Button>;
}