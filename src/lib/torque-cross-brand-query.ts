/**
 * Read-only model comparison research parser. This does not identify a VIN.
 */
const MAKE = "(Nissan|Toyota|Honda|Hyundai|Kia|Ford|Chevrolet|Mazda|Subaru|Jeep|Volkswagen|BMW|Lexus|Acura|GMC|Buick|Mitsubishi|Volvo)";
export function parseExplicitEpaComparison(text: string): Array<{year:number;make:string;model:string}> {
  const re = new RegExp(
    "\\b(?:compare|comparison of)\\s+(20\\d{2})\\s+" + MAKE +
    "\\s+([a-z0-9][a-z0-9-]{1,24})\\s+(?:vs\\.?|versus|and|with)\\s+" +
    "(20\\d{2})\\s+" + MAKE + "\\s+([a-z0-9][a-z0-9-]{1,24})\\b", "i");
  const m = text.match(re);
  return m ? [
    {year:Number(m[1]),make:m[2],model:m[3]},
    {year:Number(m[4]),make:m[5],model:m[6]},
  ] : [];
}
