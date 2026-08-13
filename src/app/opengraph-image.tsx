import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The image people actually see when this link is pasted into a text, iMessage,
 * Facebook or a Google Business post.
 *
 * It used to be /images/aad/cta-king-ranch.jpg, declared in metadata as
 * 1200x630. That file is 895x1600, a portrait phone photo of a truck interior.
 * Every platform crops to the declared 1.91:1, so what actually rendered was a
 * thin horizontal slice through the middle of the cab: no logo, no business
 * name, no phone number, and nothing telling anyone what the business does.
 *
 * Built at the real 1200x630 instead, on the same black the site uses, so the
 * logo's own black background disappears into it and reads as one badge.
 */

export const alt =
  "Signature Mobile Detailing. Mobile car detailing in Phoenix, Arizona.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(
    join(process.cwd(), "public/images/aad/logo.png")
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 84px",
          background: "#000000",
          color: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={340}
          height={340}
          alt="Signature Mobile Detailing"
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 8,
              color: "#d4a24c",
              textTransform: "uppercase",
            }}
          >
            Phoenix, Arizona
          </div>

          {/* The logo already carries the business name, so this says the thing
              the logo does not: what they do and that they travel to you. */}
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              marginTop: 18,
              lineHeight: 1.1,
              maxWidth: 620,
            }}
          >
            Mobile detailing that comes to you.
          </div>

          <div style={{ fontSize: 27, color: "#d1d5db", marginTop: 22 }}>
            Interior, exterior, ceramic coating, paint correction.
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              color: "#f6d379",
              marginTop: 26,
            }}
          >
            (480) 793-3782
          </div>

          <div
            style={{
              width: 120,
              height: 5,
              background: "#d4a24c",
              marginTop: 28,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
