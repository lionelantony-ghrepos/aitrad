import type { NewsItem } from "@meridian/schemas";
import { create } from "zustand";

export type NewsFocusState = {
  item: NewsItem | null;
  setItem: (item: NewsItem | null) => void;
};

export const useNewsFocus = create<NewsFocusState>((set) => ({
  item: null,
  setItem: (item) => {
    set({ item });
  },
}));
