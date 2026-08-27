import { supabase } from "@/integrations/supabase/client";
import { useCampaignScope } from "@/hooks/useCampaignScope";

type CampaignRow = {
  id: string;
  uf: string;
  nr_candidato: string;
  nome_candidato: string | null;
  nome_urna: string | null;
  cargo: string | null;
  partido: string | null;
  nome_campanha: string;
  admin_user_id: string;
};

type MembershipRow = {
  campaign_id: string;
  role: string;
  status: string;
};

export type UserCampaignAccess = {
  campaignId: string;
  campaignName: string;
  candidateName: string;
  ballotName: string;
  candidateNumber: string;
  uf: string;
  office: string;
  party: string;
  role: string;
  status: string;
};

const isApprovedMembership = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  return s === "approved" || s === "aprovado" || s === "ativo";
};

const mapAccess = (campaign: CampaignRow, role: string, status: string): UserCampaignAccess => ({
  campaignId: campaign.id,
  campaignName: campaign.nome_campanha,
  candidateName: campaign.nome_candidato || campaign.nome_campanha,
  ballotName: campaign.nome_urna || campaign.nome_candidato || campaign.nome_campanha,
  candidateNumber: campaign.nr_candidato,
  uf: campaign.uf,
  office: campaign.cargo || "",
  party: campaign.partido || "",
  role,
  status,
});

export async function getUserCampaignAccesses(userId: string): Promise<UserCampaignAccess[]> {
  // Obter detalhes do usuário autenticado para ter seu email/telefone
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email || "";
  const phone = email.includes("@") ? email.split("@")[0] : "";

  // Buscar registros na tabela pessoas para este usuário por ID ou por Telefone
  let query = supabase.from("pessoas").select("campanha_id, papel_campanha, status");
  if (phone) {
    query = query.or(`id.eq.${userId},telefone.eq.${phone}`);
  } else {
    query = query.eq("id", userId);
  }
  const { data: pessoasData } = await query;

  const [ownedResult, membershipResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id, uf, nr_candidato, nome_candidato, nome_urna, cargo, partido, nome_campanha, admin_user_id",
      )
      .eq("admin_user_id", userId),
    supabase.from("campaign_members").select("campaign_id, role, status").eq("user_id", userId),
  ]);

  if (ownedResult.error) throw ownedResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const ownedCampaigns = (ownedResult.data || []) as CampaignRow[];
  
  // Mesclar dados de campaign_members e pessoas
  const allMemberships = [...(membershipResult.data || []) as MembershipRow[]];
  
  // Se houver registros na tabela pessoas que não estão em campaign_members, adicioná-los
  if (pessoasData && pessoasData.length > 0) {
    pessoasData.forEach(p => {
      if (p.campanha_id && !allMemberships.some(m => m.campaign_id === p.campanha_id)) {
        allMemberships.push({
          campaign_id: p.campanha_id,
          role: p.papel_campanha || 'membro',
          status: p.status || 'pendente_aprovacao'
        });
      }
    });
  }

  // Filtrar membros aprovados (considerando status 'ativo' em pessoas como aprovado)
  const memberships = allMemberships.filter((membership) => {
    // Verificar se o usuário está ativo no cadastro de pessoas para esta campanha
    const pessoaParaEstaCampanha = (pessoasData || []).find(p => p.campanha_id === membership.campaign_id);
    const statusPessoa = pessoaParaEstaCampanha?.status;
    
    return isApprovedMembership(membership.status) || isApprovedMembership(statusPessoa || "");
  });

  const ownedIds = new Set(ownedCampaigns.map((campaign) => campaign.id));
  const memberCampaignIds = memberships
    .map((membership) => membership.campaign_id)
    .filter((campaignId) => !ownedIds.has(campaignId));

  let memberCampaigns: CampaignRow[] = [];
  if (memberCampaignIds.length > 0) {
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        "id, uf, nr_candidato, nome_candidato, nome_urna, cargo, partido, nome_campanha, admin_user_id",
      )
      .in("id", memberCampaignIds);
    if (error) throw error;
    memberCampaigns = (data || []) as CampaignRow[];
  }

  const accesses = new Map<string, UserCampaignAccess>();
  ownedCampaigns.forEach((campaign) => {
    accesses.set(campaign.id, mapAccess(campaign, "admin", "approved"));
  });
  memberCampaigns.forEach((campaign) => {
    const membership = memberships.find((item) => item.campaign_id === campaign.id);
    if (membership) {
      // Forçar status como 'approved' se estiver ativo na tabela pessoas ou em campaign_members
      const statusPessoa = (pessoasData || []).find(p => p.campaign_id === campaign.id)?.status || "";
      const finalStatus = (isApprovedMembership(membership.status) || isApprovedMembership(statusPessoa)) ? "approved" : membership.status;
      
      accesses.set(campaign.id, mapAccess(campaign, membership.role, finalStatus));
    }
  });

  return [...accesses.values()].sort((a, b) =>
    a.campaignName.localeCompare(b.campaignName, "pt-BR"),
  );
}

export function activateCampaignAccess(access: UserCampaignAccess) {
  useCampaignScope.getState().setCampaign({
    id: access.campaignId,
    uf: access.uf,
    numero: access.candidateNumber,
    nomeUrna: access.ballotName,
    cargo: access.office,
  });

  if (typeof window !== "undefined") {
    sessionStorage.setItem("democracias_current_campaign_access", JSON.stringify(access));
  }
}
