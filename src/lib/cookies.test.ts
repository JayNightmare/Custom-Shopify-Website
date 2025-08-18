import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// In-memory cookie jar for mocking next/headers
type CookieRecord = { name: string; value: string; options?: any };
const jar = new Map<string, CookieRecord>();

const mockStore = {
    get(name: string) {
        const rec = jar.get(name);
        return rec ? { name: rec.name, value: rec.value } : undefined;
    },
    set(name: string, value: string, options?: any) {
        jar.set(name, { name, value, options });
    },
    delete(name: string) {
        jar.delete(name);
    },
};

// Mock next/headers before importing the module under test
vi.mock("next/headers", () => {
    return {
        cookies: vi.fn(async () => mockStore),
    };
});

const ORIGINAL_ENV = { ...process.env };

describe.sequential("lib/cookies", () => {
    beforeEach(() => {
        jar.clear();
    });

    afterEach(() => {
        // restore NODE_ENV and any other envs adjusted during tests
        const keys = ["NODE_ENV"];
        for (const k of keys) {
            const v = (ORIGINAL_ENV as any)[k];
            if (v !== undefined) (process.env as any)[k] = v;
            else delete (process.env as any)[k];
        }
        vi.restoreAllMocks();
        vi.unstubAllGlobals?.();
    });

    it("getCartIdFromCookie returns undefined when not set", async () => {
        const { getCartIdFromCookie } = await import("./cookies");
        const id = await getCartIdFromCookie();
        expect(id).toBeUndefined();
    });

    it("setCartIdCookie then getCartIdFromCookie returns the value", async () => {
        const { setCartIdCookie, getCartIdFromCookie } = await import(
            "./cookies"
        );
        await setCartIdCookie("abc123");
        const id = await getCartIdFromCookie();
        expect(id).toBe("abc123");
    });

    it("clearCartIdCookie removes the cookie", async () => {
        const { setCartIdCookie, clearCartIdCookie, getCartIdFromCookie } =
            await import("./cookies");
        await setCartIdCookie("xyz789");
        await clearCartIdCookie();
        const id = await getCartIdFromCookie();
        expect(id).toBeUndefined();
    });

    it("setCartIdCookie sets secure in production and not in non-production", async () => {
        const { setCartIdCookie } = await import("./cookies");

        // Non-production
        (process.env as any).NODE_ENV = "test";
        await setCartIdCookie("nonprod");
        const nonProd = jar.get("cartId");
        expect(nonProd?.options?.secure).toBe(false);
        expect(nonProd?.options?.httpOnly).toBe(true);
        expect(nonProd?.options?.sameSite).toBe("lax");
        expect(nonProd?.options?.path).toBe("/");

        // Production
        (process.env as any).NODE_ENV = "production";
        await setCartIdCookie("prod");
        const prod = jar.get("cartId");
        expect(prod?.options?.secure).toBe(true);
        expect(prod?.options?.httpOnly).toBe(true);
    });
});
