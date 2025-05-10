# discord-controller-command-bot

This repository contains a Discord bot project with both Node.js and Go codebases. The bot acts as a controller to start, stop, and list other bots via Discord commands.

## Project Structure

- `node/` - Node.js implementation of the Discord controller command bot.
- `go/` - Go implementation of the Discord controller command bot.

Each folder contains its own README and setup instructions.

## Prerequisites

- [Node.js](https://nodejs.org/) (for the Node.js implementation)
- [Go](https://golang.org/) (for the Go implementation)
- A Discord bot token ([how to create a bot](https://discord.com/developers/applications))
- Endpoints for the bots you want to control (must support `/on` and `/off` POST endpoints)

## Setup

### Node.js

1. Navigate to the `node/` directory:
   ```sh
   cd node
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set environment variables:
   - `DISCORD_BOT_TOKEN`: Your Discord bot token
   - `DISCORD_BOT_URL`: The endpoint URL for your reasoning bot

4. Start the bot:
   ```sh
   npm start
   ```

### Go

1. Navigate to the `go/` directory:
   ```sh
   cd go
   ```
2. Set environment variables:
   - `DISCORD_BOT_TOKEN`: Your Discord bot token
   - `DISCORD_BOT_URL`: The endpoint URL for your reasoning bot

3. Build and run the bot:
   ```sh
   go run main.go
   ```

## Usage

In your Discord server, use the following commands:

- `!startbot <botname>`: Start a bot by name
- `!stopbot <botname>`: Stop a bot by name
- `!listbots`: List available bots

Example:
```
!startbot reasoning
!stopbot assistant
!listbots
```

## Notes

- The controller bot expects the controlled bots to expose `/on` and `/off` endpoints that accept POST requests.
- You can add more bots by editing the endpoints in the respective codebases.

See the respective `node/` or `go/` directories for more details and advanced configuration.

