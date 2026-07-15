const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fallbackGroup='Diğer Kurullar';
const groupPriority=['Yönetim Kurulu','Denetim Kurulu','Denetleme Kurulu','Danışma Kurulu','Komisyon'];
const normalize=s=>String(s||'').trim()||fallbackGroup;
const ascii=s=>String(s||'').toLocaleLowerCase('tr')
  .replaceAll('ı','i').replaceAll('ğ','g').replaceAll('ü','u').replaceAll('ş','s').replaceAll('ö','o').replaceAll('ç','c')
  .replaceAll('ä±','i').replaceAll('äŸ','g').replaceAll('ã¼','u').replaceAll('åÿ','s').replaceAll('ã¶','o').replaceAll('ã§','c')
  .replace(/\s+/g,' ')
  .trim();

function groupRank(title){
  const clean=normalize(title).toLocaleLowerCase('tr');
  const index=groupPriority.findIndex(x=>x.toLocaleLowerCase('tr')===clean);
  return index>=0?index:99;
}

function roleRank(item,group){
  const g=ascii(group);
  if(!g.includes('yonetim kurulu'))return Number(item.order)||999;
  const role=ascii(item.role);
  if(role.includes('baskan yardimcisi')||role.includes('baskan yard'))return 2;
  if(role.includes('sekreter')||role.includes('genel sekreter'))return 3;
  if(role.includes('sayman'))return 4;
  if(role.includes('baskan'))return 1;
  return 10;
}

function memberSort(group){
  return (a,b)=>roleRank(a,group)-roleRank(b,group)||(Number(a.order)||999)-(Number(b.order)||999)||normalize(a.name).localeCompare(normalize(b.name),'tr');
}

function hasPortrait(photo){
  const p=String(photo||'').toLocaleLowerCase('tr');
  const placeholderFiles=['0001-new.png','0088-new.png','0090-new.png','0091-new.png','0092-new.png'];
  return p&&!p.includes('peyzajder-logo')&&!placeholderFiles.some(file=>p.includes(file));
}

function renderGroups(items){
  const root=document.querySelector('#boardGroups');
  const active=items
    .filter(x=>x.status!=='Pasif')
    .sort((a,b)=>groupRank(a.title)-groupRank(b.title)||(Number(a.order)||999)-(Number(b.order)||999)||normalize(a.name).localeCompare(normalize(b.name),'tr'));

  const groups=[...new Set(active.map(x=>normalize(x.title)))].sort((a,b)=>groupRank(a)-groupRank(b)||a.localeCompare(b,'tr'));

  root.innerHTML=groups.length?groups.map((group,gi)=>{
    const members=active.filter(x=>normalize(x.title)===group).sort(memberSort(group));
    return `<section class="board-group">
      <div class="group-head">
        <span>${String(gi+1).padStart(2,'0')}</span>
        <div><p>KURUMSAL YAPI</p><h2>${esc(group)}</h2><small>${members.length} kayıt</small></div>
      </div>
      <div class="board-grid">
        ${members.map((x,i)=>{const portrait=hasPortrait(x.photo);return`<article class="board-card ${i===0&&group==='Yönetim Kurulu'?'featured':''}">
          <div class="portrait ${portrait?'':'placeholder'}">${portrait?`<img src="${esc(x.photo)}" alt="${esc(x.name)}">`:`<span>${esc((x.name||'').split(' ').map(y=>y[0]).slice(0,2).join(''))}</span>`}</div>
          <div>
            <small>${esc(x.role||'Kurul Üyesi')}</small>
            <h3>${esc(x.name)}</h3>
            ${x.term?`<b>${esc(x.term)}</b>`:''}
            <p>${esc(x.bio||'PEYZAJDER kurul üyesi.')}</p>
          </div>
        </article>`}).join('')}
      </div>
    </section>`;
  }).join(''):'<p class="empty">Kurul kayıtları yakında yayınlanacaktır.</p>';
}

const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):String(path||'');
fetch(apiPath('/api/public/boards'))
  .then(r=>r.json())
  .then(renderGroups)
  .catch(()=>document.querySelector('#boardGroups').innerHTML='<p class="empty">Kurul bilgileri yüklenemedi.</p>');
