import {
  orderCancelRequestSchema,
  orderCancelResponseSchema,
  orderCreateRequestSchema,
  orderCreateResponseSchema,
  orderPreviewRequestSchema,
  orderPreviewResponseSchema,
  type OrderCancelRequest,
  type OrderCancelResponse,
  type OrderCreateRequest,
  type OrderCreateResponse,
  type OrderPreviewRequest,
  type OrderPreviewResponse,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";

export function orderServiceUrl(
  baseUrl: string,
  path?: "preview" | "orders" | { cancel: string },
): string {
  const root = functionsUrl(baseUrl, "order-service");
  if (!path) {
    return root;
  }
  if (typeof path === "object") {
    return `${root}/orders/${path.cancel}/cancel`;
  }
  return `${root}/${path}`;
}

export async function invokeOrderPreview(input: {
  baseUrl: string;
  accessToken: string;
  request: OrderPreviewRequest;
  fetchImpl?: typeof fetch;
}): Promise<OrderPreviewResponse> {
  const payload = orderPreviewRequestSchema.parse({ ...input.request, op: "preview" });
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(orderServiceUrl(input.baseUrl, "preview"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`ORDER_SERVICE_${response.status}`);
  }
  return orderPreviewResponseSchema.parse(body);
}

export async function invokeOrderCreate(input: {
  baseUrl: string;
  accessToken: string;
  request: OrderCreateRequest;
  fetchImpl?: typeof fetch;
}): Promise<OrderCreateResponse> {
  const payload = orderCreateRequestSchema.parse({ ...input.request, op: "create" });
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(orderServiceUrl(input.baseUrl, "orders"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok && response.status !== 422) {
    throw new Error(`ORDER_SERVICE_${response.status}`);
  }
  return orderCreateResponseSchema.parse(body);
}

export async function invokeOrderCancel(input: {
  baseUrl: string;
  accessToken: string;
  orderId: string;
  request?: OrderCancelRequest;
  fetchImpl?: typeof fetch;
}): Promise<OrderCancelResponse> {
  const payload = orderCancelRequestSchema.parse({
    ...input.request,
    op: "cancel",
    order_id: input.orderId,
  });
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(orderServiceUrl(input.baseUrl, { cancel: input.orderId }), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`ORDER_SERVICE_${response.status}`);
  }
  return orderCancelResponseSchema.parse(body);
}
