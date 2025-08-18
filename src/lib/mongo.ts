import { MongoClient, Db, Collection } from "mongodb";

let clientPromise: Promise<MongoClient> | null = null;

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "artist_shop";

if (!uri) {
    // In mock/local-without-db mode, we still export stubs to avoid runtime crashes.
    console.warn(
        "[mongo] MONGODB_URI is not set. Mongo features will be disabled."
    );
}

async function getClient(): Promise<MongoClient> {
    if (!uri) {
        throw new Error("MONGODB_URI not configured");
    }
    if (!clientPromise) {
        const client = new MongoClient(uri, {
            maxPoolSize: 10,
        });
        clientPromise = client.connect();
    }
    return clientPromise;
}

export async function getDb(): Promise<Db> {
    const client = await getClient();
    return client.db(dbName);
}

/**
 * Collections
 * - console_drafts
 * - feature_flags
 * - webhook_logs
 * NextAuth adapter creates its own collections; we only expose our app-level ones here.
 */
export type ConsoleDraftDoc = {
    key: string;
    data: Record<string, any>;
    version: number;
    updatedBy: string;
    updatedAt: Date;
    publishedAt: Date | null;
};

export type FeatureFlagDoc = {
    key: string;
    enabled: boolean;
    description: string;
    updatedAt: Date;
};

export type WebhookLogDoc = {
    topic: "orders/create" | "products/update" | "app/uninstalled";
    status: "ok" | "error";
    payload: Record<string, any>;
    error: string | null;
    createdAt: Date;
};

export async function consoleDrafts(): Promise<Collection<ConsoleDraftDoc>> {
    const db = await getDb();
    return db.collection<ConsoleDraftDoc>("console_drafts");
}

export async function featureFlags(): Promise<Collection<FeatureFlagDoc>> {
    const db = await getDb();
    return db.collection<FeatureFlagDoc>("feature_flags");
}

export async function webhookLogs(): Promise<Collection<WebhookLogDoc>> {
    const db = await getDb();
    return db.collection<WebhookLogDoc>("webhook_logs");
}

/**
 * Simple rate limiter using MongoDB.
 * Keyed by userId + window. Window in seconds.
 */
export async function hitRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<boolean> {
    if (!uri) return false; // no DB -> no rate limit in local mock
    const db = await getDb();
    const coll = db.collection<{ _id: string; count: number; expiresAt: Date }>(
        "rate_limits"
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

    const res = await coll.findOneAndUpdate(
        { _id: key },
        {
            $setOnInsert: { expiresAt },
            $inc: { count: 1 },
        },
        // In MongoDB Node.js driver v6, to access `.value`, request metadata explicitly
        {
            upsert: true,
            returnDocument: "after",
            includeResultMetadata: true as any,
        }
    );

    // Ensure TTL index (one-time best-effort)
    coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(
        () => {}
    );

    // Support both shapes: ModifyResult with `.value` or direct document
    const count = (res as any)?.value?.count ?? (res as any)?.count ?? 1;
    return count > limit;
}
