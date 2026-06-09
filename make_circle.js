const sharp = require('sharp');

async function process() {
  const size = 1024;
  const padding = 100;
  const innerSize = size - (padding * 2);

  // Create a base circle filled with the brand orange
  const circleSvg = `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#F68537" /></svg>`;

  // Take the trimmed logo, scale it down slightly so it fits inside the circle
  await sharp('D:/warriors/chat-aap/assets/images/trimmed_logo.png')
    .resize({ width: innerSize, height: innerSize, fit: 'contain' })
    .toBuffer()
    .then(async (innerImg) => {
      // Composite the inner image onto the orange circle
      await sharp(Buffer.from(circleSvg))
        .composite([{ input: innerImg, gravity: 'center' }])
        .toFile('D:/warriors/chat-aap/assets/images/circular_logo.png');
    });

  console.log('Circular logo generated');
}

process().catch(console.error);
