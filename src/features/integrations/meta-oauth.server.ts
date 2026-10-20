// Server-only Meta OAuth foundation for Facebook Pages and Instagram professional accounts.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { encryptToken, signState } from '@/features/integrations/google-oauth.server';

export const META_SCOPES = {
  facebook: ['public_profile', 'pages_show_list', 'pages_read_engagement'],
  instagram: ['public_profile', 'instagram_basic', 'pages_show_list'],
} as const;
export type MetaProvider = keyof typeof META_SCOPES;
type State = { user_id: string; provider: string; expires_at: string };
type Deps = {
  verifyUser: (token: string) => Promise<string | null>;
  insertState: (row: { nonce: string; user_id: string; provider: MetaProvider; expires_at: string }) => Promise<boolean>;
  consumeState: (nonce: string) => Promise<State | null>;
  saveConnection: (row: Record<string, unknown>) => Promise<boolean>;
  fetch: typeof fetch;
  now: () => number;
};
function b64(bytes: Uint8Array) { let s=''; for (const b of bytes) s+=String.fromCharCode(b); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
const plain = (s: string, status: number) => new Response(s, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
function validProvider(value: unknown): value is MetaProvider { return typeof value === 'string' && Object.prototype.hasOwnProperty.call(META_SCOPES, value); }
function bearer(request: Request) { const v=request.headers.get('authorization')??''; return v.startsWith('Bearer ')?v.slice(7):null; }
export async function defaultMetaDeps(): Promise<Deps> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  return {
    verifyUser: async token => {
      const url=process.env['SUPABASE_URL'], key=process.env['SUPABASE_PUBLISHABLE_KEY'];
      if(!url||!key) return null;
      const client=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data,error}=await client.auth.getClaims(token);
      return !error&&typeof data?.claims?.sub==='string'?data.claims.sub:null;
    },
    insertState: async row => { const {error}=await db.from('integration_oauth_states').insert(row); if(error) console.error('[meta-oauth] state insert failed',error.code); return !error; },
    consumeState: async nonce => { const {data,error}=await db.from('integration_oauth_states').delete().eq('nonce',nonce).select('user_id,provider,expires_at').maybeSingle(); return error?null:data as State|null; },
    saveConnection: async row => { const {error}=await db.from('integration_connections').upsert(row,{onConflict:'user_id,provider'}); if(error) console.error('[meta-oauth] save failed',error.code); return !error; },
    fetch: (...args)=>fetch(...args), now:()=>Date.now(),
  };
}
export async function startMetaOAuth(request: Request, provider: MetaProvider, deps: Deps): Promise<Response> {
  const appId=process.env['META_APP_ID'], redirect=process.env['META_REDIRECT_URI'], stateSecret=process.env['INTEGRATION_OAUTH_STATE_SECRET'];
  if(!appId||!redirect||!stateSecret) return Response.json({error:'Integração Meta ainda não configurada no servidor.'},{status:503});
  const token=bearer(request); if(!token) return Response.json({error:'Autenticação necessária.'},{status:401});
  const userId=await deps.verifyUser(token); if(!userId) return Response.json({error:'Sessão inválida.'},{status:401});
  const nonce=b64(crypto.getRandomValues(new Uint8Array(32)));
  if(!await deps.insertState({nonce,user_id:userId,provider,expires_at:new Date(deps.now()+600_000).toISOString()})) return Response.json({error:'Não foi possível iniciar a conexão.'},{status:500});
  const url=new URL('https://www.facebook.com/v23.0/dialog/oauth');
  url.search=new URLSearchParams({client_id:appId,redirect_uri:redirect,response_type:'code',scope:META_SCOPES[provider].join(','),state:nonce+'.'+await signState(nonce,stateSecret)}).toString();
  return Response.json({authorizationUrl:url.toString()},{headers:{'cache-control':'no-store'}});
}
export async function handleMetaCallback(request: Request, deps: Deps): Promise<Response> {
  const url=new URL(request.url); if(url.searchParams.has('error')) return plain('A autorização Meta foi cancelada. Volte à ADVEXON e tente novamente.',400);
  const code=url.searchParams.get('code'), state=url.searchParams.get('state')??'';
  const appId=process.env['META_APP_ID'], appSecret=process.env['META_APP_SECRET'], redirect=process.env['META_REDIRECT_URI'], stateSecret=process.env['INTEGRATION_OAUTH_STATE_SECRET'], encryptionKey=process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  if(!appId||!appSecret||!redirect||!stateSecret||!encryptionKey) return plain('A integração Meta não está configurada.',503);
  const [nonce,sig,extra]=state.split('.');
  if(!code||!nonce||!sig||extra!==undefined||await signState(nonce,stateSecret)!==sig) return plain('Estado OAuth inválido.',400);
  const row=await deps.consumeState(nonce);
  if(!row||!validProvider(row.provider)||new Date(row.expires_at).getTime()<deps.now()) return plain('A sessão de autorização expirou. Tente novamente.',400);
  try {
    const tokenUrl=new URL('https://graph.facebook.com/v23.0/oauth/access_token');
    tokenUrl.search=new URLSearchParams({client_id:appId,client_secret:appSecret,redirect_uri:redirect,code}).toString();
    const response=await deps.fetch(tokenUrl,{method:'GET'});
    const data=await response.json() as {access_token?:string;expires_in?:number;error?:{message?:string}};
    if(!response.ok||!data.access_token){console.error('[meta-oauth] token exchange failed',response.status);return plain('A Meta não concluiu a autorização. Tente novamente.',502);}
    const profileRes=await deps.fetch('https://graph.facebook.com/v23.0/me?fields=id,name',{headers:{authorization:'Bearer '+data.access_token}});
    const profile=profileRes.ok?await profileRes.json() as {id?:string;name?:string}: {};
    const now=new Date(deps.now()).toISOString();
    const saved=await deps.saveConnection({user_id:row.user_id,provider:row.provider,status:'connected',account_label:profile.name??'Conta Meta',provider_account_id:profile.id??null,scopes:META_SCOPES[row.provider],access_token_ciphertext:await encryptToken(data.access_token,encryptionKey),token_expires_at:new Date(deps.now()+Math.max(60,data.expires_in??3600)*1000).toISOString(),connected_at:now,updated_at:now,last_error_code:null});
    if(!saved)return plain('Autorização concluída, mas não foi possível salvar a conexão.',500);
    return new Response(null,{status:302,headers:{location:'/app/configuracoes?integration='+row.provider+'&status=connected','cache-control':'no-store'}});
  } catch(error) { console.error('[meta-oauth] callback failed',error instanceof Error?error.message:'unknown'); return plain('Não foi possível concluir a conexão Meta.',500); }
}
