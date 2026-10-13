import logo from '@/assets/advexon-logo.svg.asset.json';
import symbol from '@/assets/advexon-logo-symbol.svg.asset.json';

export function Brand({ tagline = false }: { tagline?: boolean }) {
 return <span className={`brand ${tagline ? 'brand-full' : 'brand-compact'}`}>
  <img className="brand-image" src={tagline ? logo.url : symbol.url}
   width={tagline ? 600 : 256} height={tagline ? 390 : 256}
   alt={tagline ? 'ADVEXON TECHNOLOGIES — SUA EQUIPE IA EM AÇÃO.' : 'ADVEXON Technologies'} decoding="async" />
 </span>;
}
