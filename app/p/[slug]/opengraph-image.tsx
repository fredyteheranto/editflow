import { ImageResponse } from "next/og";
import { getResolvedPublicPortfolio } from "@/lib/portfolio/store";
import { getPlatformConfig } from "@/lib/platform/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function PortfolioOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, platformConfig] = await Promise.all([params, getPlatformConfig()]);
  const resolved = platformConfig.permissions.publicPortfolios
    ? await getResolvedPublicPortfolio(slug)
    : null;

  const name = resolved?.profile.displayName ?? "EditFlow";
  const headline =
    resolved?.profile.headline ?? "Portafolio audiovisual y espacio creativo";
  const badgeText =
    resolved?.profile.kind === "agency"
      ? "Agencia Audiovisual · EditFlow"
      : "Creador & Editor · EditFlow";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#09090b",
          backgroundImage:
            "linear-gradient(135deg, rgba(124, 58, 237, 0.34) 0%, rgba(9, 9, 11, 0) 55%, rgba(6, 182, 212, 0.24) 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              border: "1px solid rgba(167, 139, 250, 0.45)",
              background: "rgba(124, 58, 237, 0.18)",
              color: "#c4b5fd",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            {badgeText}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "64px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            {name}
          </div>
          <div style={{ fontSize: "30px", color: "#a1a1aa", lineHeight: 1.3 }}>
            {headline}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#71717a", fontSize: "22px" }}>
          <span>editflow.click/p/{slug}</span>
          <span>Portafolio público & Reels</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
