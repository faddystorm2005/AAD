import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Open Graph image for social sharing — what shows up on Facebook,
 * iMessage, Twitter, LinkedIn, etc. when someone pastes the site link.
 *
 * Standard OG dimensions are 1200x630. Generated at build time with the
 * real AAD logo + brand colors.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Austin Auto Detail — Mobile detailing services in Austin, TX";

export default function OpengraphImage() {
  const logo = readFileSync(
    join(process.cwd(), "public", "images", "aad", "logo.png")
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Ambient red glow at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "60%",
            display: "flex",
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(214, 32, 48, 0.28), transparent 70%)",
          }}
        />

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={220}
          height={220}
          alt=""
          style={{ objectFit: "contain", marginBottom: 30 }}
        />

        {/* Headline */}
        <div
          style={{
            display: "flex",
            color: "#fff",
            fontWeight: 800,
            fontSize: 64,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          AUSTIN AUTO DETAIL
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            color: "#d62030",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            marginTop: 12,
          }}
        >
          QUALITY OVER QUANTITY
        </div>

        {/* Subhead */}
        <div
          style={{
            display: "flex",
            color: "#c8c8c8",
            fontSize: 28,
            marginTop: 28,
            maxWidth: 900,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          Expert mobile detailing — we come to you.
        </div>

        {/* Bottom red accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background:
              "linear-gradient(90deg, transparent 0%, #d62030 20%, #d62030 80%, transparent 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
