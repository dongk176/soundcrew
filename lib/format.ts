export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);

export const formatDday = (deadline: string) => {
  const end = new Date(deadline).getTime();
  const now = new Date().getTime();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "D-day";
  return `D-${diff}`;
};

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(date));
