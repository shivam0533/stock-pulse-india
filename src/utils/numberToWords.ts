/**
 * English number-to-words conversion for Voice Notifications
 * (SpeechSynthesis reads spelled-out numbers far more reliably and
 * consistently across browsers/voices than raw digits).
 */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones > 0 ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
}

function threeDigitWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} hundred`);
  if (rest > 0) parts.push(twoDigitWords(rest));
  return parts.join(' ');
}

/** Whole-number to words using Indian scale grouping (thousand / lakh / crore). */
export function integerToWords(value: number): string {
  let n = Math.round(Math.abs(value));
  if (n === 0) return 'zero';

  const crore = Math.floor(n / 1_00_00_000); n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000); n %= 1_00_000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const rest = n;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${threeDigitWords(crore)} crore`);
  if (lakh > 0) parts.push(`${twoDigitWords(lakh)} lakh`);
  if (thousand > 0) parts.push(`${twoDigitWords(thousand)} thousand`);
  if (rest > 0) parts.push(threeDigitWords(rest));

  return parts.join(' ');
}

/** e.g. 26.11 -> "twenty six point one one" (each decimal digit spoken separately). */
export function decimalToWords(value: number, decimals = 2): string {
  const rounded = Math.abs(value).toFixed(decimals);
  const [intPart, fracPart] = rounded.split('.');
  const intWords = integerToWords(Number(intPart));
  if (!fracPart || Number(fracPart) === 0) return intWords;
  const fracWords = fracPart.split('').map((d) => ONES[Number(d)]).join(' ');
  return `${intWords} point ${fracWords}`;
}

/** Spells an option side ("CE"/"PE") letter-by-letter so TTS doesn't read it as a word. */
export function letterByLetter(text: string): string {
  return text.split('').join(' ');
}
