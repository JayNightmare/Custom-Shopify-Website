import { describe, it, expect, beforeEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

// Import after setting env to ensure module initializes with current env
describe.sequential("lib/mongo (no MONGODB_URI mock mode)", () => {
    beforeEach(async () => {
        delete (process.env as any).MONGODB_URI;
        (process.env as any).MONGODB_DB = "artist_shop";
        // Reset module cache so mongo.ts reads fresh env each test
        await vi.resetModules();
    });

    it("hitRateLimit returns false when MONGODB_URI is not set", async () => {
        const { hitRateLimit } = await import("./mongo");
        const limited = await hitRateLimit("user:window", 5, 60);
        expect(limited).toBe(false);
    });

    it("getDb rejects when MONGODB_URI is not set", async () => {
        const { getDb } = await import("./mongo");
        await expect(getDb()).rejects.toThrow(/MONGODB_URI not configured/);
    });

    it("collections helpers reject without MONGODB_URI", async () => {
        const { consoleDrafts, featureFlags, webhookLogs } = await import(
            "./mongo"
        );
        await expect(consoleDrafts()).rejects.toThrow(
            /MONGODB_URI not configured/
        );
        await expect(featureFlags()).rejects.toThrow(
            /MONGODB_URI not configured/
        );
        await expect(webhookLogs()).rejects.toThrow(
            /MONGODB_URI not configured/
        );
    });
});
