import officialLogo from '@/assets/nexaop-logo-dark.png';
import officialSymbol from '@/assets/nexaop-official-symbol.png.asset.json';

export function Brand({ tagline = false }: { tagline?: boolean }) {
 return <span className={`brand ${tagline ? 'brand-full' : 'brand-compact'}`}>
  <img className="brand-image" src={tagline ? officialLogo : officialSymbol.url}
   width={tagline ? 1357 : 640} height={tagline ? 935 : 640}
   alt={tagline ? 'NEXAOP — SUA EQUIPE IA EM AÇÃO' : 'NEXAOP'} decoding="async" />
 </span>;
}
