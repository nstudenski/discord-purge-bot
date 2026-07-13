import { getBatchToDelete, removeFromQueue } from '../db.js';

const UNKNOWN_MESSAGE_ERROR_CODE = 10008;
const UNKNOWN_CHANNEL_ERROR_CODE = 10003;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deletes up to `batchSize` of the oldest queued messages, one request at a
// time with a delay in between, so the bot never bursts a lot of deletes at once.
export async function runDeleteTick(client, batchSize, interMessageDelayMs) {
  const batch = getBatchToDelete(batchSize);

  for (const row of batch) {
    try {
      const channel = await client.channels.fetch(row.channel_id);
      await channel.messages.delete(row.message_id);
      removeFromQueue(row.message_id);
    } catch (err) {
      if (err.code === UNKNOWN_MESSAGE_ERROR_CODE || err.code === UNKNOWN_CHANNEL_ERROR_CODE) {
        // Already gone (deleted by someone else, or the channel no longer exists) - nothing left to do.
        removeFromQueue(row.message_id);
      } else {
        console.error(`[deleter] failed to delete message ${row.message_id} in channel ${row.channel_id}:`, err.message);
      }
    }

    await sleep(interMessageDelayMs);
  }
}
