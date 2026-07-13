import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { createRule } from '../db.js';
import { parseRetentionToHours, formatRetentionHours } from '../util/duration.js';

const MIN_RETENTION_HOURS = 1;
const CHANNEL_REF_PATTERN = /<#(\d+)>|(\d{17,20})/g;

export const data = new SlashCommandBuilder()
  .setName('create-rule')
  .setDescription('Create a deletion rule: messages older than the retention period get deleted')
  .addStringOption((option) =>
    option.setName('name').setDescription('A short label for this rule').setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('retention')
      .setDescription('e.g. 6h, 180d, 26w, 6mo, 1y (must be more than 1 hour)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('channels')
      .setDescription('Channels to apply this rule to, e.g. #general #logs')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const name = interaction.options.getString('name', true);
  const retentionInput = interaction.options.getString('retention', true);
  const channelsInput = interaction.options.getString('channels', true);

  const retentionHours = parseRetentionToHours(retentionInput);
  if (retentionHours === null) {
    await interaction.reply({
      content: `Couldn't parse retention "${retentionInput}". Try formats like 6h, 180d, 26w, 6mo, or 1y.`,
      ephemeral: true,
    });
    return;
  }
  if (retentionHours <= MIN_RETENTION_HOURS) {
    await interaction.reply({
      content: `This bot only supports retention periods longer than ${MIN_RETENTION_HOURS} hour.`,
      ephemeral: true,
    });
    return;
  }

  const channelIds = [...channelsInput.matchAll(CHANNEL_REF_PATTERN)].map((m) => m[1] ?? m[2]);
  const uniqueChannelIds = [...new Set(channelIds)];

  const resolvedChannels = uniqueChannelIds
    .map((id) => interaction.guild.channels.cache.get(id))
    .filter((channel) => channel && channel.type === ChannelType.GuildText);

  if (resolvedChannels.length === 0) {
    await interaction.reply({
      content: 'No valid text channels found in "channels". Mention them like #general or paste channel IDs.',
      ephemeral: true,
    });
    return;
  }

  const ruleId = createRule(name, retentionHours, resolvedChannels.map((c) => c.id));

  await interaction.reply({
    content: `Created rule #${ruleId} "${name}": messages older than ${formatRetentionHours(retentionHours)} will be deleted from ${resolvedChannels.join(', ')}.`,
    ephemeral: true,
  });
}
