import officialLogo from '@/assets/nexaop-official.png.asset.json';
import officialSymbol from '@/assets/nexaop-official-symbol.png.asset.json';

export function Brand({ tagline = false }: { tagline?: boolean }) {
 return <span className={`brand ${tagline ? 'brand-full' : 'brand-compact'}`}>
  <img className="brand-image" src={tagline ? officialLogo.url : officialSymbol.url}
   width={tagline ? 1536 : 640} height={tagline ? 1024 : 640}
   alt={tagline ? 'NEXAOP — SUA EQUIPE IA EM AÇÃO' : 'NEXAOP'} decoding="async" />
 </span>;
}
