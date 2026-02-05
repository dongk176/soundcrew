import { SolapiMessageService } from "solapi";

const API_KEY = process.env.SOLAPI_API_KEY;
const API_SECRET = process.env.SOLAPI_API_SECRET;
const SENDER = (process.env.SOLAPI_SENDER_NUMBER || "").replace(/\D/g, "");

let svc: SolapiMessageService | null = null;
function client() {
  if (!svc) {
    if (!API_KEY || !API_SECRET) throw new Error("SMS_CONFIG_MISSING");
    svc = new SolapiMessageService(API_KEY, API_SECRET);
  }
  return svc!;
}

type SendOpts = { customFields?: Record<string, string> };

export async function sendSms(toDigits: string, text: string, opts?: SendOpts) {
  if (!API_KEY || !API_SECRET) throw new Error("SMS_CONFIG_MISSING");
  const to = (toDigits || "").replace(/\D/g, "");
  const from = SENDER;
  if (to.length < 10 || from.length < 10) throw new Error("INVALID_NUMBER_FORMAT");

  try {
    const payload: any = { to, from, text };
    if (opts?.customFields) payload.customFields = opts.customFields;
    return await client().send(payload);
  } catch (e: any) {
    const code =
      e?.code ||
      e?.response?.data?.error?.code ||
      e?.response?.data?.error ||
      e?.response?.status ||
      e?.message ||
      "SOLAPI_ERROR";
    console.error("[solapi.send] failed:", code, e?.response?.data || "");
    throw new Error(String(code));
  }
}
