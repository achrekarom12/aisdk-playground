import os from 'os';

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