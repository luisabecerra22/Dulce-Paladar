import sharp from 'sharp';

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F400A1"/>
      <stop offset="100%" style="stop-color:#C273E0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#g)"/>
  <text x="256" y="310" font-family="Georgia,serif" font-size="220" font-weight="bold" text-anchor="middle" fill="white" letter-spacing="-10">DP</text>
</svg>`);

await Promise.all([
  sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png'),
  sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png'),
  sharp(svg).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png'),
]);

console.log('Iconos PNG generados correctamente');
