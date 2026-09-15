import { create } from "zustand";
import type { RealtimeConnectionState } from "@meridian/schemas";

type RealtimeUiState = {
  connection: RealtimeConnectionState;
  lastTickMs: number | null;
  setConnection: (connection: RealtimeConnectionState) => void;
  noteTick: (atMs?: number) => void;
};

export const useRealtimeConnection = create<RealtimeUiState>((set) => ({
  connection: "connecting",
  lastTickMs: null,
  setConnection: (connection) => set({ connection }),
  noteTick: (atMs) => set({ lastTickMs: atMs ?? Date.now() }),
}));
