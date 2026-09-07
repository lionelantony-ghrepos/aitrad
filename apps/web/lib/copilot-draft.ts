import { create } from "zustand";

export type CopilotDraftState = {
  query: string;
  setQuery: (query: string) => void;
};

export const useCopilotDraft = create<CopilotDraftState>((set) => ({
  query: "",
  setQuery: (query) => {
    set({ query });
  },
}));
