import { createClient, Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
    conversation_id: string;
    message_id: string;
    user_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: string;
    created_at: string;
}

export interface Conversation {
    id: string;
    resource_id: string;
    user_id: string;
    metadata: string;
    created_at: string;
    updated_at: string;
}

export class DatabaseService {
    private client: Client;

    constructor(dbPath: string = 'file:chat_history.db') {
        this.client = createClient({
            url: dbPath,
        });
    }

    async initialize(): Promise<void> {
        // Create memory_conversations table
        await this.client.execute(`
      CREATE TABLE IF NOT EXISTS memory_conversations (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

        // Create memory_messages table
        await this.client.execute(`
      CREATE TABLE IF NOT EXISTS memory_messages (
        conversation_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (conversation_id, message_id)
      )
    `);
    }

    async createConversation(userId: string, resourceId: string = 'default', metadata: Record<string, any> = {}): Promise<string> {
        const conversationId = `chat_${uuidv4()}`;
        const now = new Date().toISOString();

        await this.client.execute({
            sql: `INSERT INTO memory_conversations (id, resource_id, user_id, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
            args: [conversationId, resourceId, userId, JSON.stringify(metadata), now, now],
        });

        return conversationId;
    }

    async addMessage(
        conversationId: string,
        userId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        metadata?: Record<string, any>
    ): Promise<string> {
        const messageId = `msg_${uuidv4()}`;
        const now = new Date().toISOString();

        await this.client.execute({
            sql: `INSERT INTO memory_messages (conversation_id, message_id, user_id, role, content, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
                conversationId,
                messageId,
                userId,
                role,
                content,
                metadata ? JSON.stringify(metadata) : null,
                now,
            ],
        });

        // Update conversation's updated_at timestamp
        await this.client.execute({
            sql: `UPDATE memory_conversations SET updated_at = ? WHERE id = ?`,
            args: [now, conversationId],
        });

        return messageId;
    }

    async getConversationMessages(conversationId: string): Promise<Message[]> {
        const result = await this.client.execute({
            sql: `SELECT * FROM memory_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
            args: [conversationId],
        });

        return result.rows.map((row) => ({
            conversation_id: row.conversation_id as string,
            message_id: row.message_id as string,
            user_id: row.user_id as string,
            role: row.role as 'user' | 'assistant' | 'system',
            content: row.content as string,
            metadata: row.metadata as string | undefined,
            created_at: row.created_at as string,
        }));
    }

    async getConversation(conversationId: string): Promise<Conversation | null> {
        const result = await this.client.execute({
            sql: `SELECT * FROM memory_conversations WHERE id = ?`,
            args: [conversationId],
        });

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id as string,
            resource_id: row.resource_id as string,
            user_id: row.user_id as string,
            metadata: row.metadata as string,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
        };
    }

    async listConversations(userId: string, limit: number = 20): Promise<Conversation[]> {
        const result = await this.client.execute({
            sql: `SELECT * FROM memory_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`,
            args: [userId, limit],
        });

        return result.rows.map((row) => ({
            id: row.id as string,
            resource_id: row.resource_id as string,
            user_id: row.user_id as string,
            metadata: row.metadata as string,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
        }));
    }

    async deleteConversation(conversationId: string): Promise<void> {
        // Delete messages first
        await this.client.execute({
            sql: `DELETE FROM memory_messages WHERE conversation_id = ?`,
            args: [conversationId],
        });

        // Delete conversation
        await this.client.execute({
            sql: `DELETE FROM memory_conversations WHERE id = ?`,
            args: [conversationId],
        });
    }

    async close(): Promise<void> {
        this.client.close();
    }
}
