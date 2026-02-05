import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGION =
  process.env.S3_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
const BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
const PUBLIC_BASE =
  process.env.S3_PUBLIC_BASE ||
  process.env.PUBLIC_CDN ||
  (process.env.CDN_DOMAIN ? `https://${process.env.CDN_DOMAIN}` : undefined);

if (!REGION) console.warn("[uploads/presign] Missing REGION (S3_REGION/AWS_REGION)");
if (!BUCKET) console.warn("[uploads/presign] Missing S3_BUCKET");

const s3 = new S3Client({ region: REGION! });

type Body = {
  key?: string;
  contentType?: string;
  folder?: string;
  fileName?: string;
  wantViewUrl?: boolean;
  viewTtl?: number;
};

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-ㄱ-힣 ]+/g, "_");
}
function normalizeKey(key: string) {
  return String(key || "").replace(/^\/+/, "");
}

function buildPublicUrl(key: string) {
  if (!BUCKET || !REGION) return null;
  if (PUBLIC_BASE) {
    const base = String(PUBLIC_BASE).replace(/\/$/, "");
    return `${base}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function signPutUrl(key: string, contentType = "application/octet-stream", expiresIn = 60) {
  const ct = contentType || "application/octet-stream";
  const isImage = ct.startsWith("image/");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: ct,
    ...(isImage ? { CacheControl: "public,max-age=31536000,immutable" } : {})
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

async function signGetUrl(key: string, expiresIn = 900) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function POST(req: Request) {
  try {
    if (!BUCKET) return NextResponse.json({ ok: false, error: "MISSING_S3_BUCKET" }, { status: 500 });
    if (!REGION) return NextResponse.json({ ok: false, error: "MISSING_AWS_REGION" }, { status: 500 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const wantView = !!body.wantViewUrl;
    const viewTtl = Number.isFinite(body.viewTtl) ? Number(body.viewTtl) : 900;

    if (body.key) {
      const key = normalizeKey(String(body.key));
      const ct = body.contentType?.trim() || "application/octet-stream";

      const uploadUrl = await signPutUrl(key, ct, 60);
      const publicUrl = buildPublicUrl(key);
      const viewUrl = wantView ? await signGetUrl(key, viewTtl) : null;

      return NextResponse.json({
        ok: true,
        mode: "direct",
        uploadUrl,
        publicUrl,
        viewUrl,
        key,
        bucket: BUCKET,
        region: REGION,
        contentType: ct
      });
    }

    const { folder, fileName, contentType } = body;
    if (!fileName) {
      return NextResponse.json({ ok: false, error: "MISSING_FILE_NAME" }, { status: 400 });
    }

    const safeName = sanitizeName(fileName);
    const key = normalizeKey(
      `${folder ? folder.replace(/\/+$/, "") + "/" : ""}${randomUUID()}-${safeName}`
    );
    const ct = contentType && contentType.trim() ? contentType : "application/octet-stream";

    const uploadUrl = await signPutUrl(key, ct, 60);
    const publicUrl = buildPublicUrl(key);
    const viewUrl = wantView ? await signGetUrl(key, viewTtl) : null;

    return NextResponse.json({
      ok: true,
      mode: "legacy",
      uploadUrl,
      publicUrl,
      viewUrl,
      key,
      fileName: safeName,
      bucket: BUCKET,
      region: REGION,
      contentType: ct
    });
  } catch (e: any) {
    console.error("[uploads/presign] error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "PRESIGN_FAIL" }, { status: 500 });
  }
}
