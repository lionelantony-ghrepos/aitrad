import { create } from "zustand";
import type { OrderDraft, OrderSide } from "@meridian/schemas";

export type OrderTicketPrefill = {
  token: number;
  draft: OrderDraft;
};

export type OrderTicketIntentState = {
  side: OrderSide;
  prefill: OrderTicketPrefill | null;
  setSide: (side: OrderSide) => void;
  applyPrefill: (draft: OrderDraft) => void;
};

export const useOrderTicketIntent = create<OrderTicketIntentState>((set, get) => ({
  side: "buy",
  prefill: null,
  setSide: (side) => {
    set({ side });
  },
  applyPrefill: (draft) => {
    set({
      side: draft.side,
      prefill: { token: (get().prefill?.token ?? 0) + 1, draft },
    });
  },
}));
