import fs from 'node:fs';
import path from 'node:path';
import sharp from './node_modules/sharp/dist/index.mjs';
import { writePsdBuffer, readPsd } from 'ag-psd';

const source = 'C:/Users/USER/AppData/Local/Temp/codex-clipboard-3901dfd3-5905-4155-8a59-c87a778ea162.png';
const outDir = path.resolve('../../output');
const psdPath = path.join(outDir, 'Desain_Kemeja_SMKN69_Sesuai_Referensi.psd');
const previewPath = path.join(outDir, 'Desain_Kemeja_SMKN69_Sesuai_Referensi_Preview.png');
fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(source).metadata();
const W = meta.width, H = meta.height;
if (!W || !H) throw new Error('Ukuran sumber tidak dapat dibaca');

async function imageDataFrom(input, extract = null) {
  let pipeline = sharp(input).ensureAlpha();
  if (extract) pipeline = pipeline.extract(extract);
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

// Source is preserved pixel-for-pixel as the authoritative visual layer.
const original = await imageDataFrom(source);

// Separate front/back copies are included as convenience layers. They are hidden by
// default so opening the PSD remains exactly identical to the supplied reference.
const frontBox = { left: 25, top: 120, width: 690, height: 835 };
const backBox = { left: 700, top: 120, width: 675, height: 835 };
const front = await imageDataFrom(source, frontBox);
const back = await imageDataFrom(source, backBox);

// A transparent full-size annotation layer gives users a clearly named place for edits.
const transparent = new Uint8ClampedArray(W * H * 4);
const psd = {
  width: W,
  height: H,
  imageData: original,
  resolutionInfo: {
    horizontalResolution: 300,
    horizontalResolutionUnit: 'PPI',
    widthUnit: 'Inches',
    verticalResolution: 300,
    verticalResolutionUnit: 'PPI',
    heightUnit: 'Inches'
  },
  children: [
    { name: '03 EDIT AREA — tambahkan perubahan di sini', imageData: { data: transparent, width: W, height: H } },
    { name: '02 BACK — salinan terpisah', hidden: true, left: backBox.left, top: backBox.top, imageData: back },
    { name: '01 FRONT — salinan terpisah', hidden: true, left: frontBox.left, top: frontBox.top, imageData: front },
    { name: '00 REFERENSI ASLI — jangan diubah', imageData: original }
  ]
};

fs.copyFileSync(source, previewPath);
fs.writeFileSync(psdPath, writePsdBuffer(psd, { generateThumbnail: false, compress: true }));

const check = readPsd(fs.readFileSync(psdPath), {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true
});
console.log(JSON.stringify({
  source, psdPath, previewPath,
  width: check.width, height: check.height,
  layers: (check.children || []).map(x => ({ name: x.name, hidden: !!x.hidden })),
  bytes: fs.statSync(psdPath).size
}, null, 2));
