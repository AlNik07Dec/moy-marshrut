// src/stores/notificationStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestPermissions,
  scheduleDaily,
  cancelAll,
} from '@/services/notificationService';

interface NotificationState {
  enabled: boolean;
  hour: number;
  minute: number;
  setEnabled: (value: boolean) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      enabled: false,
      hour: 18,
      minute: 0,

      setEnabled: async (value: boolean) => {
        if (value) {
          const granted = await requestPermissions();
          if (!granted) return;
          const { hour, minute } = get();
          await scheduleDaily(hour, minute);
          set({ enabled: true });
        } else {
          await cancelAll();
          set({ enabled: false });
        }
      },

      setTime: async (hour: number, minute: number) => {
        set({ hour, minute });
        if (get().enabled) {
          await scheduleDaily(hour, minute);
        }
      },
    }),
    {
      name: 'notification-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
