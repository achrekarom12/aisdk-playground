# AI SDK Playground

An interactive Terminal User Interface (TUI) for interacting with AI agents, built with Vercel's AI SDK. Chat with AI models directly from your terminal with persistent conversation history.

## Features

- 🤖 Interactive terminal-based chat interface
- 💾 Persistent chat history using LibSQL database
- 🔄 Support for multiple AI providers (Google, OpenAI)
- 📝 Conversation management with unique chat IDs
- 🎭 **Agent Blueprints**: A catalog of pre-defined AI roles and personas in `agents.md`
- ⚡ Built with TypeScript for type safety

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

## Configuration

Create a `.env` file in the root directory and add your API key:

```env
GOOGLE_API_KEY=your_google_api_key_here
OPEN_API_KEY=your_openai_api_key_here
```

## Usage

```bash
# Start the interactive TUI
npm start

# Or use dev mode
npm run dev
```

## Tech Stack

- **AI SDK**: Vercel AI SDK for AI model integration
- **Database**: LibSQL for chat history storage
- **Runtime**: Node.js with TypeScript
- **UI**: Terminal-based interface using readline