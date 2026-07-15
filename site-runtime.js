(function(){
  const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
  const clean=value=>String(value||'').trim();
  const norm=value=>clean(value).toLocaleLowerCase('tr-TR');
  const safeUrl=value=>{try{const url=new URL(clean(value),location.href);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}};
  const icons={
    instagram:'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.2-1.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z',
    facebook:'M14 22v-8h3l.5-4H14V8c0-1.2.4-2 2.2-2H18V2.2c-.8-.1-2-.2-3.4-.2C11.2 2 9 4 9 7.7V10H6v4h3v8h5Z',
    linkedin:'M5 8.5H1.5V22H5V8.5ZM3.2 2A2.1 2.1 0 1 0 3.2 6.2 2.1 2.1 0 0 0 3.2 2ZM22 14.3c0-4.1-2.2-6-5.1-6-2.4 0-3.4 1.3-4 2.2v-2H9.4V22H13v-6.7c0-1.8.3-3.5 2.5-3.5 2.1 0 2.2 2 2.2 3.6V22H22v-7.7Z',
    youtube:'M23 7.2a3 3 0 0 0-2.1-2.1C19 4.5 12 4.5 12 4.5s-7 0-8.9.6A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12c0 1.6.1 3.2.6 4.8a3 3 0 0 0 2.1 2.1c1.9.6 8.9.6 8.9.6s7 0 8.9-.6a3 3 0 0 0 2.1-2.1c.5-1.6.6-3.2.6-4.8s-.1-3.2-.6-4.8ZM9.7 15.7V8.3l6.2 3.7-6.2 3.7Z',
    x:'M18.8 2H22l-7 8 8.2 12h-6.4l-5-6.6L6 22H2.8l7.5-8.6L2.4 2H9l4.5 6 5.3-6Zm-1.1 17.9h1.8L8 4H6.1l11.6 15.9Z',
    pinterest:'M12 2a10 10 0 0 0-3.6 19.3c-.1-1.6 0-3.4.4-5.1l1.3-5.5s-.3-.7-.3-1.8c0-1.7 1-3 2.2-3 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.6 1.2.6 2.2 1.8 2.2 2.2 0 3.8-2.3 3.8-5.6 0-2.9-2.1-5-5.1-5-3.5 0-5.5 2.6-5.5 5.3 0 1 .4 2.2.9 2.8.1.1.1.2.1.4l-.4 1.5c-.1.5-.5.6-.9.4-2.3-1.1-3.7-4.3-3.7-6.9 0-5.6 4.1-9.6 11.7-9.6 6.1 0 10.9 4.4 10.9 10.2 0 6.1-3.8 11-9.2 11-1.8 0-3.5-.9-4.1-2l-1.1 4.2c-.4 1.6-1.5 3.5-2.2 4.7.8.2 1.7.3 2.6.3A10 10 0 1 0 12 2Z'
  };
  const platformKey=item=>{const value=norm(`${item.platform||''} ${item.title||''}`);if(value.includes('instagram'))return'instagram';if(value.includes('facebook'))return'facebook';if(value.includes('linkedin'))return'linkedin';if(value.includes('youtube'))return'youtube';if(value.includes('pinterest'))return'pinterest';return'x'};
  const icon=item=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[platformKey(item)]}"/></svg>`;

  function applySettings(settings){
    const name=clean(settings['site.name'])||'PEYZAJDER',organization=clean(settings['site.organization'])||'Peyzaj Mimarları ve Sektör Profesyonelleri Derneği';
    const configuredTitle=clean(settings['site.browserTitle']);
    if(configuredTitle)document.title=location.pathname.endsWith('index.html')||location.pathname==='/'?configuredTitle:document.title.replace(/PEYZAJDER/g,name);
    const description=clean(settings['site.description']);if(description){let meta=document.querySelector('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.append(meta)}meta.content=description}
    document.querySelectorAll('.brand strong').forEach(el=>el.textContent=name);document.querySelectorAll('.brand small').forEach(el=>el.textContent=organization);
    const logo=clean(settings['site.logo']);if(logo){document.querySelectorAll('.brand-mark,.logo i,.portal-brand i,.brand i').forEach(el=>el.style.setProperty('background',`transparent url("${logo}") center/contain no-repeat`,'important'));document.querySelectorAll('.detail-brand img').forEach(img=>img.src=logo)}
    const favicon=clean(settings['site.favicon']);if(favicon){let link=document.querySelector('link[rel~="icon"]');if(!link){link=document.createElement('link');link.rel='icon';document.head.append(link)}link.href=favicon}
    const hero=clean(settings['home.hero.image']);if(hero){const img=document.querySelector('.hero-media img');if(img)img.src=hero}
    const phone=clean(settings['contact.phone']),email=clean(settings['contact.email']),address=clean(settings['contact.address']);
    document.querySelectorAll('a[href^="tel:"]').forEach(a=>{if(phone){a.href=`tel:${phone.replace(/[^+\d]/g,'')}`;a.textContent=phone}});
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{if(email){a.href=`mailto:${email}`;a.textContent=email}});
    document.querySelectorAll('.contact-info .info-list p').forEach(row=>{const label=norm(row.querySelector('b')?.textContent);if(label==='adres'&&address){const target=row.querySelector('span');if(target)target.textContent=address}if(label==='telefon'&&phone){const target=row.querySelector('a');if(target){target.href=`tel:${phone.replace(/[^+\d]/g,'')}`;target.textContent=phone}}if(label==='e-posta'&&email){const target=row.querySelector('a');if(target){target.href=`mailto:${email}`;target.textContent=email}}});
  }
  function applySocial(links){
    if(!links?.length)return;const html=`<div class="site-social-links" aria-label="Sosyal medya">${links.map(item=>{const url=safeUrl(item.url);return url?`<a href="${url}" target="_blank" rel="noopener" aria-label="${clean(item.title)||'Sosyal medya'}">${icon(item)}<span>${clean(item.title)}</span></a>`:''}).join('')}</div>`;
    const contact=document.querySelector('.contact-info');if(contact&&!contact.querySelector('.site-social-links'))contact.insertAdjacentHTML('beforeend',html);
    const footer=document.querySelector('body>footer');if(footer&&!footer.querySelector('.site-social-links'))footer.insertAdjacentHTML('beforeend',html);
  }
  function applyModules(records){
    const byKey=Object.fromEntries((records||[]).map(x=>[x.key,x.status]));const selectors={gundem:'#gundem',competition:'.competition-platform',corporate:'#kurumsal',directory:'#rehber',showcase:'#icerik-vitrini',membership:'#uyelik'};
    Object.entries(selectors).forEach(([key,selector])=>{if(byKey[key]==='Pasif')document.querySelectorAll(selector).forEach(el=>el.hidden=true)});
  }
  function applyPopup(popup){
    if(!popup||!document.querySelector('.hero'))return;const storageKey=`peyzajder-popup-${popup.id}`;if(sessionStorage.getItem(storageKey))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="site-popup" role="dialog" aria-modal="true" aria-labelledby="sitePopupTitle"><div><button type="button" aria-label="Duyuruyu kapat">×</button><p>PEYZAJDER DUYURUSU</p><h2 id="sitePopupTitle"></h2><article></article><a href="contact.html">Bilgi alın →</a></div></div>`);
    const root=document.querySelector('.site-popup');root.querySelector('h2').textContent=clean(popup.title)||'Duyuru';root.querySelector('article').textContent=clean(popup.body);const close=()=>{sessionStorage.setItem(storageKey,'1');root.remove()};root.querySelector('button').onclick=close;root.onclick=e=>{if(e.target===root)close()};
  }
  async function load(){try{const response=await fetch(apiPath('/api/public/site-config'),{cache:'no-store'});if(!response.ok)return;const data=await response.json();applySettings(data.settings||{});applySocial(data.socialLinks||[]);applyModules(data.modules||[]);applyPopup(data.popup)}catch{}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
