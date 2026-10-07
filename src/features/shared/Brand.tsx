import { useId } from 'react';
import { brand } from './config';

/** Símbolo NEXAOP: N em fita contínua com duas esferas de energia (roxo → azul → ciano). */
export function BrandSymbol({ size = 30 }: { size?: number }) {
 const id = useId().replace(/:/g, '');
 return <svg className="brand-symbol" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
  <defs>
   <linearGradient id={`g${id}`} x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse"><stop stopColor="#7C3AED"/><stop offset=".55" stopColor="#3B82F6"/><stop offset="1" stopColor="#06B6D4"/></linearGradient>
   <radialGradient id={`s${id}`} cx=".35" cy=".35" r=".7"><stop stopColor="#F4F6FA"/><stop offset=".45" stopColor="#06B6D4"/><stop offset="1" stopColor="#3B82F6"/></radialGradient>
  </defs>
  <path d="M11 39V13.5c0-2.6 3.2-3.8 4.9-1.9l16.2 18.8c1.7 1.9 4.9.7 4.9-1.9V9" fill="none" stroke={`url(#g${id})`} strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M11 39V13.5c0-2.6 3.2-3.8 4.9-1.9l16.2 18.8c1.7 1.9 4.9.7 4.9-1.9V9" fill="none" stroke="#F4F6FA" strokeOpacity=".22" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1.2 -1)"/>
  <circle cx="11" cy="40.5" r="3.6" fill={`url(#s${id})`}/>
  <circle cx="37" cy="7.5" r="3.6" fill={`url(#s${id})`}/>
 </svg>;
}

export function Brand({ tagline = false }: { tagline?: boolean }) {
 return <span className={`brand ${tagline ? 'brand-stacked' : ''}`} aria-label={brand.name}>
  <BrandSymbol/>
  <span className="brand-text"><span className="brand-word">{brand.name}</span>{tagline && <span className="brand-tagline">SUA EQUIPE IA EM AÇÃO</span>}</span>
 </span>;
}
