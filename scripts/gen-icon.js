// Generator ikony aplikacji BabyLog — bobas na białym tle z inicjałami BL.
// Uruchomienie: node scripts/gen-icon.js
const sharp = require('sharp');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'images');

// Rysunek w układzie 1024x1024 (środek 512,512)
const art = `
    <!-- ciałko (różowy śliniak/kombinezon) -->
    <ellipse cx="512" cy="812" rx="252" ry="168" fill="#F9C6C9"/>
    <!-- rączki -->
    <circle cx="300" cy="800" r="52" fill="#FFDFC4"/>
    <circle cx="724" cy="800" r="52" fill="#FFDFC4"/>
    <!-- uszy -->
    <circle cx="266" cy="492" r="46" fill="#FFDFC4"/>
    <circle cx="758" cy="492" r="46" fill="#FFDFC4"/>
    <circle cx="266" cy="492" r="22" fill="#F5C8A8"/>
    <circle cx="758" cy="492" r="22" fill="#F5C8A8"/>
    <!-- główka -->
    <circle cx="512" cy="486" r="248" fill="#FFDFC4"/>
    <!-- kosmyk włosów -->
    <path d="M500 236 q-14 -74 62 -84 q64 -8 56 54"
          stroke="#7A5236" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M560 176 q40 -18 58 16"
          stroke="#7A5236" stroke-width="22" fill="none" stroke-linecap="round"/>
    <!-- oczka -->
    <circle cx="432" cy="472" r="27" fill="#33302E"/>
    <circle cx="592" cy="472" r="27" fill="#33302E"/>
    <circle cx="441" cy="463" r="9" fill="#FFFFFF"/>
    <circle cx="601" cy="463" r="9" fill="#FFFFFF"/>
    <!-- policzki -->
    <circle cx="386" cy="556" r="40" fill="#FFB9A3" opacity="0.8"/>
    <circle cx="638" cy="556" r="40" fill="#FFB9A3" opacity="0.8"/>
    <!-- uśmiech -->
    <path d="M452 574 q60 58 120 0"
          stroke="#33302E" stroke-width="19" fill="none" stroke-linecap="round"/>
`;

function artSvg(inner, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`;
}

async function main() {
  // 1. Ikona główna — białe tło, bobas, inicjały BL
  const iconSvg = artSvg(
    `${art}
     <text x="512" y="1006" text-anchor="middle"
           font-family="Arial, Helvetica, sans-serif" font-weight="bold"
           font-size="150" fill="#34C759" letter-spacing="10">BL</text>`,
    1024
  );
  await sharp(Buffer.from(iconSvg)).png().toFile(path.join(outDir, 'icon.png'));
  console.log('OK icon.png');

  // 2. Android adaptive — foreground na przezroczystym tle,
  //    rysunek zmniejszony do bezpiecznej strefy (~66%)
  const fgInner = `<g transform="translate(174 130) scale(0.66)">
      ${art.replace('\n', '')}
      <text x="512" y="1006" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-weight="bold"
            font-size="150" fill="#34C759" letter-spacing="10">BL</text>
    </g>`;
  await sharp(Buffer.from(artSvg(fgInner, 1024)))
    .png()
    .toFile(path.join(outDir, 'android-icon-foreground.png'));
  console.log('OK android-icon-foreground.png');

  // 3. Android adaptive — tło białe
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="1024" height="1024" fill="#FFFFFF"/></svg>`;
  await sharp(Buffer.from(bgSvg))
    .png()
    .toFile(path.join(outDir, 'android-icon-background.png'));
  console.log('OK android-icon-background.png');

  // 4. Monochrome — czarny kontur na przezroczystym tle
  const monoArt = art
    .replace(/#FFDFC4/g, '#000000')
    .replace(/#F5C8A8/g, '#000000')
    .replace(/#F9C6C9/g, '#000000')
    .replace(/#FFB9A3/g, 'none')
    .replace(/#33302E/g, '#FFFFFF')
    .replace(/#7A5236/g, '#000000');
  const monoInner = `<g transform="translate(174 130) scale(0.66)" opacity="0.9">
      ${monoArt}
      <text x="512" y="1006" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-weight="bold"
            font-size="150" fill="#000000" letter-spacing="10">BL</text>
    </g>`;
  await sharp(Buffer.from(artSvg(monoInner, 1024)))
    .png()
    .toFile(path.join(outDir, 'android-icon-monochrome.png'));
  console.log('OK android-icon-monochrome.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
