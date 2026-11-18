import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BolsaClient } from "@/components/bolsa/bolsa-client";
import { buildRankings, getTalentHubData } from "@/lib/bolsa/store";
import { requireModuleAccess } from "@/lib/period/resolve";
import { getServerUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Bolsa de Empleo y Ranking · EditFlow",
  description:
    "Publica proyectos, escala el Top Ranking por estrellas, valida skills y participa en interviews en vivo.",
};

export default async function BolsaPage() {
  const [{ organization }, user, data] = await Promise.all([
    requireModuleAccess("bolsa"),
    getServerUser(),
    getTalentHubData(true),
  ]);

  if (!user) {
    redirect("/crear-espacio");
  }

  const { rankedProjects, creatorRankings } = buildRankings(data);

  return (
    <BolsaClient
      rankedProjects={rankedProjects}
      creatorRankings={creatorRankings}
      jobs={data.jobs}
      applications={data.applications}
      skillValidations={data.skillValidations}
      currentUserId={user.id}
      currentOrgId={organization.id}
      currentRole={organization.role}
    />
  );
}
