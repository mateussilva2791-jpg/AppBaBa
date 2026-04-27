// Generates PWA icon PNGs from an inline SVG using sharp.
import sharp from "sharp";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, "../public");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f1a14"/>
      <stop offset="100%" stop-color="#162419"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f0b429"/>
      <stop offset="60%" stop-color="#e8a020"/>
      <stop offset="100%" stop-color="#4ade80"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- Outer glow ring -->
  <rect x="32" y="32" width="448" height="448" rx="108"
        fill="none" stroke="#f0b429" stroke-width="3" opacity="0.18"/>

  <!-- Badge card -->
  <rect x="48" y="48" width="416" height="416" rx="96" fill="url(#badge)" filter="url(#glow)"/>

  <!-- Shine overlay -->
  <rect x="48" y="48" width="416" height="208" rx="96"
        fill="url(#shine)" opacity="0.5"/>
  <rect x="48" y="152" width="416" height="104" fill="url(#shine)" opacity="0.5"/>

  <!-- Football hex pattern subtle -->
  <circle cx="256" cy="256" r="88" fill="none" stroke="rgba(15,26,20,0.25)" stroke-width="1.5"/>
  <circle cx="256" cy="256" r="60" fill="none" stroke="rgba(15,26,20,0.18)" stroke-width="1"/>

  <!-- B letter -->
  <text x="256" y="340"
        font-family="system-ui, -apple-system, Arial Black, sans-serif"
        font-size="240"
        font-weight="900"
        fill="#0f1a14"
        text-anchor="middle"
        letter-spacing="-8"
        opacity="0.92">B</text>

  <!-- PRO badge bottom-right -->
  <rect x="310" y="350" width="118" height="44" rx="22"
        fill="#0f1a14" opacity="0.85"/>
  <text x="369" y="379"
        font-family="system-ui, -apple-system, Arial Black, sans-serif"
        font-size="26"
        font-weight="900"
        fill="#f0b429"
        text-anchor="middle"
        letter-spacing="3">PRO</text>
</svg>
`;

const sizes = [
  { name: "icon-512.png",       size: 512 },
  { name: "icon-192.png",       size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-48.png",        size: 48  },
];

const buf = Buffer.from(svg);

for (const { name, size } of sizes) {
  const outPath = join(publicDir, name);
  await sharp(buf, { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${name} (${size}x${size})`);
}

console.log("\nAll icons generated successfully.");
