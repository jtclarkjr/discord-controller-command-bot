import { Client, Message, GatewayIntentBits, TextChannel } from 'discord.js'

// Define interfaces for bot configuration and status
interface BotEndpoint {
  name: string
  url: string
  isRunning?: boolean
}

interface BotConfig {
  intents: GatewayIntentBits[]
}

// Logger utility
const log = (message: string) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`)
}

// Configure your bot endpoints
const BOT_ENDPOINTS: BotEndpoint[] = [
  {
    name: 'reasoning',
    url: process.env.DISCORD_BOT_URL || '',
    isRunning: false
  },
  {
    name: 'assistant',
    url: 'https://your-assistant-bot-url.com/bot',
    isRunning: false
  }
]

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
} as BotConfig)

// Event handler for when the bot is ready
client.on('ready', () => {
  log(`Controller Bot logged in as ${client.user?.tag}`)
  log('Available bots: ' + BOT_ENDPOINTS.map((bot) => bot.name).join(', '))
})

// Helper function to find bot endpoint
const findBotEndpoint = (botName: string): BotEndpoint | undefined => {
  return BOT_ENDPOINTS.find((bot) => bot.name.toLowerCase() === botName.toLowerCase())
}

// Helper function to send message
const sendMessage = async (channel: TextChannel, message: string) => {
  try {
    await channel.send(message)
    log(`Message sent to channel ${channel.name}: ${message}`)
  } catch (error) {
    log(`Error sending message: ${error}`)
  }
}

// Helper function to control bot
const controlBot = async (
  botEndpoint: BotEndpoint,
  action: 'on' | 'off',
  channel: TextChannel,
  silent: boolean = false
): Promise<boolean> => {
  const url = `${botEndpoint.url}/${action}`
  try {
    log(`Attempting to ${action} ${botEndpoint.name} bot`)
    const response: Response = await fetch(url, { method: 'POST' })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const result: string = await response.text()
    // Only log to console, don't send to Discord if silent is true
    if (!silent) {
      await sendMessage(channel, result)
    }

    // Update bot status
    botEndpoint.isRunning = action === 'on'
    log(`Successfully ${action} ${botEndpoint.name} bot. Response: ${result}`)
    return true
  } catch (error) {
    log(`Error ${action} ${botEndpoint.name} bot: ${error}`)
    if (!silent) {
      await sendMessage(channel, `Failed to ${action} ${botEndpoint.name} bot.`)
    }
    return false
  }
}

// Helper function to ensure reasoning bot is running and process initial input
const ensureReasoningBotRunning = async (
  channel: TextChannel,
  _initialMessage?: Message
): Promise<boolean> => {
  const reasoningBot = findBotEndpoint('reasoning')
  if (!reasoningBot) {
    log('Reasoning bot not found in endpoints')
    return false
  }

  if (!reasoningBot.isRunning) {
    log('Reasoning bot not running, attempting to start')
    const success = await controlBot(reasoningBot, 'on', channel, true)
    if (success) {
      log('Bot started successfully, waiting for startup...')
      // Wait a bit for the bot to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return true
    }
    return false
  }
  return true
}

// Event handler for message creation
client.on('messageCreate', async (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return

  // Parse the message content
  const args: string[] = message.content.split(' ')
  const command: string | undefined = args.shift()?.toLowerCase()

  if (!message.channel.isTextBased()) return
  const textChannel = message.channel as TextChannel

  // Log incoming message
  log(`Received message: ${message.content}`)

  // Handle explicit bot control commands
  if (command === '!startbot' || command === '!stopbot') {
    const botName = args[0]
    if (!botName) {
      await sendMessage(
        textChannel,
        'Please specify the bot name. Available bots: ' +
          BOT_ENDPOINTS.map((bot) => bot.name).join(', ')
      )
      return
    }

    const botEndpoint = findBotEndpoint(botName)
    if (!botEndpoint) {
      await sendMessage(
        textChannel,
        `Bot "${botName}" not found. Available bots: ` +
          BOT_ENDPOINTS.map((bot) => bot.name).join(', ')
      )
      return
    }

    const action = command === '!startbot' ? 'on' : 'off'
    await controlBot(botEndpoint, action, textChannel)
  }
  // Handle !listbots command
  else if (command === '!listbots') {
    const botList = BOT_ENDPOINTS.map(
      (bot) => `${bot.name} (${bot.isRunning ? 'running' : 'stopped'})`
    ).join(', ')
    await sendMessage(textChannel, `Available bots: ${botList}`)
  }
  // For any other message, handle the reasoning bot logic
  else {
    const reasoningBot = findBotEndpoint('reasoning')
    if (!reasoningBot) {
      log('Reasoning bot not found in endpoints')
      return
    }

    if (!reasoningBot.isRunning) {
      // Use the ensureReasoningBotRunning helper to start the bot and process initial message
      const success = await ensureReasoningBotRunning(textChannel, message)
      if (!success) {
        log('Failed to start reasoning bot or process initial message')
      }
    }
    // If bot is already running, the webhook/event will handle the message automatically
  }
})

// Login with the bot token
client
  .login(`Bot ${process.env.DISCORD_BOT_TOKEN}`)
  .then(() => {
    log('Bot login initiated')
  })
  .catch((error) => {
    log(`Login error: ${error}`)
  })
