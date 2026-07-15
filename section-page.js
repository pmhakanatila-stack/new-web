const sectionApi=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
const sectionEsc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sectionClean=s=>String(s||'').replace(/var\s+\w+\s*;?/gi,' ').replace(/google-site-verification=[^\s]+/gi,' ').replace(/Çağrı Merkezi\s*\d[\d\s]+/gi,' ').replace(/YÖNETİM Başkanın Mesajları/gi,' ').replace(/DERNEK ve ÜYELER Hakkımızda Banka Hesap Numaralarımız/gi,' ').replace(/Adres\s*:\s*Alaaddinbey Mah\.[\s\S]*?Bursa/gi,' ').replace(/E-Posta\s*:\s*bilgi@peyzajder\.org/gi,' ').replace(/Güncel haberler, duyurular ve ihalelerden anında haberdar ol/gi,' ').replace(/Bu internet sitesinde sizlere daha iyi hizmet sunulabilmesi için çerezler kullanılmaktadır\.?/gi,' ').replace(/\s+/g,' ').trim();
const sectionCfg={
  haberler:{label:'Haber',title:'Haberler',intro:'Mesleğin, sektörün ve kent yaşamının gündemini PEYZAJDER bakışıyla takip edin.',bodyClass:'is-news'},
  etkinlikler:{label:'Etkinlik',title:'Etkinlikler',intro:'Seminerleri, buluşmaları, saha çalışmalarını ve yaklaşan programları tek akışta keşfedin.',bodyClass:'is-events'},
  duyurular:{label:'Duyuru',title:'Duyurular',intro:'Üyelerimiz ve sektör için önemli çağrıları, tarihleri ve güncel bilgilendirmeleri kaçırmayın.',bodyClass:'is-notices'}
};
const category=document.body.dataset.category||'haberler',cfg=sectionCfg[category];
document.body.classList.add(cfg.bodyClass);
document.querySelector('[data-page-title]').textContent=cfg.title;
document.querySelector('[data-page-intro]').textContent=cfg.intro;
document.title=`${cfg.title} — PEYZAJDER`;
let sectionItems=[],sectionIndex=0,sectionTimer;
const detailUrl=x=>`content-detail.html?id=${encodeURIComponent(x.id)}`;
const itemText=x=>sectionClean(x.summary)||sectionClean(x.body)||'PEYZAJDER gündeminden güncel içerik.';
function renderFeature(){
  const item=sectionItems[sectionIndex];if(!item)return;
  document.querySelector('#sectionFeatured').innerHTML=`<div class="section-featured-media">${item.image?`<img src="${sectionEsc(item.image)}" alt="${sectionEsc(item.title)}">`:''}</div><div class="section-featured-copy"><small>${sectionEsc(cfg.label)} · PEYZAJDER</small><h2>${sectionEsc(item.title)}</h2><p>${sectionEsc(itemText(item))}</p><a href="${detailUrl(item)}">İçeriği incele →</a></div><div class="feature-controls">${sectionItems.slice(0,5).map((_,i)=>`<button class="${i===sectionIndex?'active':''}" data-feature="${i}" aria-label="${i+1}. içeriği göster"></button>`).join('')}</div>`;
  document.querySelectorAll('[data-feature]').forEach(b=>b.onclick=()=>{sectionIndex=Number(b.dataset.feature);renderFeature();restartFeature()});
}
function restartFeature(){clearInterval(sectionTimer);sectionTimer=setInterval(()=>{sectionIndex=(sectionIndex+1)%Math.min(5,sectionItems.length);renderFeature()},6500)}
function renderGrid(){
  const grid=document.querySelector('#sectionGrid');
  document.querySelector('[data-count]').textContent=`${sectionItems.length} içerik`;
  grid.innerHTML=sectionItems.length?sectionItems.map(x=>`<a class="section-card" href="${detailUrl(x)}"><div class="section-card-media">${x.image?`<img src="${sectionEsc(x.image)}" alt="${sectionEsc(x.title)}" loading="lazy">`:''}</div><div class="section-card-body"><small>${sectionEsc(cfg.label)} · ${x.date?new Date(x.date).toLocaleDateString('tr-TR'):''}</small><h3>${sectionEsc(x.title)}</h3><p>${sectionEsc(itemText(x))}</p><b>Devamını oku →</b></div></a>`).join(''):'<div class="section-empty">Bu bölüm için henüz yayınlanmış içerik bulunmuyor.</div>';
}
fetch(sectionApi('/api/public/archive'),{cache:'no-store'}).then(r=>r.json()).then(data=>{
  sectionItems=(data.items||[]).filter(x=>x.category===category).filter(x=>!new RegExp(`^${cfg.title}\\s*-?\\s*PEYZAJDER$`,'i').test(sectionClean(x.title))).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  if(sectionItems.length){renderFeature();restartFeature()}else document.querySelector('#sectionFeatured').innerHTML='<div class="section-empty">Öne çıkan içerik hazırlanıyor.</div>';
  renderGrid();
}).catch(()=>{document.querySelector('#sectionFeatured').innerHTML='<div class="section-empty">İçerikler şu anda yüklenemedi.</div>';renderGrid()});
