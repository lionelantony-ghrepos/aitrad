import { create } from "zustand";

export type SymbolContextState = {
  activeSymbol: string | null;
  setActiveSymbol: (symbol: string | null) => void;
};

export const useSymbolContext = create<SymbolContextState>((set) => ({
  activeSymbol: null,
  setActiveSymbol: (activeSymbol) => {
    set({ activeSymbol });
  },
}));
