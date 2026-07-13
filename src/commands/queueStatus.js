import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { queueCount, queueCountByRule } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('queue-status')
  .setDescription('Show how many messages are currently queued for deletion')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const total = queueCount();
  const byRule = queueCountByRule();

  const lines = [`Total messages queued for deletion: ${total}`];
  for (const row of byRule) {
    lines.push(`  #${row.rule_id} "${row.name}": ${row.count}`);
  }

  await interaction.reply({ content: lines.join('\n'), ephemeral: true });
}
