import { SolapiMessageService } from "solapi";

const API_KEY = process.env.SOLAPI_API_KEY;
const API_SECRET = process.env.SOLAPI_API_SECRET;
const SENDER = (process.env.SOLAPI_SENDER_NUMBER || "").replace(/\D/g, "");
const PFID = process.env.SOLAPI_KAKAO_PFID || "";

let svc: SolapiMessageService | null = null;

function normalizeKrPhone(num: string) {
  const digits = (num || "").replace(/\D/g, "");
  if (digits.startsWith("82")) {
    const rest = digits.slice(2);
    return rest.startsWith("0") ? rest : `0${rest}`;
  }
  return digits;
}

function client() {
  if (!svc) {
    if (!API_KEY || !API_SECRET) {
      throw new Error("ALIMTALK_CONFIG_MISSING");
    }
    svc = new SolapiMessageService(API_KEY, API_SECRET);
  }
  return svc!;
}

export type KakaoVars = Record<string, string>;

type SendAlimtalkOpts = {
  disableSms?: boolean;
  adFlag?: boolean;
  customFields?: Record<string, string>;
};

export async function sendAlimtalk(
  toDigits: string,
  templateId: string | undefined | null,
  variables: KakaoVars,
  opts?: SendAlimtalkOpts
) {
  if (!API_KEY || !API_SECRET || !PFID) {
    console.error("[alimtalk] config missing (API_KEY/API_SECRET/PFID)");
    return;
  }
  if (!templateId) {
    console.warn("[alimtalk] templateId missing, skip send");
    return;
  }

  const to = normalizeKrPhone(toDigits);
  const from = SENDER;

  if (to.length < 10) {
    console.error("[alimtalk] invalid to number:", toDigits);
    return;
  }
  if (!from || from.length < 9) {
    console.error("[alimtalk] invalid sender number (SOLAPI_SENDER_NUMBER)");
    return;
  }

  const payload: any = {
    to,
    from,
    kakaoOptions: {
      pfId: PFID,
      templateId,
      variables,
      disableSms: opts?.disableSms ?? false,
      adFlag: opts?.adFlag ?? false
    }
  };

  if (opts?.customFields) {
    payload.customFields = opts.customFields;
  }

  try {
    await client().send(payload);
  } catch (e: any) {
    const data = e?.response?.data;
    console.error("[alimtalk.send] failed", data || e);
  }
}
