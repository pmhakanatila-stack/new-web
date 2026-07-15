const gate=document.querySelector('#writerGate'),app=document.querySelector('#writerApp'),msg=document.querySelector('#writerMessage'),list=document.querySelector('#writerList'),form=document.querySelector('#writerForm');
let currentEdit=null,items=[];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,opt){
  const url=window.peyzajderApiPath?window.peyzajderApiPath(path):path;
  const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...(opt||{})});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error||'İşlem başarısız');
  return d;
}
async function compressAndUploadImage(file){
  if(!file)return '';
  if(!file.type.startsWith('image/'))throw new Error('Lütfen görsel dosyası seçin');
  const img=await new Promise((resolve,reject)=>{
    const el=new Image(),url=URL.createObjectURL(file);
    el.onload=()=>{URL.revokeObjectURL(url);resolve(el)};
    el.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Görsel okunamadı'))};
    el.src=url;
  });
  const maxSide=1800,ratio=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));
  if(!blob)throw new Error('Görsel WebP formatına çevrilemedi');
  const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)});
  const uploaded=await api('/api/upload',{method:'POST',body:JSON.stringify({name:file.name.replace(/\.[^.]+$/,'.webp'),data})});
  return uploaded.url;
}
function showWriterPreview(url){
  document.querySelector('#writerImagePreview').remove();
  if(url)document.querySelector('#writerImagePath').insertAdjacentHTML('afterend',`<img id="writerImagePreview" class="writer-image-preview" src="${esc(url)}" alt="">`);
}
function resetForm(){
  currentEdit=null;
  form.reset();
  window.PeyzajRichEditor?.setValue(form.body,'');
  showWriterPreview('');
  form.querySelector('button').textContent='Onaya gönder →';
  msg.textContent='';
}
function draw(){
  list.innerHTML=items.length?items.map(x=>`<article>
    <div class="writer-item-main"><b>${esc(x.title)}</b><small>${new Date(x.updatedAt||x.createdAt).toLocaleDateString('tr-TR')}</small></div>
    <span>${esc(x.status||'Beklemede')}</span>
    <div class="writer-actions"><button type="button" data-edit="${esc(x.id)}">Düzenle</button><button type="button" data-delete="${esc(x.id)}">Sil</button></div>
  </article>`).join(''):'<p>Henüz yazı göndermediniz.</p>';
  list.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>editItem(btn.dataset.edit));
  list.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>deleteItem(btn.dataset.delete));
}
async function load(){
  try{
    const me=await api('/api/author/me');
    gate.hidden=true;app.hidden=false;document.querySelector('#writerName').textContent=`Merhaba, ${me.name}`;
    items=await api('/api/author/articles');
    draw();
  }catch{gate.hidden=false;app.hidden=true}
}
function editItem(id){
  const item=items.find(x=>x.id===id);
  if(!item)return;
  currentEdit=id;
  form.title.value=item.title||'';
  if(form.image)form.image.value=item.image||'';
  form.summary.value=item.summary||'';
  window.PeyzajRichEditor?.setValue(form.body,item.body||'');
  showWriterPreview(item.image||'');
  form.querySelector('button').textContent='Güncelle ve tekrar onaya gönder →';
  msg.textContent='Yazınızı düzenliyorsunuz. Kaydedince durum tekrar Beklemede olur.';
  form.scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteItem(id){
  const item=items.find(x=>x.id===id);
  if(!item||!confirm(`"${item.title}" yazısını silmek istiyor musunuz`))return;
  try{
    await api(`/api/author/articles/${id}`,{method:'DELETE'});
    msg.textContent='Yazı silindi.';
    if(currentEdit===id)resetForm();
    await load();
  }catch(err){msg.textContent=err.message}
}
form.addEventListener('submit',async e=>{
  e.preventDefault();
  window.PeyzajRichEditor?.sync(form.body);
  msg.textContent=currentEdit?'Yazınız güncelleniyor…':'Yazınız gönderiliyor…';
  try{
    const payload=JSON.stringify(Object.fromEntries(new FormData(e.target)));
    await api(currentEdit?`/api/author/articles/${currentEdit}`:'/api/author/articles',{method:currentEdit?'PUT':'POST',body:payload});
    msg.textContent=currentEdit?'Yazınız güncellendi ve tekrar onaya gönderildi.':'Yazınız moderatör onayına gönderildi.';
    resetForm();
    await load();
  }catch(err){msg.textContent=err.message}
});
document.querySelector('#writerImageFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    msg.textContent='Görsel WebP olarak hazırlanıyor…';
    const url=await compressAndUploadImage(file);
    document.querySelector('#writerImagePath').value=url;
    showWriterPreview(url);
    msg.textContent='Görsel WebP olarak yüklendi.';
  }catch(err){msg.textContent=err.message}
});
document.querySelector('#writerLogout').onclick=async()=>{await fetch(window.peyzajderApiPath?window.peyzajderApiPath('/api/logout'):'/api/logout');location.href='member-login.html'};
load();
