import { create } from "zustand";
import type { AlertInstance } from "@meridian/schemas";

export type AlertsUiState = {
  unreadCount: number;
  toast: AlertInstance | null;
  setUnreadCount: (n: number) => void;
  showToast: (alert: AlertInstance) => void;
  clearToast: () => void;
};

export const useAlertsUi = create<AlertsUiState>((set) => ({
  unreadCount: 0,
  toast: null,
  setUnreadCount: (unreadCount) => {
    set({ unreadCount });
  },
  showToast: (alert) => {
    set({ toast: alert });
  },
  clearToast: () => {
    set({ toast: null });
  },
}));
