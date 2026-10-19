const currencyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 14);

export function normalizeBRLCurrency(value: string): string {
  const digits = currencyDigits(value);
  return digits ? (Number(digits) / 100).toFixed(2) : "";
}

export function formatBRLCurrency(value: string): string {
  const digits = currencyDigits(value);
  if (!digits) return "";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(digits) / 100);
}
