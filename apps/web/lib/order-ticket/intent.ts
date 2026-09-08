import { create } from "zustand";
import type { OrderSide } from "@meridian/schemas";

export type OrderTicketIntentState = {
  side: OrderSide;
  setSide: (side: OrderSide) => void;
};

export const useOrderTicketIntent = create<OrderTicketIntentState>((set) => ({
  side: "buy",
  setSide: (side) => {
    set({ side });
  },
}));
