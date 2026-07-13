import { listActiveRules, enqueueMessage } from '../db.js';
import { timestampToSnowflake } from '../util/snowflake.js';

const HOUR_MS = 60 * 60 * 1000;
const PAGE_SIZE = 100;

// Scans every channel covered by an active rule for messages older than that
// rule's retention period, and enqueues any not already queued for deletion.
export async function runPollOnce(client) {
  const rules = listActiveRules();

  for (const rule of rules) {
    const cutoffSnowflake = timestampToSnowflake(Date.now() - rule.retention_hours * HOUR_MS);

    for (const channelId of rule.channelIds) {
      try {
        await scanChannel(client, channelId, rule.id, cutoffSnowflake);
      } catch (err) {
        console.error(`[poller] failed to scan channel ${channelId} for rule #${rule.id}:`, err.message);
      }
    }
  }
}

async function scanChannel(client, channelId, ruleId, cutoffSnowflake) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) return;

  let before = cutoffSnowflake;
  const discoveredAt = Date.now();

  for (;;) {
    const batch = await channel.messages.fetch({ before, limit: PAGE_SIZE });
    if (batch.size === 0) break;

    for (const message of batch.values()) {
      enqueueMessage(message.id, channelId, ruleId, discoveredAt);
    }

    before = batch.last().id;
    if (batch.size < PAGE_SIZE) break;
  }
}
