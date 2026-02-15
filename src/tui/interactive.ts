import * as readline from 'readline';
import { DatabaseService, Message } from '../db/database';
import { generateText, LanguageModel } from 'ai';

interface TUIOptions {
    model: LanguageModel;
    systemPrompt: string;
    db: DatabaseService;
    userId: string;
}

export class InteractiveTUI {
    private rl: readline.Interface;
    private model: LanguageModel;
    private systemPrompt: string;
    private db: DatabaseService;
    private userId: string;
    private currentConversationId: string | null = null;
    private isRunning: boolean = false;

    constructor(options: TUIOptions) {
        this.model = options.model;
        this.systemPrompt = options.systemPrompt;
        this.db = options.db;
        this.userId = options.userId;

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '\n\x1b[36m❯\x1b[0m ',
        });
    }

    private clearScreen(): void {
        console.clear();
    }

    private printHeader(): void {
        console.log('\x1b[1m\x1b[35m╔═══════════════════════════════════════════════════════════╗\x1b[0m');
        console.log('\x1b[1m\x1b[35m║           🤖 Vercel AISDK Agent Playground                ║\x1b[0m');
        console.log('\x1b[1m\x1b[35m╚═══════════════════════════════════════════════════════════╝\x1b[0m');
        console.log('');
        console.log(`\x1b[90mUser: ${this.userId}\x1b[0m`);
        if (this.currentConversationId) {
            console.log(`\x1b[90mConversation: ${this.currentConversationId}\x1b[0m`);
        }
        console.log('');
        console.log('\x1b[33mCommands:\x1b[0m');
        console.log('  \x1b[32m/new\x1b[0m      - Start a new conversation');
        console.log('  \x1b[32m/list\x1b[0m     - List all conversations');
        console.log('  \x1b[32m/load\x1b[0m     - Load a conversation by ID');
        console.log('  \x1b[32m/history\x1b[0m  - Show current conversation history');
        console.log('  \x1b[32m/clear\x1b[0m    - Clear the screen');
        console.log('  \x1b[32m/help\x1b[0m     - Show this help message');
        console.log('  \x1b[32m/exit\x1b[0m     - Exit the application');
        console.log('\x1b[90m' + '─'.repeat(60) + '\x1b[0m');
    }

    private async handleCommand(command: string): Promise<boolean> {
        const cmd = command.trim().toLowerCase();

        switch (cmd) {
            case '/new':
                await this.startNewConversation();
                return true;

            case '/list':
                await this.listConversations();
                return true;

            case '/load':
                await this.loadConversation();
                return true;

            case '/history':
                await this.showHistory();
                return true;

            case '/clear':
                this.clearScreen();
                this.printHeader();
                return true;

            case '/help':
                this.printHeader();
                return true;

            case '/exit':
                console.log('\n\x1b[33m👋 Goodbye!\x1b[0m\n');
                return false;

            default:
                console.log(`\x1b[31m❌ Unknown command: ${command}\x1b[0m`);
                console.log('Type \x1b[32m/help\x1b[0m to see available commands.');
                return true;
        }
    }

    private async startNewConversation(): Promise<void> {
        try {
            this.currentConversationId = await this.db.createConversation(
                this.userId,
                'tui-session',
                { source: 'terminal', started_at: new Date().toISOString() }
            );
            console.log(`\n\x1b[32m✓\x1b[0m New conversation started: \x1b[36m${this.currentConversationId}\x1b[0m`);
        } catch (error) {
            console.error(`\x1b[31m❌ Error creating conversation:\x1b[0m`, error);
        }
    }

    private async listConversations(): Promise<void> {
        try {
            const conversations = await this.db.listConversations(this.userId, 10);

            if (conversations.length === 0) {
                console.log('\n\x1b[33mNo conversations found.\x1b[0m');
                return;
            }

            console.log('\n\x1b[1m📋 Recent Conversations:\x1b[0m');
            console.log('\x1b[90m' + '─'.repeat(60) + '\x1b[0m');

            for (const conv of conversations) {
                const metadata = JSON.parse(conv.metadata);
                const isCurrent = conv.id === this.currentConversationId;
                const marker = isCurrent ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m';

                console.log(`${marker} \x1b[36m${conv.id}\x1b[0m`);
                console.log(`  \x1b[90mUpdated: ${new Date(conv.updated_at).toLocaleString()}\x1b[0m`);
                console.log('');
            }
        } catch (error) {
            console.error(`\x1b[31m❌ Error listing conversations:\x1b[0m`, error);
        }
    }

    private async loadConversation(): Promise<void> {
        return new Promise((resolve) => {
            this.rl.question('\n\x1b[33mEnter conversation ID:\x1b[0m ', async (conversationId) => {
                try {
                    const conversation = await this.db.getConversation(conversationId.trim());

                    if (!conversation) {
                        console.log(`\x1b[31m❌ Conversation not found: ${conversationId}\x1b[0m`);
                        resolve();
                        return;
                    }

                    this.currentConversationId = conversationId.trim();
                    console.log(`\n\x1b[32m✓\x1b[0m Loaded conversation: \x1b[36m${this.currentConversationId}\x1b[0m`);

                    // Show conversation history
                    await this.showHistory();
                    resolve();
                } catch (error) {
                    console.error(`\x1b[31m❌ Error loading conversation:\x1b[0m`, error);
                    resolve();
                }
            });
        });
    }

    private async showHistory(): Promise<void> {
        if (!this.currentConversationId) {
            console.log('\n\x1b[33m⚠ No active conversation. Use /new to start one.\x1b[0m');
            return;
        }

        try {
            const messages = await this.db.getConversationMessages(this.currentConversationId);

            if (messages.length === 0) {
                console.log('\n\x1b[33mNo messages in this conversation yet.\x1b[0m');
                return;
            }

            console.log('\n\x1b[1m💬 Conversation History:\x1b[0m');
            console.log('\x1b[90m' + '─'.repeat(60) + '\x1b[0m');

            for (const msg of messages) {
                const timestamp = new Date(msg.created_at).toLocaleTimeString();

                if (msg.role === 'user') {
                    console.log(`\n\x1b[34m[${timestamp}] You:\x1b[0m`);
                    console.log(msg.content);
                } else if (msg.role === 'assistant') {
                    console.log(`\n\x1b[35m[${timestamp}] Agent:\x1b[0m`);
                    console.log(msg.content);
                }
            }

            console.log('\n\x1b[90m' + '─'.repeat(60) + '\x1b[0m');
        } catch (error) {
            console.error(`\x1b[31m❌ Error showing history:\x1b[0m`, error);
        }
    }

    private async sendMessage(userInput: string): Promise<void> {
        if (!this.currentConversationId) {
            console.log('\n\x1b[33m⚠ No active conversation. Use /new to start one.\x1b[0m');
            return;
        }

        try {
            // Save user message
            await this.db.addMessage(
                this.currentConversationId,
                this.userId,
                'user',
                userInput
            );

            // Get conversation history for context
            const messages = await this.db.getConversationMessages(this.currentConversationId);
            const conversationHistory = messages.map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content,
            }));

            // Show thinking indicator
            process.stdout.write('\n\x1b[35m🤔 Agent is thinking...\x1b[0m\n');

            // Get agent response using generateText
            const result = await generateText({
                model: this.model,
                system: this.systemPrompt,
                messages: conversationHistory,
            });

            // Clear thinking indicator
            process.stdout.write('\x1b[1A\x1b[2K');

            // Extract text from result
            const responseText = result.text;

            // Save agent response
            await this.db.addMessage(
                this.currentConversationId,
                this.userId,
                'assistant',
                responseText
            );

            // Display agent response
            console.log(`\n\x1b[35m🤖 Agent:\x1b[0m`);
            console.log(responseText);

        } catch (error) {
            console.error(`\n\x1b[31m❌ Error:\x1b[0m`, error);
        }
    }

    async start(): Promise<void> {
        this.isRunning = true;
        this.clearScreen();
        this.printHeader();

        // Auto-create first conversation
        await this.startNewConversation();

        console.log('\n\x1b[32mReady! Type your message or use /help for commands.\x1b[0m');

        this.rl.prompt();

        this.rl.on('line', async (line: string) => {
            const input = line.trim();

            if (!input) {
                this.rl.prompt();
                return;
            }

            // Handle commands
            if (input.startsWith('/')) {
                const shouldContinue = await this.handleCommand(input);
                if (!shouldContinue) {
                    this.stop();
                    return;
                }
            } else {
                // Handle regular messages
                await this.sendMessage(input);
            }

            this.rl.prompt();
        });

        this.rl.on('close', () => {
            this.stop();
        });
    }

    stop(): void {
        if (this.isRunning) {
            this.isRunning = false;
            this.rl.close();
            this.db.close();
            process.exit(0);
        }
    }
}
