import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { setConfig } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('One-time setup: designate this server\'s bot command channel')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel this bot will use for commands and notifications')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel', true);

  setConfig(interaction.guildId, channel.id);

  await interaction.reply({
    content: `Setup complete. I'll operate out of ${channel} from now on — use /create-rule, /list-rules, /delete-rule, and /queue-status there.`,
    ephemeral: true,
  });

  if (channel.id !== interaction.channelId) {
    await channel.send(
      "This channel is now configured for message-retention bot commands. Use /create-rule to set up a deletion policy."
    );
  }
}
