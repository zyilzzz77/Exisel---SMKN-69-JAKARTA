import sharp from './node_modules/sharp/dist/index.mjs';
import path from 'node:path';

const root=path.resolve('../..');
const preview=path.join(root,'output','Menjadi_Guru_Merdeka_Cover_Preview.png');

function transparentSvg(W,H,body){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);}
async function toRaw(buf,W,H){const {data,info}=await sharp(buf).resize(W,H).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8ClampedArray(data),width:info.width,height:info.height};}

export async function createCoverLayers(W,H){
 // Conservative full-canvas editable regions for CS6. These layers duplicate
 // major visual zones from the validated preview while retaining transparency.
 const source=sharp(preview).resize(W,H).ensureAlpha();
 const full=await source.png().toBuffer();
 const backMask=transparentSvg(W,H,`<rect width="${Math.round(W*.475)}" height="${H}" fill="white"/>`);
 const spineMask=transparentSvg(W,H,`<rect x="${Math.round(W*.475)}" width="${Math.round(W*.05)}" height="${H}" fill="white"/>`);
 const frontMask=transparentSvg(W,H,`<rect x="${Math.round(W*.525)}" width="${W-Math.round(W*.525)}" height="${H}" fill="white"/>`);
 async function masked(mask){const b=await sharp(full).joinChannel(await sharp(mask).extractChannel(3).raw().toBuffer(),{raw:{width:W,height:H,channels:1}}).png().toBuffer().catch(async()=>full);return toRaw(b,W,H);}
 // Produce exact full-size RGBA copies with transparent zones using SVG clip masks.
 async function cropZone(x,w){const zone=await sharp(full).extract({left:x,top:0,width:w,height:H}).png().toBuffer();const canvas=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:zone,left:x,top:0}]).png().toBuffer();return toRaw(canvas,W,H);}
 const bx=0,bw=Math.round(W*.475),sx=bw,sw=Math.round(W*.05),fx=sx+sw,fw=W-fx;
 return [
  {name:'FRONT COVER',imageData:await cropZone(fx,fw)},
  {name:'SPINE',imageData:await cropZone(sx,sw)},
  {name:'BACK COVER',imageData:await cropZone(bx,bw)}
 ];
}
