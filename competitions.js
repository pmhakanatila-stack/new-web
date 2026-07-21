const API=window.peyzajderApiPath?window.peyzajderApiPath('/api/public/competitions'):'/api/public/competitions';
const SPONSOR_API=window.peyzajderApiPath?window.peyzajderApiPath('/api/public/competition-sponsors'):'/api/public/competition-sponsors';
const platform='https://peyzajder.com';
const statusEl=document.querySelector('#competitionStatus');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=s=>{
  const source=String(s||'');
  return (new DOMParser().parseFromString(source,'text/html').body.textContent||'').replace(/\s+/g,' ').trim();
};
const pick=(item,keys)=>keys.map(k=>item?.[k]).find(Boolean)||'';
const asDate=v=>v?new Date(v).toLocaleDateString('tr-TR'):'Tarih duyurulacak';

function normalize(item){
  const title=plain(pick(item,['title','name','competition_title','baslik']))||'Yarışma';
  const summary=plain(pick(item,['summary','description','short_description','content','aciklama']))||'Detaylar dijital yarışma platformunda yayınlanır.';
  const image=pick(item,['image','cover','cover_image','thumbnail','poster']);
  const url=pick(item,['url','link','detail_url','slug']);
  const start=pick(item,['start_date','startDate','created_at','published_at']);
  const end=pick(item,['end_date','deadline','application_deadline','finish_date']);
  return {title,summary,image,url:url?new URL(String(url),platform).href:platform,start,end};
}

function emptyMessage(type){
  const text={
    active_competitions:'Şu anda yayında aktif yarışma bulunmuyor. Güncel yarışmalar için dijital platformu takip edebilirsiniz.',
    result_competitions:'Henüz yayınlanmış yarışma sonucu bulunmuyor.',
    completed_competitions:'Tamamlanan yarışma kaydı yayınlandığında burada listelenecek.'
  }[type];
  return `<article class="competition-empty"><span>PEYZAJDER</span><h3>${text}</h3><a class="text-link" href="${platform}" target="_blank" rel="noopener">Platforma git →</a></article>`;
}

function card(item,type){
  const x=normalize(item);
  const label=type==='active_competitions'?'Aktif yarışma':type==='result_competitions'?'Sonuçlandı':'Tamamlandı';
  return `<article class="competition-card">
    <div class="competition-media">${x.image?`<img src="${esc(x.image)}" alt="${esc(x.title)}">`:'<span>PEYZAJDER</span>'}</div>
    <div class="competition-copy">
      <small>${label}</small>
      <h3>${esc(x.title)}</h3>
      <p>${esc(x.summary)}</p>
      <div class="competition-meta"><span>Başlangıç: ${esc(asDate(x.start))}</span><span>Son tarih: ${esc(asDate(x.end))}</span></div>
      <a class="text-link" href="${esc(x.url)}" target="_blank" rel="noopener">Yarışmaya git <span>↗</span></a>
    </div>
  </article>`;
}

function sponsorCard(item){
  const url=item.url||'#';
  return `<a class="competition-sponsor-logo" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(item.name)}">
    ${item.logo?`<img src="${esc(item.logo)}" alt="${esc(item.name)}">`:`<span>${esc(item.name||'Sponsor')}</span>`}
  </a>`;
}

async function loadSponsors(){
  try{
    const res=await fetch(SPONSOR_API,{cache:'no-store'});
    const data=await res.json();
    const groups=Array.isArray(data.groups)?data.groups:[];
    const shell=document.querySelector('#competitionSponsors');
    const host=document.querySelector('#competitionSponsorGroups');
    if(!groups.length||!shell||!host)return;
    host.innerHTML=groups.map(group=>`<article class="sponsor-group">
      <h3>${esc(group.category)}</h3>
      <div>${group.items.map(sponsorCard).join('')}</div>
    </article>`).join('');
    shell.hidden=false;
  }catch{}
}

async function load(){
  try{
    const res=await fetch(API,{cache:'no-store'});
    const json=await res.json();
    if(!res.ok||json.success===false)throw new Error(json.error||'Yarışma verisi alınamadı');
    const data=json.data||{};
    ['active_competitions','result_competitions','completed_competitions'].forEach(type=>{
      const host=document.querySelector(`[data-list="${type}"]`);
      const list=Array.isArray(data[type])?data[type]:[];
      host.innerHTML=list.length?list.map(x=>card(x,type)).join(''):emptyMessage(type);
    });
    statusEl.textContent='Yarışma verileri dijital platformdan güncellendi.';
  }catch(err){
    statusEl.textContent='Yarışma verileri şu anda alınamadı. Platform bağlantısı aşağıda açık bırakıldı.';
    document.querySelectorAll('[data-list]').forEach(host=>host.innerHTML=emptyMessage(host.dataset.list));
  }
}

load();
loadSponsors();
