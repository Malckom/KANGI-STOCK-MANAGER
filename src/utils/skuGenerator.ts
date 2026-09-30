import { ProductCategory } from '../types';

export const CATEGORY_CODES: Record<string, string> = {
  Electrical: 'ELEC',
  Plumbing: 'PLM',
  'Tools & Accessories': 'TL',
  'Hardware': 'HDW',
  'Lighting': 'LGT',
  'Cables': 'CBL',
  'Paint & Building': 'PNT',
  'Experimental/New Products': 'EXP',
  'General': 'GEN',
};

// Common type mapping heuristics
export const TYPE_KEYWORDS: Array<{ match: RegExp; code: string }> = [
  { match: /cable|wire|twin|flex/i, code: 'CBL' },
  { match: /switch|socket|breaker|mcb/i, code: 'SW' },
  { match: /bulb|lamp|led|tube|floodlight|street lamp/i, code: 'BLB' },
  { match: /valve|tap|cock|bibcock/i, code: 'VLV' },
  { match: /pipe|conduit|pvc|waste/i, code: 'CND' },
  { match: /tape|thread|insulation/i, code: 'TAPE' },
  { match: /kettle/i, code: 'KTL' },
  { match: /router|modem|wifi/i, code: 'RTR' },
  { match: /dispenser/i, code: 'DSP' },
  { match: /light|snake light/i, code: 'LGT' },
  { match: /extension|strip/i, code: 'EXT' },
  { match: /cooker|stove|burner/i, code: 'CKR' },
  { match: /shower|heater/i, code: 'SHW' },
  { match: /mop|broom|bucket|clean/i, code: 'CL' },
  { match: /scale/i, code: 'SCL' },
  { match: /mirror/i, code: 'MRR' },
  { match: /pod|earbud|headphone|audio/i, code: 'AUD' },
  { match: /calc|calculator/i, code: 'CLC' },
  { match: /drill|screw|hammer|pliers|wrench|tool/i, code: 'TL' },
  { match: /fitting|elbow|tee|nipple|socket/i, code: 'FIT' },
];

/**
 * Extracts a candidate short type code from a product name
 */
export function guessTypeCode(productName: string): string {
  for (const item of TYPE_KEYWORDS) {
    if (item.match.test(productName)) {
      return item.code;
    }
  }

  // Fallback: pick first word consonants or first 3 chars
  const words = productName.trim().split(/\s+/);
  if (words.length > 0) {
    const clean = words[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return clean.slice(0, 3) || 'GEN';
  }
  return 'GEN';
}

/**
 * Extracts candidate variant code from product name or variant field
 */
export function guessVariantCode(productName: string, explicitVariant?: string): string {
  if (explicitVariant && explicitVariant.trim()) {
    return explicitVariant
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  // Look for sizes like 2.5mm, 9w, 25mm, 4t, f3, 82ms, steel, glass, large, small, armless, etc.
  const sizeMatch = productName.match(/(\d+(\.\d+)?\s*(mm|m|w|v|a|kg|g|t|inch|'|"))/i);
  if (sizeMatch) {
    return sizeMatch[0].replace(/\s+/g, '').toUpperCase();
  }

  // Check for model numbers like F3, 82ms, 1g1w
  const modelMatch = productName.match(/\b(F\d+|82ms|\d+G\d+W|4T|Astra|Ailyons|Sonar|Tenda)\b/i);
  if (modelMatch) {
    return modelMatch[0].toUpperCase();
  }

  // Check for descriptive tags
  if (/armless/i.test(productName)) return 'ARMLS';
  if (/arm/i.test(productName)) return 'ARM';
  if (/metallic|metal/i.test(productName)) return 'MET';
  if (/glass/i.test(productName)) return 'GLS';
  if (/large/i.test(productName)) return 'LRG';
  if (/small/i.test(productName)) return 'SML';
  if (/globe/i.test(productName)) return 'GLB';
  if (/snake/i.test(productName)) return 'SNK';
  if (/pods/i.test(productName)) return 'PODS';
  if (/steel/i.test(productName)) return 'STL';

  // Fallback: last word
  const words = productName.trim().split(/\s+/);
  if (words.length > 1) {
    return words[words.length - 1].replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5) || 'STD';
  }
  return 'STD';
}

/**
 * Generate standard SKU: CATEGORY-TYPE-VARIANT
 * Ensures uniqueness by checking against existing SKUs.
 */
export function generateSKU(
  category: ProductCategory,
  productName: string,
  explicitType?: string,
  explicitVariant?: string,
  existingSkus: string[] = []
): string {
  const catCode = CATEGORY_CODES[category] || 'GEN';
  const typeCode = (explicitType && explicitType.trim() ? explicitType.trim().toUpperCase() : guessTypeCode(productName)).slice(0, 4);
  const variantCode = (explicitVariant && explicitVariant.trim() ? explicitVariant.trim().toUpperCase() : guessVariantCode(productName, explicitVariant)).slice(0, 6);

  const baseSku = `${catCode}-${typeCode}-${variantCode}`.replace(/[^A-Z0-9-]/g, '');

  if (!existingSkus.includes(baseSku)) {
    return baseSku;
  }

  // Append sequential number if exists
  let counter = 2;
  while (existingSkus.includes(`${baseSku}-${counter}`)) {
    counter++;
  }
  return `${baseSku}-${counter}`;
}
