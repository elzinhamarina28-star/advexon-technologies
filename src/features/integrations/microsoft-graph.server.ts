// Server-only read operations for Outlook and OneDrive using delegated Microsoft Graph tokens.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { decryptToken } from '@/features/integrations/google-sheets.server';
import { encryptToken } from '@/features/integrations/google-oauth.server';

type Provider = 'outlook' | 'onedrive';
type Connection = { access_token_ciphertext: string | null; refresh_token_ciphertext: string | null; token_expires_at: string | null; scopes: string[] };
type Deps = {
  verifyUser: (token: string) => Promise<string | null>;
  getConnection: (userId: string, provider: Provider) => Promise<Connection | null>;
  saveTokens: (userId: string, provider: Provider, access: string, refresh: string | null, expiry: string) => Promise<boolean>;
  fetch: typeof fetch;
  now: () => number;
};
const fail=(error:string,status:number)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
function bearer(request:Request){const v=request.headers.get('authorization')??'';return v.startsWith('Bearer ')?v.slice(7):null;}
export async function defaultGraphDeps():Promise<Deps>{
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const db=supabaseAdmin as any;
 return {
  verifyUser:async token=>{const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'];if(!url||!key)return null;const c=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await c.auth.getClaims(token);return !error&&typeof data?.claims?.sub==='string'?data.claims.sub:null;},
  getConnection:async(userId,provider)=>{const {data,error}=await db.from('integration_connections').select('access_token_ciphertext,refresh_token_ciphertext,token_expires_at,scopes').eq('user_id',userId).eq('provider',provider).eq('status','connected').maybeSingle();if(error)console.error('[microsoft-graph] lookup failed',error.code);return error?null:data;},
  saveTokens:async(userId,provider,access,refresh,expiry)=>{const row:Record<string,unknown>={access_token_ciphertext:access,token_expires_at:expiry,updated_at:new Date().toISOString()};if(refresh)row.refresh_token_ciphertext=refresh;const {error}=await db.from('integration_connections').update(row).eq('user_id',userId).eq('provider',provider);if(error)console.error('[microsoft-graph] refresh save failed',error.code);return !error;},
  fetch:(...args)=>fetch(...args),now:()=>Date.now(),
 };
}
async function accessToken(userId:string,provider:Provider,deps:Deps):Promise<string|null>{
 const c=await deps.getConnection(userId,provider);if(!c?.access_token_ciphertext)return null;
 const key=process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];if(!key)throw new Error('token encryption is not configured');
 if(c.token_expires_at&&new Date(c.token_expires_at).getTime()>deps.now()+60_000)return decryptToken(c.access_token_ciphertext,key);
 if(!c.refresh_token_ciphertext)return null;
 const clientId=process.env['MICROSOFT_CLIENT_ID'],clientSecret=process.env['MICROSOFT_CLIENT_SECRET'];if(!clientId||!clientSecret)return null;
 const refresh=await decryptToken(c.refresh_token_ciphertext,key);
 const scopes=provider==='outlook'?'openid email offline_access User.Read Mail.Read':'openid email offline_access User.Read Files.Read';
 const res=await deps.fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refresh,grant_type:'refresh_token',scope:scopes})});
 const data=await res.json() as {access_token?:string;refresh_token?:string;expires_in?:number;error?:string};if(!res.ok||!data.access_token){console.error('[microsoft-graph] refresh failed',data.error??res.status);return null;}
 const access=await encryptToken(data.access_token,key),nextRefresh=data.refresh_token?await encryptToken(data.refresh_token,key):null,expiry=new Date(deps.now()+Math.max(60,data.expires_in??3600)*1000).toISOString();
 if(!await deps.saveTokens(userId,provider,access,nextRefresh,expiry))throw new Error('could not persist refreshed token');return data.access_token;
}
export async function handleGraphRead(request:Request,provider:Provider,deps:Deps):Promise<Response>{
 const token=bearer(request);if(!token)return fail('Autenticação necessária.',401);const userId=await deps.verifyUser(token);if(!userId)return fail('Sessão inválida.',401);
 const url=new URL(request.url);const top=Number(url.searchParams.get('top')??'10');if(!Number.isInteger(top)||top<1||top>50)return fail('top deve ser entre 1 e 50.',400);
 try{
  const access=await accessToken(userId,provider,deps);if(!access)return fail('Conexão Microsoft ausente ou expirada. Reconecte a conta.',409);
  const target=provider==='outlook'
   ? 'https://graph.microsoft.com/v1.0/me/messages?$top='+top+'&$select=id,subject,from,receivedDateTime,isRead,bodyPreview&$orderby=receivedDateTime%20DESC'
   : 'https://graph.microsoft.com/v1.0/me/drive/root/children?$top='+top+'&$select=id,name,size,file,folder,lastModifiedDateTime,webUrl';
  const res=await deps.fetch(target,{headers:{authorization:'Bearer '+access,accept:'application/json'}});const data=await res.json().catch(()=>({}));
  if(!res.ok){console.error('[microsoft-graph] read failed',provider,res.status);return fail('Não foi possível consultar os dados Microsoft autorizados.',502);}
  return Response.json({provider,result:data},{headers:{'cache-control':'no-store'}});
 }catch(error){console.error('[microsoft-graph] operation failed',error instanceof Error?error.message:'unknown');return fail('Falha ao consultar a conta Microsoft.',500);}
}
