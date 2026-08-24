const { app, nativeImage } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const resultPath = join(__dirname, 'pet-image-check.json');
app.setPath('userData', join(__dirname, '.pet-image-check-data'));
process.on('uncaughtException', (error) => {
  writeFileSync(resultPath, JSON.stringify({ error: error.message }), 'utf8');
  app.exit(1);
});

app.whenReady().then(() => {
  const directory = join(__dirname, '..', 'src', 'assets', 'pet-templates');
  const results = ['ao-yin.webp', 'little-dragon.webp'].map((fileName) => {
    const image = nativeImage.createFromPath(join(directory, fileName));
    return { fileName, empty: image.isEmpty(), size: image.getSize() };
  });
  writeFileSync(resultPath, JSON.stringify(results), 'utf8');
  app.quit();
});
