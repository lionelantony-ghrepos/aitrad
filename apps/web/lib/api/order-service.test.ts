import { describe, expect, it } from "vitest";
import { orderServiceUrl } from "./order-service";

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
