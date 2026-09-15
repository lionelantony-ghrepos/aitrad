/**
 * k6 load: order-service /preview @ 50 rps, p95 < 300ms (Architecture §8 / PBI-030).
 *
 *   k6 run -e INSFORGE_URL=http://localhost:7130 -e ACCESS_TOKEN=... scripts/load/order-preview.k6.js
 */
/* global __ENV */
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    preview: {
      executor: "constant-arrival-rate",
      rate: 50,
      timeUnit: "1s",
      duration: "15s",
      preAllocatedVUs: 20,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<300"],
  },
};

export default function () {
  const base = String(__ENV.INSFORGE_URL || "http://127.0.0.1:7130").replace(/\/+$/, "");
  const token = String(__ENV.ACCESS_TOKEN || "");
  const res = http.post(
    `${base}/functions/order-service/preview`,
    JSON.stringify({
      op: "preview",
      symbol: "AAPL",
      side: "buy",
      qty: 1,
      order_type: "limit",
      limit_price: 1,
      tif: "DAY",
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  check(res, { "status is 200 or 401": (r) => r.status === 200 || r.status === 401 });
}
