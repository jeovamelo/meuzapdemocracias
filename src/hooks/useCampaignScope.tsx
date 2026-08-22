import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CampaignScope {
  id: string;
  uf: string;
  numero: string;
  nomeUrna: string;
  cargo: string;
}

interface CampaignState {
  campaign: CampaignScope | null;
  setCampaign: (campaign: CampaignScope | null) => void;
  clearCampaign: () => void;
}

// Store global para manter o contexto de isolamento da campanha ativo.
// Utilizamos o middleware "persist" para guardar essa configuração no localStorage
// garantindo que mesmo ao dar refresh (F5), a plataforma saiba em qual estado/candidato está operando.
export const useCampaignScope = create<CampaignState>()(
  persist(
    (set) => ({
      campaign: null,
      setCampaign: (campaign) => set({ campaign }),
      clearCampaign: () => set({ campaign: null }),
    }),
    {
      name: 'democracias-campaign-scope',
    }
  )
);
