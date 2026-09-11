export type RestrictedIntakeReason =
  | "SSN_LIKE_VALUE"
  | "PAYMENT_CARD_LIKE_VALUE"
  | "BANK_ROUTING_LIKE_VALUE"
  | "BANK_ACCOUNT_LIKE_VALUE"
  | "DRIVER_LICENSE_LIKE_VALUE";

export type RestrictedIntakeFinding = {
  field: "tradeIn" | "notes";
  reason: RestrictedIntakeReason;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isLuhnValid(value: string) {
  const digits = digitsOnly(value);
  if (digits.length < 13 || digits.length > 19) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function containsPaymentCardLikeValue(text: string) {
  const candidates = text.match(/(?:\d[ -]?){13,19}/g) ?? [];
  return candidates.some(isLuhnValid);
}

function containsSsnLikeValue(text: string) {
  return /(?:^|\D)\d{3}[- ]?\d{2}[- ]?\d{4}(?:\D|$)/.test(text);
}

function containsContextualDigits(text: string, keyword: RegExp, digitPattern: RegExp) {
  return keyword.test(text) && digitPattern.test(text);
}

export function findRestrictedIntakeData(input: {
  tradeIn?: string;
  notes?: string;
}): RestrictedIntakeFinding[] {
  const findings: RestrictedIntakeFinding[] = [];

  for (const field of ["tradeIn", "notes"] as const) {
    const text = input[field]?.trim() ?? "";
    if (!text) continue;

    if (containsSsnLikeValue(text)) {
      findings.push({ field, reason: "SSN_LIKE_VALUE" });
    }
    if (containsPaymentCardLikeValue(text)) {
      findings.push({ field, reason: "PAYMENT_CARD_LIKE_VALUE" });
    }
    if (
      containsContextualDigits(
        text,
        /\b(?:routing|aba)\b/i,
        /(?:^|\D)\d{9}(?:\D|$)/,
      )
    ) {
      findings.push({ field, reason: "BANK_ROUTING_LIKE_VALUE" });
    }
    if (
      containsContextualDigits(
        text,
        /\b(?:bank\s+account|account\s+(?:number|no\.?))\b/i,
        /(?:^|\D)\d{6,17}(?:\D|$)/,
      )
    ) {
      findings.push({ field, reason: "BANK_ACCOUNT_LIKE_VALUE" });
    }
    if (
      /\b(?:driver'?s?\s+license|dl\s*(?:number|no\.?))\b/i.test(text) &&
      /\b[A-Z0-9][A-Z0-9 -]{4,19}\b/i.test(text)
    ) {
      findings.push({ field, reason: "DRIVER_LICENSE_LIKE_VALUE" });
    }
  }

  return findings;
}
