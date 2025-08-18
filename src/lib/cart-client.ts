/**
 * Thin client wrappers around our Cart API routes.
 * Server routes derive cartId from cookie when appropriate.
 */

export type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number };

async function postJson<T>(url: string, body: any): Promise<ApiResult<T>> {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body ?? {}),
        });
        const json = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) {
            return {
                ok: false,
                error: String(json?.error || `Request failed: ${res.status}`),
                status: res.status,
            };
        }
        return { ok: true, data: json as T };
    } catch (e: any) {
        return { ok: false, error: String(e?.message ?? e) };
    }
}

type CartCreateResponse = { id: string } | { cart?: { id: string } };

export async function createCart(): Promise<ApiResult<CartCreateResponse>> {
    return postJson<CartCreateResponse>("/api/cart/create", {});
}

type CartAddResponse = {
    cart?: { id: string };
};

export async function addLine(
    merchandiseId: string,
    quantity: number = 1
): Promise<ApiResult<CartAddResponse>> {
    return postJson<CartAddResponse>("/api/cart/add", {
        cartId: "from-cookie",
        lines: [{ merchandiseId, quantity }],
    });
}

type CartUpdateResponse = {
    cart?: { id: string; totalQuantity: number };
};

export async function updateLine(
    cartId: string,
    lineId: string,
    quantity: number
): Promise<ApiResult<CartUpdateResponse>> {
    return postJson<CartUpdateResponse>("/api/cart/update", {
        cartId,
        lines: [{ id: lineId, quantity }],
    });
}

type CartRemoveResponse = {
    cart?: { id: string; totalQuantity: number };
};

export async function removeLines(
    cartId: string,
    lineIds: string[]
): Promise<ApiResult<CartRemoveResponse>> {
    return postJson<CartRemoveResponse>("/api/cart/remove", {
        cartId,
        lineIds,
    });
}
