# discord-retention-bot

Deletes messages from chosen channels once they're older than a configurable
retention period (e.g. 6 months). Only stores message IDs and timestamps
needed to schedule deletion — never message content.

## 1. Create the Discord application

1. Go to https://discord.com/developers/applications and click **New Application**.
2. Under **Bot**, click **Reset Token** and copy the token (this is your `DISCORD_TOKEN`).
3. No privileged intents are needed — this bot only uses slash commands.
4. Under **OAuth2 > URL Generator**, select scopes `bot` and `applications.commands`,
   and bot permissions: **View Channel**, **Send Messages**, **Read Message History**,
   **Manage Messages**. Open the generated URL and invite the bot to your server.

## 2. Configure

```
cp .env.example .env
# edit .env and set DISCORD_TOKEN
```

## 3. Run

```
npm install
npm start
```

In Discord, run `/setup channel:#your-command-channel` once (requires the
"Manage Server" permission). After that, all commands must be run in that
channel:

- `/create-rule name:<label> retention:<6h|180d|26w|6mo|1y> channels:<#a #b #c>` —
  create a rule. Retention must be more than 1 hour.
- `/list-rules` — show active rules.
- `/delete-rule id:<id>` — deactivate a rule and cancel its pending deletions.
- `/queue-status` — show how many messages are currently queued for deletion.

The bot polls covered channels every 24 hours (`POLL_INTERVAL_HOURS`) for
messages older than each rule's retention period, and works through the
deletion queue in small batches every 5 minutes (`DELETE_INTERVAL_MINUTES`,
`DELETE_BATCH_SIZE`) — see `.env.example` for all tunables.

## 4. Deploy on EC2 (systemd)

```bash
# On the instance (Amazon Linux 2023 example):
sudo dnf install -y nodejs
sudo useradd --system --create-home discordbot

sudo mkdir -p /opt/discord-retention-bot
sudo cp -r . /opt/discord-retention-bot
sudo chown -R discordbot:discordbot /opt/discord-retention-bot
cd /opt/discord-retention-bot
sudo -u discordbot npm install --omit=dev

sudo cp .env.example /opt/discord-retention-bot/.env
sudo chmod 600 /opt/discord-retention-bot/.env
sudo chown discordbot:discordbot /opt/discord-retention-bot/.env
# edit /opt/discord-retention-bot/.env and set DISCORD_TOKEN

sudo cp deploy/discord-retention-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now discord-retention-bot
sudo systemctl status discord-retention-bot
```

Logs: `journalctl -u discord-retention-bot -f`

The SQLite database (`data.sqlite3`) lives alongside the code and is the only
persistent state — back it up if you want to preserve rules across a
reinstall, or just re-run `/setup` and `/create-rule` to recreate them.
