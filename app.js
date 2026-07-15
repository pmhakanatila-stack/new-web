const menuToggle=document.querySelector('.menu-toggle');
const mainNav=document.querySelector('.main-nav');
const mobileMenu=()=>window.matchMedia('(max-width:950px)').matches;
function prepareMobileSubmenus(){
  mainNav?.querySelectorAll('.nav-dropdown').forEach(group=>{
    const trigger=group.querySelector(':scope>.nav-tile');
    if(trigger){trigger.setAttribute('aria-haspopup','true');trigger.setAttribute('aria-expanded',String(group.classList.contains('submenu-open')))}
  });
}
function closeMobileMenu(){
  mainNav?.classList.remove('open');
  mainNav?.querySelectorAll('.submenu-open').forEach(group=>group.classList.remove('submenu-open'));
  mainNav?.querySelectorAll('[aria-expanded]').forEach(link=>link.setAttribute('aria-expanded','false'));
  document.body.classList.remove('mobile-menu-open');
  if(menuToggle){menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Menüyü aç');menuToggle.textContent='☰'}
}
if(menuToggle&&mainNav){
  prepareMobileSubmenus();
  menuToggle.setAttribute('aria-expanded','false');
  menuToggle.addEventListener('click',()=>{
    const willOpen=!mainNav.classList.contains('open');
    if(!willOpen){closeMobileMenu();return}
    mainNav.classList.add('open');document.body.classList.add('mobile-menu-open');menuToggle.setAttribute('aria-expanded','true');menuToggle.setAttribute('aria-label','Menüyü kapat');menuToggle.textContent='×';
  });
  mainNav.addEventListener('click',event=>{
    const link=event.target.closest('a');if(!link||!mobileMenu())return;
    const group=link.parentElement?.classList.contains('nav-dropdown')?link.parentElement:null;
    if(group&&link.classList.contains('nav-tile')){
      event.preventDefault();
      const opening=!group.classList.contains('submenu-open');
      mainNav.querySelectorAll('.nav-dropdown.submenu-open').forEach(item=>{if(item!==group){item.classList.remove('submenu-open');item.querySelector(':scope>.nav-tile')?.setAttribute('aria-expanded','false')}});
      group.classList.toggle('submenu-open',opening);link.setAttribute('aria-expanded',String(opening));
      if(opening)setTimeout(()=>group.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
      return;
    }
    closeMobileMenu();
  });
  document.addEventListener('click',event=>{if(mobileMenu()&&mainNav.classList.contains('open')&&!event.target.closest('.site-header'))closeMobileMenu()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobileMenu()});
  window.addEventListener('resize',()=>{if(!mobileMenu())closeMobileMenu()});
}
const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):String(path||'');

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }
}),{threshold:.12});

document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
document.querySelectorAll('.focus-grid article,.news-card').forEach((el,i)=>el.style.setProperty('--delay',`${i*70}ms`));

const streamLabels={haberler:'Haber',etkinlikler:'Etkinlik',duyurular:'Duyuru'};
const streamEsc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cleanText(value){
  return String(value||'')
    .replace(/var\s+approachingEvent;/gi,'')
    .replace(/var\s+content_slider;/gi,'')
    .replace(/google-site-verification=[^\s]+/gi,'')
    .replace(/Çağrı Merkezi\s*\d[\d\s]+/gi,'')
    .replace(/Çağrı Merkezi\s*\d[\d\s]+/gi,'')
    .replace(/YÖNETİM Başkanın Mesajları/gi,'')
    .replace(/YÖNETİM Başkanın Mesajları/gi,'')
    .replace(/DERNEK ve ÜYELER Hakkımızda Banka Hesap Numaralarımız/gi,'')
    .replace(/DERNEK ve ÜYELER Hakkımızda Banka Hesap Numaralarımız/gi,'')
    .replace(/DERNEK[\s\S]{0,120}Banka Hesap Numaralar[ıiı]*m[ıiı]*z/gi,'')
    .replace(/Adres\s*:\s*Alaaddinbey Mah\.[^]+Bursa/gi,'')
    .replace(/E-Posta\s*:\s*bilgi@peyzajder\.org/gi,'')
    .replace(/Güncel haberler, duyurular ve ihalelerden anında haberdar ol/gi,'')
    .replace(/Bu internet sitesinde sizlere daha iyi hizmet sunulabilmesi için çerezler kullanılmaktadır\./gi,'')
    .replace(/\s+/g,' ')
    .trim();
}
const excerpt=(x,limit=125)=>{const text=cleanText(x.summary)||cleanText(x.body)||'PEYZAJDER gündeminden güncel içerik';return streamEsc(text.length>limit?`${text.slice(0,Math.max(0,limit-3)).trim()}...`:text)};
const featuredFallbackImage='assets/hero-landscape-award.png';
const featuredCategoryLinks={Haber:'news.html',Etkinlik:'events.html',Duyuru:'notices.html',Gündem:'news.html'};
const streamFallbackLinks={haberler:'news.html',etkinlikler:'events.html',duyurular:'notices.html'};

function prepareStreams(){
  const first=document.querySelector('.stream-column');
  if(first){
    first.classList.remove('stream-press');
    first.classList.add('stream-news');
    first.querySelector('small').textContent='GÜNCEL HABERLER';
    first.querySelector('h3').textContent='Haberler';
    const allLink=first.querySelector('header a');
    if(allLink)allLink.href=streamFallbackLinks.haberler;
    const target=first.querySelector('[data-stream]');
    if(target)target.dataset.stream='haberler';
  }
  document.querySelectorAll('[data-stream]').forEach(container=>{
    const link=container.closest('.stream-column')?.querySelector('header a');
    if(link&&streamFallbackLinks[container.dataset.stream])link.href=streamFallbackLinks[container.dataset.stream];
  });
  const heading=document.querySelector('.streams-heading');
  if(heading){
    const streamTitle=heading.querySelector('h2');
    if(streamTitle)streamTitle.textContent='Peyzajder Gündemi';
    const p=heading.querySelector(':scope > p');
    if(p)p.remove();
  }
  const streams=document.querySelector('.home-streams');
  if(streams&&!document.querySelector('#editorialDrawer')){
    streams.insertAdjacentHTML('beforeend','<aside class="editorial-drawer" id="editorialDrawer" hidden></aside>');
  }
}

function renderStream(container,category,items){
  container.innerHTML=items.length?items.slice(0,4).map((p,i)=>`
    <article class="stream-item" style="--i:${i}" onclick="location.href='${streamEsc(p.url||streamFallbackLinks[category]||'archive.html')}'" role="link" tabindex="0">
      <div>${p.image?`<img src="${streamEsc(p.image)}" alt="${streamEsc(p.title)}">`:'<span class="stream-placeholder"></span>'}</div>
      <div><small>${streamLabels[category]}</small><h4>${streamEsc(p.title)}</h4><p>${excerpt(p)}</p></div>
    </article>`).join(''):'<p class="stream-empty">Bu bölüm için yeni içerik hazırlanıyor.</p>';
  container.querySelectorAll('.stream-item[role="link"]').forEach(card=>card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}}));
}

let featuredTimer;
function renderFeaturedSlider(home){
  const slider=document.querySelector('#featuredSlider');
  if(!slider)return;
  const stage=slider.querySelector('.featured-slider-stage');
  const controls=slider.querySelector('.featured-slider-controls');
  const byNewest=(a,b)=>new Date(b.date||b.updatedAt||b.createdAt||0)-new Date(a.date||a.updatedAt||a.createdAt||0);
  const automatic=(home.sliders||[]).map(x=>({...x,type:x.type||'Gündem'})).filter(x=>x.title).slice(0,5);
  const fallbackAutomatic=(home.haberler||[]).map(x=>({...x,type:'Haber'}))
    .concat((home.etkinlikler||[]).map(x=>({...x,type:'Etkinlik'})))
    .filter(x=>x.title)
    .sort(byNewest)
    .slice(0,5);
  const pick=automatic.length?automatic:fallbackAutomatic;
  const slides=pick.length?pick:[{
    title:'PEYZAJDER gündeminden öne çıkanlar',
    summary:'Haberler, etkinlikler ve duyurular dernek gündemi içinde modern bir slayt alanında yayınlanır.',
    image:featuredFallbackImage,
    type:'Gündem'
  }];
  stage.innerHTML=slides.map((item,i)=>`
    <article class="featured-slide ${i===0?'is-active':''}" data-featured-slide="${i}">
      <div class="featured-slide-media">
        <img class="featured-slide-bg" src="${streamEsc(item.image||featuredFallbackImage)}" alt="" aria-hidden="true">
        <img class="featured-slide-image" src="${streamEsc(item.image||featuredFallbackImage)}" alt="${streamEsc(item.title)}">
      </div>
      <div class="featured-slide-copy">
        <small>${streamEsc(item.type)} · PEYZAJDER</small>
        <h3>${streamEsc(item.title)}</h3>
        <p>${excerpt(item,230)}</p>
        <a href="${streamEsc(item.url||featuredCategoryLinks[item.type]||'archive.html')}">İçeriğe git <span>→</span></a>
      </div>
    </article>`).join('');
  controls.innerHTML=slides.map((_,i)=>`<button type="button" class="${i===0?'is-active':''}" aria-label="${i+1}. slayta geç" data-featured-control="${i}"></button>`).join('');
  const setActive=index=>{
    stage.querySelectorAll('[data-featured-slide]').forEach((el,i)=>el.classList.toggle('is-active',i===index));
    controls.querySelectorAll('[data-featured-control]').forEach((el,i)=>el.classList.toggle('is-active',i===index));
    slider.dataset.active=String(index);
  };
  controls.querySelectorAll('[data-featured-control]').forEach(btn=>btn.addEventListener('click',()=>{
    clearInterval(featuredTimer);
    setActive(Number(btn.dataset.featuredControl));
    featuredTimer=setInterval(next,5200);
  }));
  function next(){
    const current=Number(slider.dataset.active||0);
    setActive((current+1)%slides.length);
  }
  clearInterval(featuredTimer);
  if(slides.length>1)featuredTimer=setInterval(next,5200);
}

function renderEditorial(article){
  const box=document.querySelector('#editorialDrawer');
  if(!box||!article){if(box)box.hidden=true;return}
  box.hidden=false;
  box.innerHTML=`<a href="archive.html" class="editorial-card">
    <span>Köşe yazısı</span>
    <h3>${streamEsc(article.title)}</h3>
    <p>${excerpt(article)}</p>
    <small>${streamEsc(article.author||'PEYZAJDER')} · Yazıyı oku →</small>
  </a>`;
}

function applyHomeSettings(settings={}){
  const text=(sel,key)=>{const el=document.querySelector(sel),val=settings[key];if(el&&val)el.textContent=val};
  const html=(sel,key)=>{const el=document.querySelector(sel),val=settings[key];if(el&&val)el.innerHTML=val};
  text('.hero-copy .eyebrow','home.hero.eyebrow');
  text('.hero-copy h1','home.hero.title');
  text('.hero-copy > p:nth-of-type(2)','home.hero.summary');
  text('.streams-heading .eyebrow','home.gundem.eyebrow');
  text('.competition-promo-copy .eyebrow','home.competition.eyebrow');
  text('#competition-promo-title','home.competition.title');
  text('.competition-promo-copy > p:nth-of-type(2)','home.competition.summary');
  text('#kurumsal .eyebrow','home.about.eyebrow');
  text('#kurumsal h2','home.about.title');
  text('#kurumsal > div:nth-child(2) > p','home.about.summary');
  text('#calismalar .eyebrow','home.focus.eyebrow');
  text('#calismalar > h2','home.focus.title');
  text('#rehber .eyebrow','home.directory.eyebrow');
  text('#rehber h2','home.directory.title');
  text('#rehber .directory-intro p:last-child','home.directory.summary');
  text('#icerik-vitrini .eyebrow','home.showcase.eyebrow');
  text('#icerik-vitrini h2','home.showcase.title');
  text('#uyelik .eyebrow','home.membership.eyebrow');
  text('#uyelik h2','home.membership.title');
  text('#uyelik > div:nth-child(2) > p','home.membership.summary');
  html('.living-band > div','home.livingBand.html');
}

async function loadHomeStreams(){
  prepareStreams();
  try{
    const home=await fetch(apiPath('/api/public/home')).then(r=>r.json());
    applyHomeSettings(home.settings||{});
    document.querySelectorAll('[data-stream]').forEach(container=>{
      const category=container.dataset.stream;
      renderStream(container,category,home[category]||[]);
    });
    renderFeaturedSlider(home);
    renderEditorial(home.articles?.[0]||home.editorial?.[0]);
  }catch{
    fetch('content-data.json').then(r=>r.json()).then(data=>{
      const fallbackHome={haberler:[],etkinlikler:[],duyurular:[]};
      document.querySelectorAll('[data-stream]').forEach(container=>{
        const category=container.dataset.stream;
        const items=data.pages.filter(p=>p.category===category&&p.title&&!p.error).slice(0,4).map(p=>({
          title:p.title,
          category:p.category,
          summary:p.paragraphs?.[0]||'PEYZAJDER gündeminden güncel içerik',
          image:p.images?.[0]?.src||''
        }));
        fallbackHome[category]=items;
        renderStream(container,category,items);
      });
      renderFeaturedSlider(fallbackHome);
      renderEditorial(null);
    }).catch(()=>{
      document.querySelectorAll('[data-stream]').forEach(x=>x.innerHTML='<p class="stream-empty">İçerikler yüklenemedi.</p>');
      renderFeaturedSlider({haberler:[],etkinlikler:[],duyurular:[]});
    });
  }
}

async function applyMemberHeader(){
  const account=document.querySelector('.header-account');
  if(!account)return;
  const showPanel=async(href,label)=>{
    account.innerHTML=`<a class="button button-small panel-account-button" href="${href}">${streamEsc(label)}<span class="panel-alert-badge" hidden>!</span></a>`;
    try{const response=await fetch(apiPath('/api/panel-notifications'),{credentials:'same-origin',cache:'no-store'});if(response.ok){const data=await response.json();const badge=account.querySelector('.panel-alert-badge');badge.hidden=!data.total;badge.title=data.total?`${data.total} yeni bildiriminiz var`:''}}
    catch{}
  };
  try{
    const response=await fetch(apiPath('/api/member/me'),{credentials:'same-origin'});
    if(response.ok){
      const member=await response.json();
      await showPanel('member-portal.html','Panelime Git');
      return;
    }
  }catch{}
  try{
    const response=await fetch(apiPath('/api/me'),{credentials:'same-origin'});
    if(!response.ok)return;
    const session=await response.json(),role=String(session.role||'admin').toLowerCase();
    const destinations={sayman:'sayman.html',moderator:'moderator.html',author:'writer-panel.html',admin:'admin.html'};
    const labels={sayman:'Sayman Paneli',moderator:'Moderatör Paneli',author:'Yazar Paneli',admin:'Yönetim Paneli'};
    await showPanel(destinations[role]||'admin.html',labels[role]||'Yönetim Paneli');
  }catch{}
}

async function applyPublicMenus(){
  try{
    const response=await fetch(apiPath('/api/public/menus'),{cache:'no-store'});if(!response.ok)return;
    const items=await response.json(),mains=items.filter(x=>!x.parent);if(!mains.length)return;
    const nav=document.querySelector('.main-nav');if(!nav)return;
    nav.innerHTML=mains.map((main,i)=>{const children=items.filter(x=>String(x.parent||'').toLocaleLowerCase('tr-TR')===String(main.title||'').toLocaleLowerCase('tr-TR'));const link=`<a class="nav-tile" href="${streamEsc(main.url||'#')}"><span>${String(i+1).padStart(2,'0')}</span>${streamEsc(main.title)}</a>`;return children.length?`<div class="nav-dropdown">${link}<div class="dropdown-menu">${children.map(x=>`<a href="${streamEsc(x.url||'#')}">${streamEsc(x.title)}</a>`).join('')}</div></div>`:link}).join('');
    prepareMobileSubmenus();
  }catch{}
}

loadHomeStreams();
applyMemberHeader();
applyPublicMenus();

async function loadHomeSponsors(){
  const strip=document.querySelector('.sponsor-strip');
  if(!strip)return;
  try{
    const data=await fetch(apiPath('/api/public/home-sponsors'),{cache:'no-store'}).then(r=>r.json());
    const sponsors=Array.isArray(data.items)?data.items:[];
    if(!sponsors.length)return;
    strip.innerHTML=sponsors.slice(0,8).map(item=>`
      <a class="home-sponsor-logo" href="${streamEsc(item.url||'#')}" target="_blank" rel="noopener" aria-label="${streamEsc(item.name)}">
        ${item.logo?`<img src="${streamEsc(item.logo)}" alt="${streamEsc(item.name)}">`:`<span>${streamEsc(item.name||'Sponsor')}</span>`}
      </a>`).join('');
  }catch{}
}

loadHomeSponsors();

async function loadFirmDirectory(){
  const box=document.querySelector('#firmResults'),q=document.querySelector('#firmSearch'),city=document.querySelector('#firmCity'),activity=document.querySelector('#firmActivity');
  if(!box||!q||!city||!activity)return;
  let firms=[];
  try{firms=await fetch(apiPath('/api/public/firms'),{cache:'no-store'}).then(r=>r.json())}catch{firms=[]}
  const key=value=>String(value||'').trim().toLocaleLowerCase('tr-TR');
  const uniqueValues=values=>[...new Map(values.filter(Boolean).map(value=>[key(value),String(value).trim()])).values()].sort((a,b)=>a.localeCompare(b,'tr'));
  const cities=uniqueValues(firms.map(x=>x.city));
  const activities=uniqueValues(firms.flatMap(x=>Array.isArray(x.activities)?x.activities:[]));
  city.innerHTML='<option>Tüm şehirler</option>'+cities.map(x=>`<option>${streamEsc(x)}</option>`).join('');
  activity.innerHTML='<option>Tüm uzmanlıklar</option>'+activities.map(x=>`<option>${streamEsc(x)}</option>`).join('');
  const render=()=>{
    const needle=q.value.toLocaleLowerCase('tr'),c=city.value,a=activity.value;
    const shown=firms.filter(f=>{
      const hay=[f.name,f.city,f.address,f.description,(f.activities||[]).join(' ')].join(' ').toLocaleLowerCase('tr');
      return (!needle||hay.includes(needle))&&(c==='Tüm şehirler'||key(f.city)===key(c))&&(a==='Tüm uzmanlıklar'||(f.activities||[]).some(item=>key(item)===key(a)));
    }).slice(0,9);
    box.innerHTML=shown.length?shown.map(f=>`
      <article class="firm-card">
        <div class="firm-logo">${f.logo?`<img src="${streamEsc(f.logo)}" alt="${streamEsc(f.name)}">`:`<span>${streamEsc((f.name||'F').slice(0,2))}</span>`}</div>
        <div><small>${streamEsc(f.city||'Türkiye')}</small><h3>${streamEsc(f.name)}</h3><p>${streamEsc(f.description||'PEYZAJDER üye firma kartı')}</p><div>${(f.activities||[]).slice(0,4).map(x=>`<em>${streamEsc(x)}</em>`).join('')}</div><footer>${f.website?`<a href="${streamEsc(f.website)}" target="_blank" rel="noopener">Web sitesi ↗</a>`:''}${f.email?`<a href="mailto:${streamEsc(f.email)}">E-posta</a>`:''}${f.phone?`<a href="tel:${streamEsc(f.phone)}">Telefon</a>`:''}</footer></div>
      </article>`).join(''):'<p class="firm-empty">Bu filtreyle eşleşen onaylı firma bulunamadı.</p>';
  };
  [q,city,activity].forEach(el=>el.addEventListener('input',render));
  [city,activity].forEach(el=>el.addEventListener('change',render));
  render();
}

loadFirmDirectory();

// Köşe yazıları artık ayrı "Köşe Yazıları" sayfasında yayınlanıyor; ana sayfadaki eski kayan kart kaldırıldı.
const removeHomeEditorial=()=>document.querySelector('#editorialDrawer')?.remove();
removeHomeEditorial();
setTimeout(removeHomeEditorial,400);
setTimeout(removeHomeEditorial,1200);

async function loadFloatingCompetitionPanel(){
  try{
    const panel=await fetch(apiPath('/api/public/promo-panel'),{cache:'no-store'}).then(r=>r.json());
    if(!panel.active)return;
    const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const title=panel.title||'Bursa Performans Odaklı Peyzaj Uygulamaları Yarışması';
    const badge=panel.label||'Yeni yarışma';
    const body=panel.body||'Aktif yarışma bilgileri, başvuru koşulları ve süreç takvimi dijital yarışma platformunda.';
    const button=panel.buttonText||'TIKLA';
    const url=panel.url||'https://peyzajder.com';
    const sponsorTitle=panel.mainSponsorTitle||'Ana Sponsor';
    const sponsorLogo=panel.mainSponsorLogo||'';
    const sponsorUrl=panel.mainSponsorUrl||url;
    document.body.insertAdjacentHTML('beforeend',`
      <aside class="floating-competition is-closed" id="floatingCompetition" aria-label="${esc(title)}">
        <button class="floating-competition-tab" type="button" aria-expanded="false"><b>${esc(badge)}</b><span>${esc(title)}</span></button>
        <div class="floating-competition-card">
          <small>Dijital yarışma platformu</small>
          <h3>${esc(title)}</h3>
          <p>${esc(body)}</p>
          ${sponsorLogo?`<a class="floating-sponsor" href="${esc(sponsorUrl)}" target="_blank" rel="noopener"><small>${esc(sponsorTitle)}</small><img src="${esc(sponsorLogo)}" alt="${esc(sponsorTitle)}"></a>`:''}
          <a href="${esc(url)}" target="_blank" rel="noopener">${esc(button)}</a>
        </div>
      </aside>`);
    const box=document.querySelector('#floatingCompetition');
    const btn=box.querySelector('button');
    const open=()=>{box.classList.remove('is-closed');btn.setAttribute('aria-expanded','true')};
    const close=()=>{box.classList.add('is-closed');btn.setAttribute('aria-expanded','false')};
    box.addEventListener('mouseenter',open);
    box.addEventListener('mouseleave',close);
    btn.addEventListener('click',()=>box.classList.contains('is-closed')?open():close());
  }catch{}
}

loadFloatingCompetitionPanel();
