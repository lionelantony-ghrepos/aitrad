import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { orderServiceUrl } from "./order-service";

const orderServiceSrc = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/functions/order-service-src.ts",
  ),
  "utf8",
);

describe("orderServiceUrl", () => {
  it("builds preview and orders paths", () => {
    expect(orderServiceUrl("https://app.insforge.app/", "preview")).toBe(
      "https://app.insforge.app/functions/order-service/preview",
    );
    expect(orderServiceUrl("https://app.insforge.app", "orders")).toBe(
      "https://app.insforge.app/functions/order-service/orders",
    );
    expect(
      orderServiceUrl("https://app.insforge.app", {
        cancel: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toBe(
      "https://app.insforge.app/functions/order-service/orders/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cancel",
    );
  });
});

describe("order-service security", () => {
  it("evaluates risk/fees from quotes_latest, not client last_price", () => {
    expect(orderServiceSrc).toContain('.from("quotes_latest")');
    expect(orderServiceSrc).toContain("lastPriceForRuleFacts");
    expect(orderServiceSrc).not.toMatch(/lastPrice:\s*parsed\.last_price/);
    expect(orderServiceSrc).toContain("void parsed.last_price");
  });

  it("writes orders through createAdminClient and fails closed without a service key", () => {
    expect(orderServiceSrc).toContain("createAdminClient");
    expect(orderServiceSrc).toContain("requireAdminWriter");
    expect(orderServiceSrc).toContain("SERVICE_KEY_UNAVAILABLE");
    expect(orderServiceSrc).toContain('admin.database.from("orders").insert');
    expect(orderServiceSrc).not.toMatch(/client\.database\.from\("orders"\)\.insert/);
  });
});
