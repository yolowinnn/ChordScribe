/* Cloudflare Pages Function: POST /api/round
   Thin, authenticated proxy to Vertex AI Gemini. The browser builds the full
   generateContent payload (prompt + inline audio base64) — this Worker only
   mints a Vertex access token (manual RS256 JWT via Web Crypto) and forwards
   the request body to Vertex, streaming the response back. Keeping the heavy
   payload out of any JSON.parse/stringify keeps us well under the free-plan
   CPU limit. SA key lives in the Cloudflare secret VERTEX_SA_KEY. */

let cachedToken = null, cachedExp = 0;

function b64url(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const encSeg = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));

async function importKey(pem) {
  const body = pem.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s+/g, "");
  const bin = atob(body); const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return crypto.subtle.importKey("pkcs8", buf.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedExp - 120) return cachedToken;
  const head = encSeg({ alg: "RS256", typ: "JWT" });
  const claim = encSeg({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const signingInput = head + "." + claim;
  const key = await importKey(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = signingInput + "." + b64url(sig);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + jwt });
  const j = await r.json();
  if (!j.access_token) throw new Error("token error: " + JSON.stringify(j).slice(0, 200));
  cachedToken = j.access_token; cachedExp = now + (j.expires_in || 3600);
  return cachedToken;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const err = (o, s) => new Response(JSON.stringify(o), { status: s || 500, headers: { "Content-Type": "application/json", ...CORS } });
export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost(context) {
  try {
    const sa = JSON.parse(context.env.VERTEX_SA_KEY || "{}");
    if (!sa.private_key) return err({ error: "VERTEX_SA_KEY 未配置（Cloudflare secret）" }, 500);

    const region = context.env.GCP_REGION || "us-central1";
    const model = context.env.GEMINI_MODEL || "gemini-2.5-pro";
    const token = await getAccessToken(sa);
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${region}/publishers/google/models/${model}:generateContent`;

    // Forward the raw body bytes (the browser-built generateContent payload).
    const buf = await context.request.arrayBuffer();
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: buf,
    });
    return new Response(r.body, { status: r.status, headers: { "Content-Type": "application/json", ...CORS } });
  } catch (e) {
    return err({ error: String((e && e.message) || e) }, 500);
  }
}
