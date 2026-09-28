'use strict';
const $ = id => document.getElementById(id);
const platformNames = {steam:'Steam',playstation:'PlayStation',nintendo:'Nintendo'};
const platformFiles = {steam:'steam',playstation:'sony-playstation',nintendo:'nintendo-switch'};
const fieldLabels = {title:'ชื่อเกม',review:'รีวิวสั้น ๆ',favorite:'สิ่งที่ชอบที่สุด',verdict:'เหมาะกับใคร / ข้อสังเกต'};
const state = {title:$('title').value,platform:'steam',date:'',hours:'',status:'กำลังเล่น',review:'',favorite:'',verdict:'',author:'',rating:4,image:null,fit:'cover',zoom:1,panX:.5,panY:.5};
const now = new Date();
state.date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
$('date').value = state.date;
const assets = {};
let exportBusy = false, imageBusy = false, imageTicket = 0, toastTimer, currentEdit, textOverflow = false, lastExport;
function setMobileView(view){document.body.dataset.mobileView=view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));$('mobileSwitch').textContent=view==='editor'?'ดูตัวอย่าง':'กลับไปแก้ไข';}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{setMobileView(b.dataset.view);window.scrollTo({top:0,behavior:'smooth'})}));
$('mobileSwitch').addEventListener('click',()=>{setMobileView(document.body.dataset.mobileView==='editor'?'preview':'editor');window.scrollTo({top:0,behavior:'smooth'})});
function updateViewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--vv-height',`${v?.height||window.innerHeight}px`);document.documentElement.style.setProperty('--vv-top',`${v?.offsetTop||0}px`)}
window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);updateViewport();
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200)}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('อ่านภาพไม่สำเร็จ'));img.src=src})}
const ready = Promise.all([
  ...Object.entries({art:'cozy-art.png',steam:'steam.svg',playstation:'sony-playstation.svg',nintendo:'nintendo-switch.svg'}).map(async([key,file])=>{assets[key]=await loadImage(`assets/${file}`)}),
  document.fonts.load('400 32px CozyThai'),document.fonts.load('700 32px CozyThai'),document.fonts.load('400 64px CozySerif')
]);
function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function font(ctx,size,weight='400',family='CozyThai'){ctx.font=`${weight} ${size}px ${family}, Arial, sans-serif`;ctx.textBaseline='top'}
function text(ctx,str,x,y,size=30,color='#46533e',weight='400',family='CozyThai'){font(ctx,size,weight,family);ctx.fillStyle=color;ctx.fillText(str,x,y)}
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'grapheme'}):null;
function chars(str){return segmenter?Array.from(segmenter.segment(str),s=>s.segment):Array.from(str)}
function wrap(ctx,str,width){const result=[];for(const para of str.split('\n')){let line='';for(const char of chars(para)){if(line && ctx.measureText(line+char).width>width){result.push(line.trimEnd());line=char.trimStart()}else line+=char}result.push(line)}return result}
function textBlock(ctx,str,x,y,w,h,size=32,min=24,color='#46533e',weight='400',family='CozyThai'){
  if(!str)return;
  let lines,leading;
  do{font(ctx,size,weight,family);leading=size*1.6;lines=wrap(ctx,str,w);if(lines.length*leading<=h||size<=min)break;size-=1}while(size>=min);
  const maxLines=Math.max(1,Math.floor(h/leading));
  if(lines.length>maxLines){textOverflow=true;lines=lines.slice(0,maxLines);let last=lines[maxLines-1];while(last&&ctx.measureText(last+'…').width>w)last=chars(last).slice(0,-1).join('');lines[maxLines-1]=last+'…'}
  ctx.fillStyle=color;lines.forEach((line,i)=>ctx.fillText(line,x,y+i*leading));
}
function star(ctx,cx,cy,r,active){ctx.beginPath();for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,rad=j%2?r*.45:r;const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad;j?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fillStyle=active?'#ba8a4c':'#eee8d9';ctx.fill();ctx.strokeStyle=active?'#a67b42':'#c6c5ae';ctx.lineWidth=2;ctx.stroke()}
function cover(ctx,img,x,y,w,h){
  const base=state.fit==='contain'?Math.min(w/img.width,h/img.height):Math.max(w/img.width,h/img.height);
  const s=base*(state.fit==='contain'?1:state.zoom),iw=img.width*s,ih=img.height*s;
  const ox=state.fit==='contain'?(w-iw)/2:(w-iw)*state.panX,oy=state.fit==='contain'?(h-ih)/2:(h-ih)*state.panY;
  ctx.drawImage(img,x+ox,y+oy,iw,ih);
}
function render(canvas,scale=1){
  textOverflow=false;
  canvas.width=1080*scale;canvas.height=1920*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.fillStyle='#fcf8ee';ctx.fillRect(0,0,1080,1920);
  // Subtle paper grid and a double stationery border.
  ctx.fillStyle='#a4a17b13';for(let x=28;x<1080;x+=22)for(let y=28;y<1920;y+=22)ctx.fillRect(x,y,1.2,1.2);
  rounded(ctx,32,32,1016,1856,15,null,'#c0c5ad');rounded(ctx,44,44,992,1832,10,null,'#e0dfcc');
  text(ctx,'THE COZY GAME JOURNAL',86,87,23,'#7e856d');
  text(ctx,'Game review',82,128,66,'#4b5c42','400','CozySerif');
  if(assets.art)ctx.drawImage(assets.art,689,70,307,143);
  ctx.strokeStyle='#bac3a7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(86,222);ctx.lineTo(994,222);ctx.stroke();
  textBlock(ctx,state.title||'ชื่อเกมของคุณ',86,245,908,124,48,30,'#4d5a40','700');
  rounded(ctx,86,363,260,53,26,'#e8eddc');
  if(assets[state.platform])ctx.drawImage(assets[state.platform],107,372,35,35);
  text(ctx,platformNames[state.platform],153,375,25);
  let displayDate='';if(state.date){const date=new Date(state.date+'T12:00:00');if(!isNaN(date))displayDate=date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
  font(ctx,24);ctx.fillStyle='#7e806b';ctx.textAlign='right';ctx.fillText(displayDate,994,376);ctx.textAlign='left';
  // The image is clipped into a rectangular paper frame.
  rounded(ctx,81,443,918,571,9,'#fffdf8','#c6cbb5');
  ctx.save();ctx.beginPath();ctx.roundRect(96,458,888,541,4);ctx.clip();ctx.fillStyle='#e8ebde';ctx.fillRect(96,458,888,541);
  if(state.image)cover(ctx,state.image,96,458,888,541);else{
    if(assets.art)ctx.drawImage(assets.art,250,555,580,271);
    font(ctx,29);ctx.fillStyle='#7b866e';ctx.textAlign='center';ctx.fillText('ภาพเกมของคุณ',540,875);ctx.textAlign='left';
  }ctx.restore();
  ctx.save();ctx.translate(418,433);ctx.rotate(-.025);ctx.fillStyle='#cfb99188';ctx.fillRect(0,0,240,35);ctx.restore();
  text(ctx,'MY RATING',86,1054,21,'#83866f');for(let i=0;i<5;i++)star(ctx,350+i*66,1078,24,i<state.rating);
  text(ctx,`${state.rating} / 5`,758,1052,34,'#a77444','400','CozySerif');
  rounded(ctx,86,1126,908,73,12,'#edf0e4');text(ctx,'เวลาที่เล่น',111,1147,24,'#7f876f');
  text(ctx,state.hours!==''?`${state.hours} ชม.`:'—',268,1144,27);
  ctx.fillStyle='#ccd2be';ctx.fillRect(520,1144,2,35);text(ctx,state.status,557,1144,27);
  text(ctx,'QUICK REVIEW',86,1232,22,'#9b7157');
  rounded(ctx,86,1275,908,224,16,'#fffdf7','#d5d8c5');
  for(let y=1343;y<1470;y+=48){ctx.save();ctx.setLineDash([2,7]);ctx.strokeStyle='#dddccc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(111,y);ctx.lineTo(967,y);ctx.stroke();ctx.restore()}
  textBlock(ctx,state.review,112,1298,856,188,31,23);
  text(ctx,'สิ่งที่ชอบที่สุด',86,1532,25,'#9b7157');text(ctx,'เหมาะกับใคร / ข้อสังเกต',562,1532,25,'#9b7157');
  rounded(ctx,86,1576,432,183,14,'#edf0e4');rounded(ctx,562,1576,432,183,14,'#f3e9dc');
  textBlock(ctx,state.favorite,108,1596,388,150,29,23);textBlock(ctx,state.verdict,584,1596,388,150,29,23);
  ctx.beginPath();ctx.moveTo(86,1803);ctx.lineTo(994,1803);ctx.strokeStyle='#bfc7ae';ctx.lineWidth=1.5;ctx.stroke();
  text(ctx,'a little play, a little story.',86,1828,22,'#889076','400','CozySerif');
  if(state.author){font(ctx,24);ctx.textAlign='right';ctx.fillStyle='#647554';const a=state.author;let size=24;while(ctx.measureText(a).width>440&&size>15){font(ctx,--size)}ctx.fillText(a,994,1828);ctx.textAlign='left'}
}
function redraw(){render($('poster'));$('textWarning').hidden=!textOverflow;$('textWarning').textContent=textOverflow?'ข้อความบางช่องยาวเกินกรอบ กรุณาย่อข้อความหรือลดการขึ้นบรรทัดก่อนดาวน์โหลด':''}
function updateRating(){document.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.rating)<=state.rating)));$('ratingValue').textContent=`${state.rating} / 5`;redraw()}
document.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>{
  if(input.id==='hours'&&input.value!==''&&(Number(input.value)<0||Number(input.value)>99999))input.value=Math.min(99999,Math.max(0,Number(input.value)));
  state[input.dataset.field]=input.value;
  if(input.id==='platform')$('platformIcon').src=`assets/${platformFiles[state.platform]}.svg`;
  $('reviewCount').textContent=`${state.review.length} / 360`;redraw();
}));
document.querySelectorAll('[data-rating]').forEach(b=>b.addEventListener('click',()=>{state.rating=Number(b.dataset.rating);updateRating()}));
$('clearRating').addEventListener('click',()=>{state.rating=0;updateRating()});
['fit','zoom','panX','panY'].forEach(id=>$(id).addEventListener('input',()=>{state[id]=id==='fit'?$(id).value:Number($(id).value);$('cropControls').hidden=state.fit==='contain';redraw()}));
function setImageBusy(busy){imageBusy=busy;$('uploadBtn').disabled=busy;$('exportBtn').disabled=busy||exportBusy;$('topExport').disabled=busy||exportBusy;$('mobileExport').disabled=busy||exportBusy}
async function acceptImage(file){
  if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notify('กรุณาเลือกไฟล์ JPG, PNG หรือ WebP');return}
  if(file.size>20*1024*1024){notify('ภาพมีขนาดเกิน 20 MB กรุณาเลือกภาพที่เล็กลง');return}
  const ticket=++imageTicket;let url;setImageBusy(true);
  try{url=URL.createObjectURL(file);let img=await loadImage(url);if(ticket!==imageTicket)return;
    if(img.width*img.height>50000000)throw new Error('ภาพมีขนาดใหญ่มาก กรุณาย่อภาพก่อนใช้งาน');
    // Keep memory bounded for high-resolution exports, preserving enough detail for the frame.
    const largest=Math.max(img.width,img.height);if(largest>4000){const temp=document.createElement('canvas');temp.width=Math.round(img.width*4000/largest);temp.height=Math.round(img.height*4000/largest);temp.getContext('2d').drawImage(img,0,0,temp.width,temp.height);img=temp}
    state.image=img;state.zoom=1;state.panX=state.panY=.5;$('zoom').value='1';$('panX').value=$('panY').value='.5';
    $('fileName').textContent=file.name||'ภาพจากคลิปบอร์ด';$('imageTools').hidden=false;$('uploadBtn').querySelector('strong').textContent='เปลี่ยนภาพเกม';redraw();notify('ใส่ภาพแล้ว ปรับตำแหน่งภาพได้ด้านล่าง');
  }catch(e){notify(e.message||'ไม่สามารถอ่านภาพนี้ได้ กรุณาลองภาพอื่น')}finally{if(url)URL.revokeObjectURL(url);if(ticket===imageTicket)setImageBusy(false);$('file').value=''}
}
[$('uploadBtn'),$('posterUpload')].forEach(b=>b.addEventListener('click',()=>$('file').click()));
$('file').addEventListener('change',e=>acceptImage(e.target.files[0]));
$('removeImage').addEventListener('click',()=>{++imageTicket;setImageBusy(false);state.image=null;$('imageTools').hidden=true;$('uploadBtn').querySelector('strong').textContent='เลือกภาพเกมของคุณ';redraw()});
document.addEventListener('paste',e=>{const item=Array.from(e.clipboardData?.items||[]).find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();acceptImage(item.getAsFile())}});
document.addEventListener('dragover',e=>{if(Array.from(e.dataTransfer.types).includes('Files')){e.preventDefault();$('uploadBtn').classList.add('dragover')}});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)$('uploadBtn').classList.remove('dragover')});
document.addEventListener('drop',e=>{if(e.dataTransfer.files.length){e.preventDefault();$('uploadBtn').classList.remove('dragover');acceptImage(e.dataTransfer.files[0])}});
document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>{
  currentEdit=button.dataset.edit;const field=$(currentEdit);$('dialogTitle').textContent=fieldLabels[currentEdit];$('dialogText').value=field.value;$('dialogText').maxLength=field.maxLength;updateDialogCount();$('editDialog').showModal();$('dialogText').focus();
}));
function updateDialogCount(){$('dialogCount').textContent=`${$('dialogText').value.length} / ${$('dialogText').maxLength}`}
$('dialogText').addEventListener('input',updateDialogCount);$('closeDialog').addEventListener('click',()=>$('editDialog').close());
$('editForm').addEventListener('submit',e=>{e.preventDefault();const field=$(currentEdit);field.value=$('dialogText').value;field.dispatchEvent(new Event('input',{bubbles:true}));$('editDialog').close()});
$('editDialog').addEventListener('click',e=>{if(e.target===$('editDialog')){const r=$('editDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('editDialog').close()}});
async function exportImage(){
  if(exportBusy||imageBusy)return;exportBusy=true;setImageBusy(false);const original=$('exportBtn').innerHTML;$('exportBtn').textContent='กำลังเตรียมภาพ…';$('mobileExport').textContent='กำลังเตรียมภาพ…';let output;
  try{
    await ready;await document.fonts.ready;
    const scale=Number($('quality').value),format=$('format').value;output=document.createElement('canvas');render(output,scale);
    if(textOverflow)throw new Error('ข้อความยาวเกินกรอบ กรุณาย่อข้อความหรือลดการขึ้นบรรทัดก่อนดาวน์โหลด');
    const blob=await new Promise((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error('อุปกรณ์นี้ส่งออกภาพขนาดนี้ไม่ได้ ลองลดความละเอียด')),`image/${format}`,.98));
    const name=(state.title||'game-review').replace(/[\\/:*?"<>|\x00-\x1f]/g,'').slice(0,70);
    const fileName=`${name}-${1080*scale}x${1920*scale}.${format==='jpeg'?'jpg':'png'}`;
    const url=URL.createObjectURL(blob);
    if(window.matchMedia('(pointer: coarse), (max-width: 900px)').matches){
      if(lastExport)URL.revokeObjectURL(lastExport.url);
      const file=new File([blob],fileName,{type:blob.type});lastExport={url,file};
      $('exportPreview').src=url;$('downloadLink').href=url;$('downloadLink').download=fileName;
      $('saveDetails').textContent=`${1080*scale} × ${1920*scale} พิกเซล · ${format==='jpeg'?'JPG':'PNG'}`;
      let canShare=false;try{canShare=!!navigator.share&&!!navigator.canShare?.({files:[file]})}catch{}
      $('shareImage').hidden=!canShare;$('shareImage').disabled=false;$('saveError').textContent='';
      $('saveHelp').textContent=canShare?'แตะ “บันทึก / แชร์ภาพ” เพื่อเลือกปลายทาง หรือแตะค้างบนภาพเพื่อดูตัวเลือกบันทึก':'แตะค้างบนภาพเพื่อดูตัวเลือกบันทึก หรือกดดาวน์โหลดไฟล์ภาพ';
      $('saveDialog').showModal();
    }else{
      const a=document.createElement('a');a.href=url;a.download=fileName;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      notify(`เตรียมดาวน์โหลดภาพ ${1080*scale} × ${1920*scale} แล้ว`);
    }
  }catch(e){notify(e.message||'ส่งออกไม่สำเร็จ กรุณาลองลดความละเอียดแล้วดาวน์โหลดอีกครั้ง')}
  finally{if(output){output.width=1;output.height=1}exportBusy=false;setImageBusy(false);$('exportBtn').innerHTML=original;$('mobileExport').textContent='บันทึกภาพ ↓'}
}
$('exportBtn').addEventListener('click',exportImage);$('topExport').addEventListener('click',exportImage);$('mobileExport').addEventListener('click',exportImage);
$('closeSave').addEventListener('click',()=>$('saveDialog').close());
$('saveDialog').addEventListener('close',()=>{const old=lastExport;lastExport=null;$('exportPreview').removeAttribute('src');$('downloadLink').removeAttribute('href');if(old)setTimeout(()=>URL.revokeObjectURL(old.url),60000)});
$('shareImage').addEventListener('click',async()=>{
  if(!lastExport)return;$('shareImage').disabled=true;
  try{await navigator.share({files:[lastExport.file]});$('saveError').textContent='ส่งภาพไปยังตัวเลือกที่เลือกแล้ว'}
  catch(e){$('saveError').textContent=e.name==='AbortError'?'ยกเลิกแล้ว ภาพยังอยู่ที่นี่และบันทึกใหม่ได้':'เปิดตัวเลือกแชร์ไม่ได้ กรุณาดาวน์โหลดหรือแตะค้างบนภาพแทน'}
  finally{$('shareImage').disabled=false}
});
updateRating();ready.then(redraw).catch(()=>{notify('โหลดภาพตกแต่งหรือฟอนต์ไม่ครบ กรุณารีเฟรชหน้า');redraw()});
