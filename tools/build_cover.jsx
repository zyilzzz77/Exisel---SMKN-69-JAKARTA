#target illustrator

(function () {
  var MM = 72 / 25.4;
  var trimW = 148 * MM, trimH = 210 * MM, spineW = 10 * MM, bleed = 3 * MM;
  var docW = trimW * 2 + spineW + bleed * 2;
  var docH = trimH + bleed * 2;
  var outFolder = new Folder("C:/Users/USER/Documents/EXISEL - EXTRAKULIKULER NAMSEL/output");
  if (!outFolder.exists) outFolder.create();

  var doc = app.documents.add(DocumentColorSpace.CMYK, docW, docH);
  doc.rulerOrigin = [0, 0];

  function cmyk(c, m, y, k) { var x = new CMYKColor(); x.cyan=c; x.magenta=m; x.yellow=y; x.black=k; return x; }
  var charcoal = cmyk(64,55,54,70), chalk = cmyk(3,3,7,0), yellow = cmyk(2,13,96,0);
  var pale = cmyk(4,5,10,0), dark = cmyk(62,54,51,84), gray = cmyk(25,19,18,4);

  function layer(name) { var l=doc.layers.add(); l.name=name; return l; }
  function rect(l, x, y, w, h, fill, stroke, sw) {
    var p=l.pathItems.rectangle(docH-y, x, w, h); p.filled=!!fill; if(fill)p.fillColor=fill;
    p.stroked=!!stroke; if(stroke){p.strokeColor=stroke;p.strokeWidth=sw||1;} return p;
  }
  function ellipse(l,x,y,w,h,fill,stroke,sw){var p=l.pathItems.ellipse(docH-y,x,w,h);p.filled=!!fill;if(fill)p.fillColor=fill;p.stroked=!!stroke;if(stroke){p.strokeColor=stroke;p.strokeWidth=sw||1;}return p;}
  function line(l,x1,y1,x2,y2,color,sw){var p=l.pathItems.add();p.setEntirePath([[x1,docH-y1],[x2,docH-y2]]);p.filled=false;p.stroked=true;p.strokeColor=color;p.strokeWidth=sw||1;p.strokeCap=StrokeCap.ROUNDENDCAP;return p;}
  function text(l, content, x, y, size, color, fontName, align, width, leading) {
    var t=l.textFrames.add(); t.contents=content; t.position=[x,docH-y];
    if(width){t.kind=TextType.AREATEXT; var box=rect(l,x,y-size,width,Math.max(size*2,leading||size*1.25),null,null); t=t.duplicate(); box.remove();}
    var a=t.textRange.characterAttributes; a.size=size; a.fillColor=color;
    try{a.textFont=app.textFonts.getByName(fontName||"ArialMT");}catch(e){a.textFont=app.textFonts.getByName("ArialMT");}
    if(leading)a.leading=leading;
    t.textRange.paragraphAttributes.justification=align||Justification.LEFT;
    return t;
  }
  function roundedRect(l,x,y,w,h,r,fill,stroke,sw){var p=l.pathItems.roundedRectangle(docH-y,x,w,h,r,r);p.filled=!!fill;if(fill)p.fillColor=fill;p.stroked=!!stroke;if(stroke){p.strokeColor=stroke;p.strokeWidth=sw||1;}return p;}

  var bg=layer("01 BACKGROUND - Tekstur papan tulis");
  rect(bg,0,0,docW,docH,charcoal,null);
  // Subtle deterministic chalk texture.
  for(var i=0;i<180;i++){
    var x=(i*97)%Math.floor(docW), y=(i*53)%Math.floor(docH), len=8+(i%31);
    var ln=line(bg,x,y,x+len,y+(i%5)-2,gray,0.35+(i%3)*0.15); ln.opacity=12+(i%9);
  }

  var guides=layer("00 GUIDES - Bleed, trim, spine (non-print)"); guides.printable=false;
  var backX=bleed, spineX=bleed+trimW, frontX=spineX+spineW;
  rect(guides,bleed,bleed,trimW,trimH,null,cmyk(100,0,0,0),0.6);
  rect(guides,spineX,bleed,spineW,trimH,null,cmyk(0,100,0,0),0.6);
  rect(guides,frontX,bleed,trimW,trimH,null,cmyk(100,0,0,0),0.6);

  var frontArt=layer("02 FRONT - Ilustrasi bohlam");
  var cx=frontX+trimW/2, bulbY=bleed+53*MM;
  ellipse(frontArt,cx-46*MM,bulbY,92*MM,92*MM,yellow,null);
  for(i=0;i<12;i++){
    var ang=(-160+i*29)*Math.PI/180;
    line(frontArt,cx+Math.cos(ang)*53*MM,bulbY+46*MM+Math.sin(ang)*53*MM,cx+Math.cos(ang)*64*MM,bulbY+46*MM+Math.sin(ang)*64*MM,chalk,4);
  }
  line(frontArt,cx-7*MM,bulbY+49*MM,cx-18*MM,bulbY+97*MM,dark,1.8);
  line(frontArt,cx+10*MM,bulbY+50*MM,cx-10*MM,bulbY+97*MM,dark,1.8);
  ellipse(frontArt,cx-10*MM,bulbY+44*MM,20*MM,17*MM,null,dark,1.8);
  for(i=0;i<3;i++) roundedRect(frontArt,cx-25*MM,bulbY+(90+i*8)*MM,50*MM,10*MM,4*MM,pale,dark,1.8);
  ellipse(frontArt,cx-10*MM,bulbY+113*MM,20*MM,13*MM,pale,dark,1.8);

  var frontCopy=layer("03 FRONT - Judul & penulis (editable)");
  text(frontCopy,"a² + b² = c²",frontX+13*MM,bleed+20*MM,11,chalk,"Arial-BoldMT");
  text(frontCopy,"✎",frontX+17*MM,bleed+145*MM,32,chalk,"ArialMT");
  text(frontCopy,"△",frontX+125*MM,bleed+151*MM,32,chalk,"ArialMT");
  var t1=text(frontCopy,"Menjadi",cx,bleed+150*MM,23,chalk,"Arial-BoldMT",Justification.CENTER); t1.position=[cx,docH-(bleed+150*MM)];
  var t2=text(frontCopy,"GURU",cx,bleed+171*MM,42,chalk,"Arial-BoldMT",Justification.CENTER); t2.position=[cx,docH-(bleed+171*MM)];
  var t3=text(frontCopy,"Merdeka",cx,bleed+198*MM,40,chalk,"Arial-BoldMT",Justification.CENTER); t3.position=[cx,docH-(bleed+198*MM)];
  roundedRect(frontCopy,frontX+26*MM,bleed+184*MM,96*MM,12*MM,3*MM,yellow,null);
  var sub=text(frontCopy,"yang Membawa Perubahan Besar",cx,bleed+193*MM,10,dark,"Arial-BoldMT",Justification.CENTER); sub.position=[cx,docH-(bleed+193*MM)];
  var au=text(frontCopy,"Joko Wahyono",frontX+trimW-13*MM,bleed+203*MM,11,chalk,"Arial-BoldMT",Justification.RIGHT); au.position=[frontX+trimW-13*MM,docH-(bleed+203*MM)];

  var publisher=layer("04 LOGO PENERBIT - placeholder editable");
  ellipse(publisher,frontX+123*MM,bleed+14*MM,10*MM,10*MM,yellow,null);
  text(publisher,"PENERBIT\nNARASI EDUKASI",frontX+107*MM,bleed+29*MM,6.5,chalk,"Arial-BoldMT",Justification.CENTER);

  var spine=layer("05 SPINE - editable");
  text(spine,"MENJADI GURU MERDEKA  •  JOKO WAHYONO",spineX+spineW/2,bleed+185*MM,10,chalk,"Arial-BoldMT",Justification.CENTER).rotate(90);
  ellipse(spine,spineX+2*MM,bleed+9*MM,6*MM,6*MM,yellow,null);

  var backHead=layer("06 BACK - Heading & ornamen");
  text(backHead,"GURU MERDEKA,\nPERUBAHAN NYATA",backX+16*MM,bleed+31*MM,25,chalk,"Arial-BoldMT",Justification.LEFT);
  roundedRect(backHead,backX+16*MM,bleed+57*MM,68*MM,5*MM,2*MM,yellow,null);
  ellipse(backHead,backX+105*MM,bleed+23*MM,25*MM,25*MM,yellow,null);
  line(backHead,backX+117.5*MM,bleed+30*MM,backX+117.5*MM,bleed+42*MM,dark,2);
  line(backHead,backX+111*MM,bleed+36*MM,backX+124*MM,bleed+36*MM,dark,2);

  var synopsis=layer("07 BACK - Sinopsis (editable)");
  var copy="Menjadi guru merdeka bukan hanya tentang bebas mengajar. Ini adalah keberanian untuk terus belajar, memahami setiap murid, dan menghadirkan pembelajaran yang bermakna.\r\rBuku ini mengajak pendidik menyalakan kembali semangat perubahan—dimulai dari ruang kelas, melalui langkah-langkah sederhana yang relevan, reflektif, dan berdampak. Sebab satu guru yang bergerak dapat membuka jalan bagi banyak masa depan.";
  var box=rect(synopsis,backX+16*MM,bleed+74*MM,116*MM,76*MM,null,null);
  var tf=synopsis.textFrames.areaText(box); tf.contents=copy;
  tf.textRange.characterAttributes.size=11.5; tf.textRange.characterAttributes.fillColor=chalk;
  try{tf.textRange.characterAttributes.textFont=app.textFonts.getByName("ArialMT");}catch(e){}
  tf.textRange.characterAttributes.leading=17;
  text(synopsis,"“Perubahan besar selalu dimulai dari keberanian untuk menyalakan satu cahaya.”",backX+16*MM,bleed+164*MM,11,yellow,"Arial-BoldItalicMT");

  var isbn=layer("08 BACK - ISBN & barcode placeholder");
  roundedRect(isbn,backX+16*MM,bleed+174*MM,62*MM,27*MM,2*MM,pale,null);
  for(i=0;i<36;i++){
    var bx=backX+(20+i*1.35)*MM; var bw=(i%5===0?1.1:(i%3===0?0.7:0.4))*MM;
    rect(isbn,bx,bleed+178*MM,bw,(i%4===0?15:17)*MM,dark,null);
  }
  text(isbn,"ISBN 978-623-0000-00-0",backX+21*MM,bleed+199*MM,6.5,dark,"ArialMT");
  text(isbn,"LOGO\nPENERBIT",backX+103*MM,bleed+184*MM,9,chalk,"Arial-BoldMT",Justification.CENTER);

  var info=layer("09 INFO PRODUKSI - editable / non-print"); info.printable=false;
  text(info,"A5 • 148 × 210 mm • bleed 3 mm • spine 10 mm • 300 ppi • CMYK",bleed,docH-1.5*MM,7,cmyk(100,0,0,0),"ArialMT");

  var aiFile=new File(outFolder.fsName+"/Menjadi_Guru_Merdeka_Cover_Master.ai");
  var aiOpt=new IllustratorSaveOptions(); aiOpt.pdfCompatible=true; doc.saveAs(aiFile,aiOpt);

  var psdFile=new File(outFolder.fsName+"/Menjadi_Guru_Merdeka_Cover_Edit.psd");
  var psd=new ExportOptionsPhotoshop(); psd.resolution=300; psd.writeLayers=true; psd.preserveTextEditability=true;
  psd.maximumEditability=true; psd.antiAliasing=true; psd.embedICCProfile=true; psd.imageColorSpace=ImageColorSpace.CMYK;
  doc.exportFile(psdFile,ExportType.PHOTOSHOP,psd);

  var pngFile=new File(outFolder.fsName+"/Menjadi_Guru_Merdeka_Cover_Preview.png");
  var png=new ExportOptionsPNG24(); png.antiAliasing=true; png.transparency=false; png.artBoardClipping=true; png.horizontalScale=35; png.verticalScale=35;
  doc.exportFile(pngFile,ExportType.PNG24,png);
  doc.close(SaveOptions.DONOTSAVECHANGES);
})();
