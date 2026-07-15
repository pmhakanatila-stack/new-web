const labels={
  tumu:'Tümü',haberler:'Haberler',etkinlikler:'Etkinlikler',duyurular:'Duyurular',
  'basinda-biz':'Basında Biz',kurumsal:'Kurumsal',kurullar:'Kurullar',uyeler:'Üyeler',
  'kose-yazilari':'Köşe Yazıları','kose-yazarlari':'Köşe Yazarları','is-ilanlari':'İş İlanları',
  iletisim:'İletişim','hesap-numaralari':'Hesap Numaraları'
};
const preferredCategories=['tumu','haberler','etkinlikler','duyurular','kose-yazilari','is-ilanlari','basinda-biz','kurumsal'];
const params=new URLSearchParams(location.search);
let pages=[],active=params.get('cat')||'tumu';
const grid=document.querySelector('#archiveGrid');
const search=document.querySelector('#search');
const filters=document.querySelector('#filters');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
const categoryLabel=p=>labels[p.category]||p.type||p.category||'PEYZAJDER';

function render(){
  const q=search.value.toLocaleLowerCase('tr');
  const shown=pages.filter(p=>(active==='tumu'||p.category===active)&&`${p.title} ${p.summary||''} ${p.body||''}`.toLocaleLowerCase('tr').includes(q));
  grid.innerHTML=shown.map(p=>`<article class="archive-card ${p.image?'':'no-image'}" data-id="${esc(p.id)}" tabindex="0" role="link">
    <div class="archive-card-media">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`:''}</div>
    <div class="archive-card-content"><small>${esc(categoryLabel(p))}</small><h2>${esc(p.title)}</h2><p>${esc((p.summary||p.body||'PEYZAJDER içerik arşivi').slice(0,155))}</p><b>İçeriği incele →</b></div>
  </article>`).join('');
  document.querySelector('#empty').hidden=shown.length>0;
  grid.querySelectorAll('.archive-card').forEach(card=>{
    const open=()=>location.href=`content-detail.html?id=${encodeURIComponent(card.dataset.id)}`;
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
}

function renderFilters(categories){
  const available=new Set(categories);
  const ordered=[...preferredCategories.filter(x=>x==='tumu'||available.has(x)),...categories.filter(x=>!preferredCategories.includes(x))];
  if(active!=='tumu'&&!available.has(active))active='tumu';
  filters.innerHTML=ordered.map(c=>`<button class="${c===active?'active':''}" data-cat="${esc(c)}">${esc(labels[c]||c)}</button>`).join('');
  filters.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    active=button.dataset.cat;
    history.replaceState(null,'',active==='tumu'?'archive.html':`archive.html?cat=${encodeURIComponent(active)}`);
    filters.querySelector('.active')?.classList.remove('active');
    button.classList.add('active');
    render();
  }));
}

async function load(){
  try{
    const response=await fetch(apiPath('/api/public/archive'),{cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'İçerikler yüklenemedi');
    pages=Array.isArray(data.items)?data.items:[];
    document.querySelector('#pageCount').textContent=pages.length;
    document.querySelector('#imageCount').textContent=pages.filter(x=>x.image).length;
    renderFilters(Array.isArray(data.categories)?data.categories:[...new Set(pages.map(x=>x.category))]);
    render();
  }catch(error){
    grid.innerHTML=`<p>İçerikler yüklenemedi: ${esc(error.message)}. Lütfen sayfayı yenileyin.</p>`;
  }
}

search.addEventListener('input',render);
document.querySelector('#closeDetail')?.addEventListener('click',()=>document.querySelector('#detail')?.close());
load();
