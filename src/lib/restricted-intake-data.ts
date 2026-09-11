export type RestrictedIntakeReason =
  | "SSN_LIKE_VALUE"
  | "PAYMENT_CARD_LIKE_VALUE"
  | "BANK_ROUTING_LIKE_VALUE"
  | "BANK_ACCOUNT_LIKE_VALUE"
  | "DRIVER_LICENSE_LIKE_VALUE";

export type RestrictedIntakeField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "budgetRange"
  | "tradeIn"
  | "notes"
  | "source";

export type RestrictedIntakeFinding = {
  field: RestrictedIntakeField;
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
  const explicitlyFormatted = /(?:^|\D)\d{3}[- ]\d{2}[- ]\d{4}(?:\D|$)/.test(text);
  if (explicitlyFormatted) return true;

  return /\b(?:ssn|social\s+security(?:\s+number)?)\b\s*(?:(?:number|no\.?)\s*)?(?:#|:|is)?\s*\d{9}\b/i.test(text);
}

function containsRoutingLikeValue(text: string) {
  return /\b(?:routing|aba)(?:\s+(?:number|no\.?))?\s*(?:#|:|is)?\s*\d{9}\b/i.test(text);
}

function containsBankAccountLikeValue(text: string) {
  return /\b(?:bank\s+account|account\s+(?:number|no\.?))\s*(?:#|:|is)?\s*\d{6,17}\b/i.test(text);
}

function containsDriverLicenseLikeValue(text: string) {
  return /\b(?:driver'?s?\s+license|dl)\s*(?:number|no\.?|#|:|is)\s*[A-Z0-9][A-Z0-9-]{4,19}\b/i.test(text);
}

export function findRestrictedIntakeData(input: Partial<Record<RestrictedIntakeField, string>>): RestrictedIntakeFinding[] {
  const findings: RestrictedIntakeFinding[] = [];
  const fields: RestrictedIntakeField[] = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "budgetRange",
    "tradeIn",
    "notes",
    "source",
  ];

  for (const field of fields) {
    const text = input[field]?.trim() ?? "";
    if (!text) continue;

    if (containsSsnLikeValue(text)) {
      findings.push({ field, reason: "SSN_LIKE_VALUE" });
    }
    if (containsPaymentCardLikeValue(text)) {
      findings.push({ field, reason: "PAYMENT_CARD_LIKE_VALUE" });
    }
    if (containsRoutingLikeValue(text)) {
      findings.push({ field, reason: "BANK_ROUTING_LIKE_VALUE" });
    }
    if (containsBankAccountLikeValue(text)) {
      findings.push({ field, reason: "BANK_ACCOUNT_LIKE_VALUE" });
    }
    if (containsDriverLicenseLikeValue(text)) {
      findings.push({ field, reason: "DRIVER_LICENSE_LIKE_VALUE" });
    }
  }

  return findings;
}
