import fs from 'node:fs';
import path from 'node:path';
import sharp from './node_modules/sharp/dist/index.mjs';
import { writePsdBuffer, readPsd, initializeCanvas } from 'ag-psd';

initializeCanvas(
  (w,h)=>({width:w,height:h,getContext(){throw new Error('not needed');}}),
  (w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})
);

const root=path.resolve('../..');
const out=path.join(root,'output');
const preview=path.join(out,'Menjadi_Guru_Merdeka_Cover_Preview.png');
if(!fs.existsSync(preview))throw new Error('Preview cover tidak ditemukan');
const meta=await sharp(preview).metadata();
const W=Math.round(meta.width/2), H=Math.round(meta.height/2);

async function raw(input){
 const {data,info}=await sharp(input).resize(W,H).removeAlpha().ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return {data:new Uint8ClampedArray(data),width:info.width,height:info.height};
}
const flat=await raw(preview);
const resolutionInfo={horizontalResolution:150,horizontalResolutionUnit:'PPI',widthUnit:'Inches',verticalResolution:150,verticalResolutionUnit:'PPI',heightUnit:'Inches'};

// Simplest possible PSD for old Photoshop: RGB/8, one full-canvas layer,
// one merged composite, ASCII layer name, no Unicode names or cropped layers.
const safe={width:W,height:H,imageData:flat,resolutionInfo,children:[{name:'COVER FLAT - CS6 SAFE',imageData:flat}]};
const safePath=path.join(out,'Menjadi_Guru_Merdeka_Cover_CS6_SAFE.psd');
fs.writeFileSync(safePath,writePsdBuffer(safe,{compress:false,generateThumbnail:false}));

// Also provide a compatibility layered file. Every layer is full-canvas to avoid
// old-CS6 issues with cropped layer channel bounds. A flat layer stays on top.
const src=await import('./build_cover_layers.mjs').catch(()=>null);
let layeredPath=null;
if(src?.createCoverLayers){
 const items=await src.createCoverLayers(W,H);
 layeredPath=path.join(out,'Menjadi_Guru_Merdeka_Cover_CS6_LAYERED.psd');
 const children=[{name:'00 FLAT PREVIEW - HIDE TO EDIT',imageData:flat},...items.map((x,i)=>({name:String(i+1).padStart(2,'0')+' '+x.name.replace(/[^\x20-\x7E]/g,'-'),hidden:true,imageData:x.imageData}))];
 fs.writeFileSync(layeredPath,writePsdBuffer({width:W,height:H,imageData:flat,resolutionInfo,children},{compress:false,generateThumbnail:false}));
}

function verify(p){const b=fs.readFileSync(p);const d=readPsd(b,{useImageData:true,skipThumbnail:true});return {file:p,signature:b.subarray(0,4).toString('ascii'),version:b.readUInt16BE(4),width:d.width,height:d.height,composite:!!d.imageData,layers:(d.children||[]).map(x=>x.name),bytes:b.length};}
console.log(JSON.stringify({safe:verify(safePath),layered:layeredPath?verify(layeredPath):null},null,2));
