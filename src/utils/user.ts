import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function getSystemUsername(): Promise<string> {
    try {
        // Try to get the username from the system
        const username = os.userInfo().username;
        return username || 'user';
    } catch (error) {
        console.error('Error getting system username:', error);
        return 'user';
    }
}

export function generateUserId(username: string): string {
    return `user_${username}`;
}
