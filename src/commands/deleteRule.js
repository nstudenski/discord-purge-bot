import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { deactivateRule } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('delete-rule')
  .setDescription('Deactivate a deletion rule and cancel its pending deletions')
  .addIntegerOption((option) =>
    option.setName('id').setDescription('Rule ID from /list-rules').setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const ruleId = interaction.options.getInteger('id', true);
  const removed = deactivateRule(ruleId);

  await interaction.reply({
    content: removed
      ? `Rule #${ruleId} deactivated. Any of its messages already queued for deletion were cancelled.`
      : `No active rule with id #${ruleId}.`,
    ephemeral: true,
  });
}
