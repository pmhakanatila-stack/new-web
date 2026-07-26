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

const navApiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):String(path||'');
const navEsc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function applyMemberHeader(){
  const account=document.querySelector('.header-account');
  if(!account)return;
  const showPanel=async(href,label)=>{
    account.innerHTML=`<a class="button button-small panel-account-button" href="${href}" aria-label="${navEsc(label)}"><span class="panel-label-full">${navEsc(label)}</span><span class="panel-label-mobile">Panel</span><span class="panel-alert-badge" hidden>!</span></a>`;
    try{const response=await fetch(navApiPath('/api/panel-notifications'),{credentials:'same-origin',cache:'no-store'});if(response.ok){const data=await response.json();const badge=account.querySelector('.panel-alert-badge');badge.hidden=!data.total;badge.title=data.total?`${data.total} yeni bildiriminiz var`:''}}
    catch{}
  };
  try{
    const response=await fetch(navApiPath('/api/member/me'),{credentials:'same-origin'});
    if(response.ok){
      await showPanel('uye-paneli.html','Panelime Git');
      return;
    }
  }catch{}
  try{
    const response=await fetch(navApiPath('/api/me'),{credentials:'same-origin'});
    if(!response.ok)return;
    const session=await response.json(),role=String(session.role||'admin').toLowerCase();
    const destinations={sayman:'sayman.html',moderator:'moderator.html',author:'yazar-paneli.html',admin:'yonetim.html'};
    const labels={sayman:'Sayman Paneli',moderator:'Moderatör Paneli',author:'Yazar Paneli',admin:'Yönetim Paneli'};
    await showPanel(destinations[role]||'yonetim.html',labels[role]||'Yönetim Paneli');
  }catch{}
}

applyMemberHeader();
