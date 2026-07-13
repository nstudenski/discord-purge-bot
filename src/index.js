import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { getConfig } from './db.js';
import { runPollOnce } from './jobs/poller.js';
import { runDeleteTick } from './jobs/deleter.js';

import * as setupCommand from './commands/setup.js';
import * as createRuleCommand from './commands/createRule.js';
import * as listRulesCommand from './commands/listRules.js';
import * as deleteRuleCommand from './commands/deleteRule.js';
import * as queueStatusCommand from './commands/queueStatus.js';

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_HOURS ?? 24) * 60 * 60 * 1000;
const DELETE_INTERVAL_MS = Number(process.env.DELETE_INTERVAL_MINUTES ?? 5) * 60 * 1000;
const DELETE_BATCH_SIZE = Number(process.env.DELETE_BATCH_SIZE ?? 5);
const DELETE_INTER_MESSAGE_DELAY_MS = Number(process.env.DELETE_INTER_MESSAGE_DELAY_MS ?? 1000);

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const commands = new Collection();
for (const command of [setupCommand, createRuleCommand, listRulesCommand, deleteRuleCommand, queueStatusCommand]) {
  commands.set(command.data.name, command);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const body = commands.map((command) => command.data.toJSON());

  for (const guild of client.guilds.cache.values()) {
    try {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body });
      console.log(`Registered commands for guild ${guild.id}`);
    } catch (err) {
      console.error(`Failed to register commands for guild ${guild.id}:`, err.message);
    }
  }

  const poll = () => runPollOnce(client).catch((err) => console.error('[poller] error:', err));
  const deleteTick = () =>
    runDeleteTick(client, DELETE_BATCH_SIZE, DELETE_INTER_MESSAGE_DELAY_MS).catch((err) =>
      console.error('[deleter] error:', err)
    );

  poll();
  setInterval(poll, POLL_INTERVAL_MS);
  setInterval(deleteTick, DELETE_INTERVAL_MS);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  const config = getConfig();

  if (command.data.name !== 'setup') {
    if (!config) {
      await interaction.reply({ content: 'Run /setup in this channel first.', ephemeral: true });
      return;
    }
    if (interaction.channelId !== config.command_channel_id) {
      await interaction.reply({
        content: `Please use <#${config.command_channel_id}> for bot commands.`,
        ephemeral: true,
      });
      return;
    }
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[command:${interaction.commandName}] error:`, err);
    const payload = { content: 'Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
