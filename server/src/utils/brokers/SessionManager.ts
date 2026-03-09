import { loginAngelOne } from './angelone';
import { SmartAPI } from 'smartapi-javascript';

interface Session {
    accessToken: string;
    refreshToken: string;
    feedToken: string;
    lastUpdated: number;
}

class SessionManager {
    private sessions: Map<string, Session> = new Map();
    private static instance: SessionManager;

    private constructor() { }

    public static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    async getSession(account: any): Promise<{ success: boolean; accessToken?: string; feedToken?: string; error?: string }> {
        const cached = this.sessions.get(account.id);

        // Session valid for 20 hours (Angel One tokens usually last until midnight)
        if (cached && (Date.now() - cached.lastUpdated < 20 * 60 * 60 * 1000)) {
            return { success: true, accessToken: cached.accessToken, feedToken: cached.feedToken };
        }

        try {
            console.log(`[SessionManager] Refreshing session for ${account.client_id}`);
            const result = await loginAngelOne(
                account.client_id,
                account.totp_secret,
                account.api_key,
                account.password
            );

            if (result.success) {
                this.sessions.set(account.id, {
                    accessToken: result.access_token!,
                    refreshToken: result.refresh_token!,
                    feedToken: result.feed_token!,
                    lastUpdated: Date.now()
                });
                return { success: true, accessToken: result.access_token, feedToken: result.feed_token };
            }
            return { success: false, error: 'Login failed' };
        } catch (error: any) {
            console.error(`[SessionManager] Error for ${account.client_id}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Explicitly update session if a call fails with 401
    invalidateSession(accountId: string) {
        this.sessions.delete(accountId);
    }
}

export const sessionManager = SessionManager.getInstance();
