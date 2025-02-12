package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/bwmarrin/discordgo"
)

// BotEndpoint represents a bot configuration
type BotEndpoint struct {
	Name string
	URL  string
}

// Global variables
var (
	botEndpoints = []BotEndpoint{
		{
			Name: "reasoning",
			URL:  os.Getenv("DISCORD_BOT_URL"),
		},
		{
			Name: "assistant",
			URL:  "https://your-assistant-bot-url.com/bot", // example url
		},
	}
)

func findBotEndpoint(botName string) *BotEndpoint {
	for _, bot := range botEndpoints {
		if strings.EqualFold(bot.Name, botName) {
			return &bot
		}
	}
	return nil
}

func sendMessage(s *discordgo.Session, channelID string, message string) error {
	_, err := s.ChannelMessageSend(channelID, message)
	if err != nil {
		log.Printf("Error sending message: %v", err)
		return err
	}
	return nil
}

func controlBot(botEndpoint *BotEndpoint, action string, s *discordgo.Session, channelID string) error {
	url := fmt.Sprintf("%s/%s", botEndpoint.URL, action)

	resp, err := http.Post(url, "application/json", nil)
	if err != nil {
		errMsg := fmt.Sprintf("Failed to %s %s bot.", action, botEndpoint.Name)
		sendMessage(s, channelID, errMsg)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errMsg := fmt.Sprintf("HTTP error! Status: %d", resp.StatusCode)
		sendMessage(s, channelID, errMsg)
		return fmt.Errorf("%s", errMsg)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	return sendMessage(s, channelID, string(body))
}

func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Ignore messages from bots
	if m.Author.Bot {
		return
	}

	// Parse the message content
	args := strings.Split(m.Content, " ")
	if len(args) == 0 {
		return
	}

	command := strings.ToLower(args[0])

	switch command {
	case "!startbot", "!stopbot":
		if len(args) < 2 {
			botList := make([]string, len(botEndpoints))
			for i, bot := range botEndpoints {
				botList[i] = bot.Name
			}
			sendMessage(s, m.ChannelID, "Please specify the bot name. Available bots: "+
				strings.Join(botList, ", "))
			return
		}

		botName := args[1]
		botEndpoint := findBotEndpoint(botName)
		if botEndpoint == nil {
			botList := make([]string, len(botEndpoints))
			for i, bot := range botEndpoints {
				botList[i] = bot.Name
			}
			sendMessage(s, m.ChannelID, fmt.Sprintf("Bot \"%s\" not found. Available bots: %s",
				botName, strings.Join(botList, ", ")))
			return
		}

		action := "on"
		if command == "!stopbot" {
			action = "off"
		}

		if err := controlBot(botEndpoint, action, s, m.ChannelID); err != nil {
			log.Printf("Error controlling bot: %v", err)
		}

	case "!listbots":
		botList := make([]string, len(botEndpoints))
		for i, bot := range botEndpoints {
			botList[i] = bot.Name
		}
		sendMessage(s, m.ChannelID, "Available bots: "+strings.Join(botList, ", "))
	}
}

func main() {
	// Create Discord session
	token := os.Getenv("DISCORD_BOT_TOKEN")
	if token == "" {
		log.Fatal("No token provided. Set DISCORD_BOT_TOKEN environment variable")
	}

	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		log.Fatal("Error creating Discord session:", err)
	}

	// Register message create handler
	dg.AddHandler(messageCreate)

	// Open websocket connection to Discord
	err = dg.Open()
	if err != nil {
		log.Fatal("Error opening connection:", err)
	}

	// Print bot information
	botList := make([]string, len(botEndpoints))
	for i, bot := range botEndpoints {
		botList[i] = bot.Name
	}
	log.Printf("Controller Bot logged in as %s", dg.State.User.Username)
	log.Printf("Available bots: %s", strings.Join(botList, ", "))

	// Wait for interrupt signal
	fmt.Println("Bot is running. Press CTRL-C to exit.")
	select {}
}
