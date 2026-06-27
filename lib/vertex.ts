import { GoogleAuth } from "google-auth-library";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const REGION = process.env.GCP_REGION || "us-central1";

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "缺少环境变量 GOOGLE_SERVICE_ACCOUNT_KEY（Vertex service account JSON）。"
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    // Allow base64-encoded JSON as a fallback (avoids newline issues in env UIs)
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  }
}

let authClient: GoogleAuth | null = null;
function auth(): GoogleAuth {
  if (!authClient) {
    authClient = new GoogleAuth({
      credentials: getCredentials(),
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  return authClient;
}

function projectId(): string {
  return process.env.GCP_PROJECT || getCredentials().project_id;
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * Call Gemini on Vertex AI. Forces JSON output and returns the parsed object.
 */
export async function geminiJSON(
  systemPrompt: string,
  parts: GeminiPart[]
): Promise<any> {
  const token = await auth().getAccessToken();
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 65535,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vertex Gemini error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text: string | undefined = cand?.content?.parts
    ?.map((p: any) => p.text || "")
    .join("");
  const reason = cand?.finishReason;
  if (!text) {
    throw new Error(`Gemini 未返回内容 (finishReason=${reason || "unknown"})`);
  }
  if (reason === "MAX_TOKENS") {
    throw new Error("本轮输出过长被截断，请减少段落或重试。");
  }
  try {
    return JSON.parse(text);
  } catch {
    // Strip code fences if the model wrapped the JSON
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  }
}
