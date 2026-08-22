import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SystemStore {
  officialWhatsApp: string;
  setOfficialWhatsApp: (phone: string) => void;
  googleAuth: {
    clientId: string;
    clientSecret: string;
  };
  setGoogleAuth: (auth: { clientId: string; clientSecret: string }) => void;
  // TODO: Add robust RBAC inside the backend instead of local store.
  // For now, this isolates the system-level state.
}

export const useSystemStore = create<SystemStore>()(
  persist(
    (set) => ({
      officialWhatsApp: '',
      setOfficialWhatsApp: (phone) => set({ officialWhatsApp: phone }),
      googleAuth: { clientId: '', clientSecret: '' },
      setGoogleAuth: (auth) => set({ googleAuth: auth }),
    }),
    {
      name: 'democracias-system-store',
    }
  )
);
