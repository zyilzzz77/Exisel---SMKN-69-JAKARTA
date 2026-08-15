import fs from 'node:fs';
import path from 'node:path';
import sharp from './node_modules/sharp/dist/index.mjs';
import { writePsdBuffer, readPsd, initializeCanvas } from 'ag-psd';

const W=3685,H=2551, SCALE=.5, PW=Math.round(W*SCALE), PH=Math.round(H*SCALE);
initializeCanvas(
 (w,h)=>({width:w,height:h,getContext(){throw new Error('Canvas context not required');}}),
 (w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})
);
const mm=300/25.4, bleed=3*mm, trim=148*mm, spine=10*mm;
const backX=bleed, spineX=bleed+trim, frontX=spineX+spine, trimH=210*mm;
const out=path.resolve('../../output'); fs.mkdirSync(out,{recursive:true});
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const svg=(body,bg='none')=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`);
const txt=(x,y,t,size,opts={})=>`<text x="${x}" y="${y}" fill="${opts.fill||'#f7f2e8'}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${opts.weight||400}" text-anchor="${opts.anchor||'start'}" letter-spacing="${opts.spacing||0}">${esc(t)}</text>`;
const lines=(x,y,arr,size,step,opts={})=>arr.map((t,i)=>txt(x,y+i*step,t,size,opts)).join('');

let texture=''; for(let i=0;i<520;i++){let x=(i*257)%W,y=(i*149)%H,l=18+(i%77);texture+=`<path d="M${x} ${y} l${l} ${(i%7)-3}" stroke="#8c8982" stroke-width="${1+(i%3)*.5}" opacity="${.04+(i%9)*.008}"/>`;}
const background=svg(texture,'#343434');

const cx=frontX+trim/2, bulbCy=bleed+665, bulbR=415;
let rays='';for(let i=0;i<12;i++){const a=(-160+i*29)*Math.PI/180;const x1=cx+Math.cos(a)*515,y1=bulbCy+Math.sin(a)*515,x2=cx+Math.cos(a)*615,y2=bulbCy+Math.sin(a)*615;rays+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f7f2e8" stroke-width="30" stroke-linecap="round"/>`;}
const frontArt=svg(`${rays}<circle cx="${cx}" cy="${bulbCy}" r="${bulbR}" fill="#ffd400"/><path d="M${cx-72} ${bulbCy+25} C${cx-205} ${bulbCy-115},${cx-210} ${bulbCy+230},${cx-165} ${bulbCy+430} M${cx+88} ${bulbCy+25} C${cx+225} ${bulbCy-110},${cx-45} ${bulbCy+280},${cx-90} ${bulbCy+430}" fill="none" stroke="#343434" stroke-width="17"/><g fill="#f4efe6" stroke="#343434" stroke-width="17">${[0,1,2].map(i=>`<rect x="${cx-245}" y="${bulbCy+395+i*70}" width="490" height="86" rx="40"/>`).join('')}<path d="M${cx-100} ${bulbCy+600}h200v62a100 100 0 0 1-200 0z"/></g><g fill="none" stroke="#f7f2e8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M${frontX+165} 1540 l135 135 l-45 12 l-102-102 z M${frontX+165} 1540 l-18 -45 l45 18 z"/><path d="M${frontX+1420} 1525 l120 120 l-150 0 z M${frontX+1420} 1525 l0 120"/><path d="M${frontX+130} 2305 q55 -80 110 0 t110 0 t110 0"/></g>`);

const frontText=svg(`${txt(frontX+150,bleed+185,'a² + b² = c²',48,{weight:700})}${txt(cx,bleed+1515,'Menjadi',92,{weight:700,anchor:'middle'})}${txt(cx,bleed+1725,'GURU',185,{weight:700,anchor:'middle'})}${txt(cx,bleed+1945,'Merdeka',172,{weight:700,anchor:'middle'})}<rect x="${frontX+300}" y="${bleed+2005}" width="${trim-600}" height="105" rx="20" fill="#ffd400"/>${txt(cx,bleed+2078,'yang Membawa Perubahan Besar',44,{fill:'#343434',weight:700,anchor:'middle'})}${txt(frontX+trim-150,bleed+2415,'Joko Wahyono',55,{weight:700,anchor:'end'})}${txt(frontX+trim-160,bleed+170,'●',70,{fill:'#ffd400',anchor:'end'})}${lines(frontX+trim-120,bleed+210,['PENERBIT','NARASI EDUKASI'],25,30,{weight:700,anchor:'end'})}`);

const spineLayer=svg(`<g transform="translate(${spineX+spine/2},${H/2}) rotate(-90)">${txt(0,0,'MENJADI GURU MERDEKA  •  JOKO WAHYONO',46,{weight:700,anchor:'middle'})}</g><circle cx="${spineX+spine/2}" cy="${bleed+95}" r="34" fill="#ffd400"/>`);

const backArt=svg(`${lines(backX+170,bleed+310,['GURU MERDEKA,','PERUBAHAN NYATA'],112,125,{weight:700})}<rect x="${backX+170}" y="${bleed+575}" width="760" height="35" rx="17" fill="#ffd400"/><circle cx="${backX+trim-320}" cy="${bleed+310}" r="150" fill="#ffd400"/><path d="M${backX+trim-320} ${bleed+235}v150 M${backX+trim-395} ${bleed+310}h150" stroke="#343434" stroke-width="25" stroke-linecap="round"/>`);

const synopsis=[
'Menjadi guru merdeka bukan hanya tentang bebas mengajar.',
'Ini adalah keberanian untuk terus belajar, memahami setiap',
'murid, dan menghadirkan pembelajaran yang bermakna.',
'',
'Buku ini mengajak pendidik menyalakan kembali semangat',
'perubahan—dimulai dari ruang kelas, melalui langkah-langkah',
'sederhana yang relevan, reflektif, dan berdampak. Sebab satu',
'guru yang bergerak dapat membuka jalan bagi banyak masa depan.'
];
const backText=svg(`${lines(backX+170,bleed+805,synopsis,45,75,{})}${lines(backX+170,bleed+1620,['“Perubahan besar selalu dimulai dari keberanian','untuk menyalakan satu cahaya.”'],48,65,{fill:'#ffd400',weight:700})}${lines(backX+trim-320,bleed+2180,['LOGO','PENERBIT'],40,48,{weight:700,anchor:'middle'})}`);

let bars='';for(let i=0;i<46;i++){let xx=backX+220+i*18,ww=(i%5===0?10:i%3===0?6:3),hh=(i%4===0?220:250);bars+=`<rect x="${xx}" y="${bleed+2040}" width="${ww}" height="${hh}" fill="#262626"/>`;}
const barcode=svg(`<rect x="${backX+170}" y="${bleed+1980}" width="950" height="390" rx="18" fill="#f7f2e8"/>${bars}${txt(backX+230,bleed+2350,'ISBN 978-623-0000-00-0',30,{fill:'#262626'})}`);

const guideSvg=svg(`<g fill="none"><rect x="${bleed}" y="${bleed}" width="${trim}" height="${trimH}" stroke="#00bcd4" stroke-width="5"/><rect x="${spineX}" y="${bleed}" width="${spine}" height="${trimH}" stroke="#ff00a8" stroke-width="5"/><rect x="${frontX}" y="${bleed}" width="${trim}" height="${trimH}" stroke="#00bcd4" stroke-width="5"/></g>${txt(25,H-18,'A5 • 148 × 210 mm • bleed 3 mm • spine 10 mm • 300 ppi',28,{fill:'#00bcd4',weight:700})}`);

async function rawLayer(name,buf,hidden=false,bounds=null){let img=sharp(buf).ensureAlpha().resize(PW,PH);let left=0,top=0;if(bounds){left=Math.max(0,Math.floor(bounds[0]*SCALE));top=Math.max(0,Math.floor(bounds[1]*SCALE));const width=Math.min(PW-left,Math.ceil(bounds[2]*SCALE)),height=Math.min(PH-top,Math.ceil(bounds[3]*SCALE));img=img.extract({left,top,width,height});}const {data,info}=await img.raw().toBuffer({resolveWithObject:true});return {name,hidden,left,top,imageData:{data:new Uint8ClampedArray(data),width:info.width,height:info.height}};}
const layers=[];
for(const [n,b,h,box] of [
 ['08 BACK — ISBN & barcode placeholder',barcode,false,[120,1900,1100,600]],
 ['07 BACK — Sinopsis',backText,false,[120,650,1600,1800]],
 ['06 BACK — Heading & ornamen',backArt,false,[120,120,1650,650]],
 ['05 SPINE — Judul',spineLayer,false,[spineX-10,40,spine+20,H-80]],
 ['04 FRONT — Judul, subjudul, penulis',frontText,false,[frontX,30,trim,H-40]],
 ['03 FRONT — Ilustrasi bohlam',frontArt,false,[frontX,250,trim,1900]],
 ['01 BACKGROUND — Tekstur papan tulis',background,false,null]
]) layers.push(await rawLayer(n,b,h,box));

const composite=await sharp(background).composite([frontArt,frontText,spineLayer,backArt,backText,barcode].map(input=>({input}))).png().toBuffer();
fs.writeFileSync(path.join(out,'Menjadi_Guru_Merdeka_Cover_Preview.png'),composite);
// Include a complete composite image. Some Photoshop versions report PSDs with
// only layer channels and no merged composite as damaged or incompatible.
const compositeData=await rawLayer('composite',composite,false,null);
const psd={
 width:PW,height:PH,
 imageData:compositeData.imageData,
 resolutionInfo:{horizontalResolution:150,horizontalResolutionUnit:'PPI',widthUnit:'Inches',verticalResolution:150,verticalResolutionUnit:'PPI',heightUnit:'Inches'},
 children:layers
};
const psdPath=path.join(out,'Menjadi_Guru_Merdeka_Cover_Edit.psd');
const backupPath=path.join(out,'Menjadi_Guru_Merdeka_Cover_Edit_corrupt-backup.psd');
if(fs.existsSync(psdPath)&&!fs.existsSync(backupPath))fs.copyFileSync(psdPath,backupPath);
fs.writeFileSync(psdPath,writePsdBuffer(psd,{generateThumbnail:false,compress:false}));
const verify=readPsd(fs.readFileSync(psdPath),{useImageData:true,skipLayerImageData:true,skipThumbnail:true});
console.log(JSON.stringify({psd:psdPath,backup:backupPath,preview:path.join(out,'Menjadi_Guru_Merdeka_Cover_Preview.png'),psdWidth:verify.width,psdHeight:verify.height,hasComposite:!!verify.imageData,compositeBytes:verify.imageData?.data?.length||0,layers:(verify.children||[]).map(x=>x.name),bytes:fs.statSync(psdPath).size},null,2));
