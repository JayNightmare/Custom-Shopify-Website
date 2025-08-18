// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import Price from "./Price";

describe("components/Price", () => {
  it("renders formatted USD currency by default", () => {
    render(<Price amount={12} />);
    const el = screen.getByText(/\$12(?:\.00)?/);
    expect(el).toBeInTheDocument();
  });

  it("renders with provided currency code", () => {
    render(<Price amount={9.99} currencyCode="EUR" />);
    // Intl may render €9.99 or 9,99 € depending on environment; just assert numeric amount present.
    const el = screen.getByText(/9\.99/);
    expect(el).toBeInTheDocument();
  });

  it("falls back gracefully when currency code is invalid", () => {
    render(<Price amount={7} currencyCode="INVALID_CODE" />);
    // Fallback format returns "7 INVALID_CODE"
    const el = screen.getByText("7 INVALID_CODE");
    expect(el).toBeInTheDocument();
  });

  it("accepts string amounts", () => {
    render(<Price amount={"5.5"} />);
    const el = screen.getByText(/\$5\.5/);
    expect(el).toBeInTheDocument();
  });
});
