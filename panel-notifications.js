(()=>{
  const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
  let shown=false,attempts=0;
  const plural=(count,singular)=>`${count} adet yeni ${singular}${count>1?'ınız':''} var`;
  function render(data){
    if(shown||!data.total)return;
    shown=true;
    const lines=[];
    if(data.unreadMessages)lines.push(plural(data.unreadMessages,'mesaj'));
    if(data.unreadInvitations)lines.push(plural(data.unreadInvitations,'davetiye'));
    const style=document.createElement('style');
    style.textContent=`.panel-notice-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:rgba(13,35,23,.68);backdrop-filter:blur(6px)}.panel-notice-card{width:min(480px,100%);background:#f7f7f2;color:#13261a;padding:36px;border:1px solid #cdd7ce;box-shadow:0 24px 80px rgba(0,0,0,.24)}.panel-notice-card small{display:block;margin-bottom:12px;color:#4f735c;font-weight:800;letter-spacing:.17em}.panel-notice-card h2{margin:0 0 12px;font-size:30px}.panel-notice-card p{margin:7px 0;font-size:18px}.panel-notice-card button{width:100%;margin-top:24px;padding:14px;border:0;background:#153c27;color:#fff;font-weight:800;cursor:pointer}`;
    document.head.appendChild(style);
    const overlay=document.createElement('div');
    overlay.className='panel-notice-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Yeni panel bildirimleri');
    overlay.innerHTML=`<div class="panel-notice-card"><small>YENİ BİLDİRİM</small><h2>Size ulaşan yenilikler var.</h2>${lines.map(line=>`<p>${line}</p>`).join('')}<button type="button">Panele devam et</button></div>`;
    overlay.querySelector('button').addEventListener('click',()=>overlay.remove());
    document.body.appendChild(overlay);
    fetch(apiPath('/api/panel-notifications'),{method:'POST',credentials:'same-origin'}).catch(()=>{});
  }
  async function check(){
    attempts++;
    try{const response=await fetch(apiPath('/api/panel-notifications'),{credentials:'same-origin',cache:'no-store'});if(response.ok){render(await response.json());return}}
    catch{}
    if(attempts<40)setTimeout(check,750);
  }
  check();
})();
