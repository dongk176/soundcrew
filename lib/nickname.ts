export function normalizeNickname(s: string) {
  return (s || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}
export function nicknameKeyOf(s: string) {
  const n = normalizeNickname(s);
  return n ? n.toLowerCase() : "";
}
export function isValidNickname(s: string) {
  const n = normalizeNickname(s);
  return /^[\p{L}\p{N} _.\-]{2,20}$/u.test(n);
}
