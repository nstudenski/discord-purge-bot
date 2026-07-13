const UNIT_HOURS = {
  h: 1,
  d: 24,
  w: 24 * 7,
  mo: 24 * 30,
  y: 24 * 365,
};

// Parses strings like "6h", "180d", "26w", "6mo", "1y" into a number of hours.
// Returns null if the input doesn't match a supported format.
export function parseRetentionToHours(input) {
  const match = String(input)
    .trim()
    .match(/^(\d+)\s*(h(?:ours?|r)?|d(?:ays?)?|w(?:eeks?)?|mo(?:nths?)?|y(?:ears?)?)$/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const rawUnit = match[2].toLowerCase();
  const unitKey = rawUnit.startsWith('mo') ? 'mo' : rawUnit[0];

  const hoursPerUnit = UNIT_HOURS[unitKey];
  if (!hoursPerUnit) return null;

  return amount * hoursPerUnit;
}

// Renders an hour count back as whole days when it divides evenly (true for
// every d/w/mo/y input, since those units are all multiples of 24 hours).
export function formatRetentionHours(hours) {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
