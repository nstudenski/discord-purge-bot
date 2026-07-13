import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { listActiveRules } from '../db.js';
import { formatRetentionHours } from '../util/duration.js';

export const data = new SlashCommandBuilder()
  .setName('list-rules')
  .setDescription('List active message-deletion rules')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const rules = listActiveRules();

  if (rules.length === 0) {
    await interaction.reply({ content: 'No active rules. Use /create-rule to add one.', ephemeral: true });
    return;
  }

  const lines = rules.map((rule) => {
    const channels = rule.channelIds.map((id) => `<#${id}>`).join(', ');
    return `#${rule.id} "${rule.name}" — ${formatRetentionHours(rule.retention_hours)} — ${channels}`;
  });

  await interaction.reply({ content: lines.join('\n'), ephemeral: true });
}
