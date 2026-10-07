import { brand } from './config';
export function Brand() { return <span className="brand"><span className="brand-symbol" aria-hidden="true"><i /></span>{brand.name}</span>; }
