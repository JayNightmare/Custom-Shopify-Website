import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

// Mock next/cache before importing module under test
const revalidateTagMock = vi.fn();
vi.mock("next/cache", () => {
    return {
        revalidateTag: revalidateTagMock,
    };
});

describe.sequential("lib/cache", () => {
    beforeEach(() => {
        revalidateTagMock.mockReset();
    });

    afterEach(() => {
        // restore env
        const keys = ["NODE_ENV"];
        for (const k of keys) {
            const v = (ORIGINAL_ENV as any)[k];
            if (v !== undefined) (process.env as any)[k] = v;
            else delete (process.env as any)[k];
        }
        vi.restoreAllMocks();
        vi.unstubAllGlobals?.();
    });

    it("calls next/cache.revalidateTag with the provided tag", async () => {
        const { revalidate } = await import("./cache");
        await revalidate("product:hat");
        expect(revalidateTagMock).toHaveBeenCalledWith("product:hat");
    });

    it("swallows errors and warns in non-production", async () => {
        (process.env as any).NODE_ENV = "test"; // non-production
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { revalidate } = await import("./cache");

        revalidateTagMock.mockImplementationOnce(() => {
            throw new Error("boom");
        });
        await revalidate("collection:vinyl");

        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it("rethrows errors in production", async () => {
        (process.env as any).NODE_ENV = "production";
        const { revalidate } = await import("./cache");

        revalidateTagMock.mockImplementationOnce(() => {
            throw new Error("prod failure");
        });

        await expect(revalidate("cart:123")).rejects.toThrow(/prod failure/);
    });
});
