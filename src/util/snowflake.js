const DISCORD_EPOCH = 1420070400000n;

// Converts a JS timestamp (ms since Unix epoch) into a Discord snowflake ID
// usable as a `before` cursor to fetch messages older than that moment.
export function timestampToSnowflake(timestampMs) {
  const ms = BigInt(Math.max(0, Math.floor(timestampMs)));
  return ((ms - DISCORD_EPOCH) << 22n).toString();
}
