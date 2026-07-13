import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite3');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    guild_id TEXT NOT NULL,
    command_channel_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    retention_hours INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rule_channels (
    rule_id INTEGER NOT NULL REFERENCES rules(id),
    channel_id TEXT NOT NULL,
    PRIMARY KEY (rule_id, channel_id)
  );

  CREATE TABLE IF NOT EXISTS deletion_queue (
    message_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    rule_id INTEGER NOT NULL,
    discovered_at INTEGER NOT NULL
  );
`);

export function getConfig() {
  return db.prepare('SELECT * FROM config WHERE id = 1').get();
}

export function setConfig(guildId, channelId) {
  db.prepare(`
    INSERT INTO config (id, guild_id, command_channel_id) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET guild_id = excluded.guild_id, command_channel_id = excluded.command_channel_id
  `).run(guildId, channelId);
}

export function createRule(name, retentionHours, channelIds) {
  const insertRule = db.prepare(
    'INSERT INTO rules (name, retention_hours, active, created_at) VALUES (?, ?, 1, ?)'
  );
  const insertChannel = db.prepare(
    'INSERT INTO rule_channels (rule_id, channel_id) VALUES (?, ?)'
  );

  return db.transaction(() => {
    const { lastInsertRowid } = insertRule.run(name, retentionHours, Date.now());
    for (const channelId of channelIds) {
      insertChannel.run(lastInsertRowid, channelId);
    }
    return lastInsertRowid;
  })();
}

export function listActiveRules() {
  const rules = db.prepare('SELECT * FROM rules WHERE active = 1 ORDER BY id').all();
  const channelsForRule = db.prepare('SELECT channel_id FROM rule_channels WHERE rule_id = ?');
  return rules.map((rule) => ({
    ...rule,
    channelIds: channelsForRule.all(rule.id).map((r) => r.channel_id),
  }));
}

export function deactivateRule(ruleId) {
  const result = db.prepare('UPDATE rules SET active = 0 WHERE id = ? AND active = 1').run(ruleId);
  db.prepare('DELETE FROM deletion_queue WHERE rule_id = ?').run(ruleId);
  return result.changes > 0;
}

export function enqueueMessage(messageId, channelId, ruleId, discoveredAt) {
  db.prepare(`
    INSERT OR IGNORE INTO deletion_queue (message_id, channel_id, rule_id, discovered_at)
    VALUES (?, ?, ?, ?)
  `).run(messageId, channelId, ruleId, discoveredAt);
}

export function getBatchToDelete(limit) {
  return db.prepare('SELECT * FROM deletion_queue ORDER BY discovered_at ASC LIMIT ?').all(limit);
}

export function removeFromQueue(messageId) {
  db.prepare('DELETE FROM deletion_queue WHERE message_id = ?').run(messageId);
}

export function queueCount() {
  return db.prepare('SELECT COUNT(*) AS count FROM deletion_queue').get().count;
}

export function queueCountByRule() {
  return db.prepare(`
    SELECT r.id AS rule_id, r.name AS name, COUNT(q.message_id) AS count
    FROM rules r
    LEFT JOIN deletion_queue q ON q.rule_id = r.id
    WHERE r.active = 1
    GROUP BY r.id
    ORDER BY r.id
  `).all();
}
