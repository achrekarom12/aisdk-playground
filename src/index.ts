import { initializeAgent } from "./ai/agents";
import { DatabaseService } from "./db/database";
import { InteractiveTUI } from "./tui/interactive";
import { getSystemUsername, generateUserId } from "./utils/user";

async function main() {
    try {
        console.log('\x1b[36m🚀 Initializing Agent TUI...\x1b[0m\n');

        // Get system username
        const username = await getSystemUsername();
        const userId = generateUserId(username);
        console.log(`\x1b[90m✓ User ID: ${userId}\x1b[0m`);

        // Initialize database
        console.log('\x1b[90m✓ Initializing database...\x1b[0m');
        const db = new DatabaseService();
        await db.initialize();

        // Initialize agent
        console.log('\x1b[90m✓ Initializing AI agent...\x1b[0m');
        const { model, systemPrompt } = await initializeAgent();

        // Start TUI
        console.log('\x1b[90m✓ Starting interactive terminal...\x1b[0m\n');
        const tui = new InteractiveTUI({ model, systemPrompt, db, userId });
        await tui.start();


    } catch (error) {
        console.error('\x1b[31m❌ Fatal error:\x1b[0m', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n\x1b[33m👋 Shutting down gracefully...\x1b[0m');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n\x1b[33m👋 Shutting down gracefully...\x1b[0m');
    process.exit(0);
});

main();
