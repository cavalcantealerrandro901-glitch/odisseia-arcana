function parseNumberInput(input) {
  if (typeof input === 'number') return input;
  if (!input) return NaN;

  // Remove pontos de milhares (ex: 344.234.543m vira 344234543m) e converte vírgula para ponto
  let cleanInput = input.toString().replace(/\./g, '').replace(',', '.').toLowerCase().trim();

  const regex = /^([\d.]+)([kmbt])?$/;
  const match = cleanInput.match(regex);

  if (!match) return NaN;

  const num = parseFloat(match[1]);
  const suffix = match[2];

  if (isNaN(num)) return NaN;

  switch (suffix) {
    case 'k': return Math.round(num * 1_000);
    case 'm': return Math.round(num * 1_000_000);
    case 'b': return Math.round(num * 1_000_000_000);
    case 't': return Math.round(num * 1_000_000_000_000);
    default: return Math.round(num);
  }
}

module.exports = { parseNumberInput };
