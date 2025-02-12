import { Client, Message, GatewayIntentBits, TextChannel } from 'discord.js'

// Define interfaces for bot configuration
interface BotEndpoint {
  name: string
  url: string
}

interface BotConfig {
  intents: GatewayIntentBits[]
}

// Configure your bot endpoints
const BOT_ENDPOINTS: BotEndpoint[] = [
  // Here I'm adding enpoints for bots deployed on hosting
  {
    name: 'reasoning',
    url: process.env.DISCORD_BOT_URL || '' // env variable
  },
  {
    name: 'assistant',
    url: 'https://your-assistant-bot-url.com/bot' // env variable
  }
  // Add more bots as needed
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
  console.log(`Controller Bot logged in as ${client.user?.tag}`)
  console.log('Available bots:', BOT_ENDPOINTS.map((bot) => bot.name).join(', '))
})

// Helper function to find bot endpoint
const findBotEndpoint = (botName: string): BotEndpoint | undefined => {
  return BOT_ENDPOINTS.find((bot) => bot.name.toLowerCase() === botName.toLowerCase())
}

// Helper function to send message
const sendMessage = async (channel: TextChannel, message: string) => {
  try {
    await channel.send(message)
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

// Helper function to control bot
const controlBot = async (
  botEndpoint: BotEndpoint,
  action: 'on' | 'off',
  channel: TextChannel
): Promise<void> => {
  const url = `${botEndpoint.url}/${action}`

  try {
    const response: Response = await fetch(url, { method: 'POST' })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const result: string = await response.text()
    await sendMessage(channel, result)
  } catch (error) {
    console.error('Error:', error)
    await sendMessage(channel, `Failed to ${action} ${botEndpoint.name} bot.`)
  }
}

// Event handler for message creation
client.on('messageCreate', async (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return

  // Parse the message content
  const args: string[] = message.content.split(' ')
  const command: string | undefined = args.shift()?.toLowerCase()

  // Handle commands
  if (!message.channel.isTextBased()) return
  const textChannel = message.channel as TextChannel

  switch (command) {
    case '!startbot':
    case '!stopbot': {
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
      break
    }

    case '!listbots': {
      const botList = BOT_ENDPOINTS.map((bot) => bot.name).join(', ')
      await sendMessage(textChannel, `Available bots: ${botList}`)
      break
    }
  }
})

// Login with the bot token
client.login(`Bot ${process.env.DISCORD_BOT_TOKEN}`) // env variable
