import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestPermissions,
  scheduleWithId,
  cancelById,
} from '@/services/notificationService';

export type Reminder = {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

interface NotificationState {
  reminders: Reminder[];
  addReminder: (hour: number, minute: number) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
  setReminderTime: (id: string, hour: number, minute: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: async (hour: number, minute: number) => {
        const granted = await requestPermissions();
        if (!granted) return;
        const id = Date.now().toString();
        await scheduleWithId(id, hour, minute);
        set((state) => ({
          reminders: [...state.reminders, { id, hour, minute, enabled: true }],
        }));
      },

      removeReminder: async (id: string) => {
        try {
          await cancelById(id);
        } finally {
          set((state) => ({
            reminders: state.reminders.filter((r) => r.id !== id),
          }));
        }
      },

      toggleReminder: async (id: string, enabled: boolean) => {
        const reminder = get().reminders.find((r) => r.id === id);
        if (!reminder) return;
        if (enabled) {
          const granted = await requestPermissions();
          if (!granted) return;
          await scheduleWithId(id, reminder.hour, reminder.minute);
        } else {
          try {
            await cancelById(id);
          } finally {
            // fall through to set state
          }
        }
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, enabled } : r,
          ),
        }));
      },

      setReminderTime: async (id: string, hour: number, minute: number) => {
        const reminder = get().reminders.find((r) => r.id === id);
        if (!reminder) return;
        if (reminder.enabled) {
          await scheduleWithId(id, hour, minute);
        }
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, hour, minute } : r,
          ),
        }));
      },
    }),
    {
      name: 'notification-reminders',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
