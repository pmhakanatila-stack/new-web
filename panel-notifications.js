(()=>{
  const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
  const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl=value=>{try{const url=new URL(String(value||''),location.href);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}};
  let shown=false,attempts=0;
  const plural=(count,label)=>`${count} adet yeni ${label} var`;
  function render(data){
    if(shown||!data.total)return;
    shown=true;
    const summaries=[];
    if(data.unreadMessages)summaries.push(plural(data.unreadMessages,'mesajınız'));
    if(data.unreadInvitations)summaries.push(plural(data.unreadInvitations,'davetiyeniz'));
    if(data.unreadNotifications)summaries.push(plural(data.unreadNotifications,'bildiriminiz'));
    const notices=(data.notifications||[]).map(item=>{
      const link=safeUrl(item.link);
      return`<article><b>${escapeHtml(item.title||'Bildirim')}</b><p>${escapeHtml(item.message||'')}</p>${link?`<a href="${escapeHtml(link)}" target="_blank" rel="noopener">Detayı aç →</a>`:''}</article>`;
    }).join('');
    const style=document.createElement('style');
    style.textContent=`.panel-notice-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:rgba(13,35,23,.68);backdrop-filter:blur(6px)}.panel-notice-card{width:min(560px,100%);max-height:min(760px,90vh);overflow:auto;background:#f7f7f2;color:#13261a;padding:36px;border:1px solid #cdd7ce;box-shadow:0 24px 80px rgba(0,0,0,.24)}.panel-notice-card>small{display:block;margin-bottom:12px;color:#4f735c;font-weight:800;letter-spacing:.17em}.panel-notice-card h2{margin:0 0 12px;font-size:30px}.panel-notice-card>p{margin:7px 0;font-size:17px}.panel-notice-list{display:grid;gap:10px;margin-top:20px}.panel-notice-list article{padding:14px;border:1px solid #d8e0d8;background:#fff}.panel-notice-list article p{margin:7px 0;color:#58675e;line-height:1.5}.panel-notice-list a{color:#18452d;font-weight:800}.panel-notice-card>button{width:100%;margin-top:24px;padding:14px;border:0;background:#153c27;color:#fff;font-weight:800;cursor:pointer}`;
    document.head.appendChild(style);
    const overlay=document.createElement('div');
    overlay.className='panel-notice-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Yeni panel bildirimleri');
    overlay.innerHTML=`<div class="panel-notice-card"><small>YENİ BİLDİRİM</small><h2>Size ulaşan yenilikler var.</h2>${summaries.map(line=>`<p>${escapeHtml(line)}</p>`).join('')}${notices?`<div class="panel-notice-list">${notices}</div>`:''}<button type="button">Okudum, panele devam et</button></div>`;
    overlay.querySelector('button').addEventListener('click',async()=>{
      try{await fetch(apiPath('/api/panel-notifications'),{method:'POST',credentials:'same-origin'})}catch{}
      overlay.remove();
      document.querySelectorAll('.panel-alert-badge').forEach(badge=>badge.hidden=true);
    });
    document.body.appendChild(overlay);
  }
  async function check(){
    attempts++;
    try{
      const response=await fetch(apiPath('/api/panel-notifications'),{credentials:'same-origin',cache:'no-store'});
      if(response.ok){render(await response.json());return}
    }catch{}
    if(attempts<40)setTimeout(check,750);
  }
  check();
})();
