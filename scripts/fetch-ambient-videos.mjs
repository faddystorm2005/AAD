// Downloads the Higgsfield ambient cinemagraphs (made from our own photos)
// into public/images/aad/. Run from the project root: node scripts/fetch-ambient-videos.mjs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3ENy9z0AJL4QozxiSHP5e8q0g3Y/hf_20260710_070624_c093027c-2c0c-4f44-96a1-83866d92da55.mp4",
    to: "public/images/aad/hero-s-class-loop.mp4",
  },
  {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_3ENy9z0AJL4QozxiSHP5e8q0g3Y/hf_20260710_070656_085f5762-77c1-4e03-94b7-40aa96d062c6.mp4",
    to: "public/images/aad/foam-loop.mp4",
  },
];

for (const f of FILES) {
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(`${f.url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(ROOT, f.to), buf);
  console.log(`saved ${f.to} (${Math.round(buf.length / 1024)} KB)`);
}
console.log("Ambient videos saved.");
