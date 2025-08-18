"use server";

import { cookies } from "next/headers";

const CART_COOKIE = "cartId";
const DAYS_30 = 60 * 60 * 24 * 30;

export async function getCartIdFromCookie(): Promise<string | undefined> {
    const store = await cookies();
    const val = store.get(CART_COOKIE)?.value;
    return val || undefined;
}

export async function setCartIdCookie(id: string): Promise<void> {
    const store = await cookies();
    store.set(CART_COOKIE, id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: DAYS_30,
    });
}

export async function clearCartIdCookie(): Promise<void> {
    const store = await cookies();
    store.delete(CART_COOKIE);
}
