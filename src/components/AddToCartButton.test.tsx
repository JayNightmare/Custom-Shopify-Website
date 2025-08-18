// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddToCartButton from "./AddToCartButton";

const successResponse = (data: any = {}) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const errorResponse = (status = 500, data: any = { error: "Failed" }) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("components/AddToCartButton", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders and triggers happy path add-to-cart", async () => {
    const onAdded = vi.fn();
    const fetchMock = vi.fn()
      // First call: create cart
      .mockResolvedValueOnce(successResponse({ id: "cart123" }))
      // Second call: add line
      .mockResolvedValueOnce(successResponse({ cart: { id: "cart123" } }));

    (globalThis as any).fetch = fetchMock;

    render(
      <AddToCartButton
        merchandiseId="gid://shopify/ProductVariant/1"
        quantity={2}
        onAdded={onAdded}
      />
    );

    // Initial state
    const btn = screen.getByRole("button", { name: /add to cart/i });
    expect(btn).toBeEnabled();

    await user.click(btn);

    // Pending UI may be too brief to assert reliably; proceed to success assertion
    // Success message appears
    const successMsg = await screen.findByText(/added to cart\./i);
    expect(successMsg).toBeInTheDocument();

    // onAdded called with ok: true
    expect(onAdded).toHaveBeenCalledWith({ ok: true });

    // Verify fetch was called twice with expected endpoints
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/cart/create");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/cart/add");

    // Verify second call body includes our payload
    const secondInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(secondInit.method).toBe("POST");
    const parsed = JSON.parse(String(secondInit.body));
    expect(parsed.lines[0]).toEqual({
      merchandiseId: "gid://shopify/ProductVariant/1",
      quantity: 2,
    });
  });

  it("shows server error from /api/cart/add and calls onAdded with error", async () => {
    const onAdded = vi.fn();
    const fetchMock = vi.fn()
      // create cart ok
      .mockResolvedValueOnce(successResponse({ id: "cart123" }))
      // add fails
      .mockResolvedValueOnce(errorResponse(500, { error: "Failed to add to cart" }));

    (globalThis as any).fetch = fetchMock;

    render(
      <AddToCartButton
        merchandiseId="gid://shopify/ProductVariant/2"
        onAdded={onAdded}
      />
    );

    const btn = screen.getByRole("button", { name: /add to cart/i });
    await user.click(btn);

    const err = await screen.findByText(/failed to add to cart/i);
    expect(err).toBeInTheDocument();
    expect(onAdded).toHaveBeenCalledWith({ ok: false, error: "Failed to add to cart" });
  });

  it("handles network error gracefully and surfaces message", async () => {
    const onAdded = vi.fn();
    const fetchMock = vi.fn()
      // create cart ok
      .mockResolvedValueOnce(successResponse({ id: "cart123" }))
      // add throws
      .mockRejectedValueOnce(new Error("Network down"));

    (globalThis as any).fetch = fetchMock;

    render(
      <AddToCartButton
        merchandiseId="gid://shopify/ProductVariant/3"
        onAdded={onAdded}
      />
    );

    const btn = screen.getByRole("button", { name: /add to cart/i });
    await user.click(btn);

    const err = await screen.findByText(/network down/i);
    expect(err).toBeInTheDocument();
    expect(onAdded).toHaveBeenCalledWith({ ok: false, error: "Network down" });
  });
});
