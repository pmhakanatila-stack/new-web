const grid=document.querySelector('#editorialGrid'),empty=document.querySelector('#editorialEmpty'),search=document.querySelector('#editorialSearch');
let articles=[];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=s=>String(s||'PY').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
const dateFmt=s=>s?new Date(s).toLocaleDateString('tr-TR'):'';
const strip=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const richBody=s=>/<\/?(?:p|h2|h3|strong|b|em|i|u|ul|ol|li|blockquote|a|br)\b/i.test(String(s||''))?String(s||''):String(s||'').split(/\n{2,}/).map(p=>`<p>${esc(p)}</p>`).join('');
function render(){
  const q=search.value.toLocaleLowerCase('tr');
  const shown=articles.filter(x=>`${x.title} ${x.summary} ${x.body} ${x.author}`.toLocaleLowerCase('tr').includes(q));
  empty.hidden=shown.length>0;
  grid.innerHTML=shown.map((x,i)=>`<article class="editorial-card" style="--i:${i}" data-id="${esc(x.id)}">
    <div class="author-mark">${x.authorPhoto?`<img src="${esc(x.authorPhoto)}" alt="${esc(x.author)}">`:`<span>${esc(initials(x.author))}</span>`}</div>
    <div>
      ${x.image?`<img class="editorial-card-cover" src="${esc(x.image)}" alt="${esc(x.title)}">`:''}
      <small>${esc(x.author)} · ${esc(dateFmt(x.date))}</small>
      <h2>${esc(x.title)}</h2>
      <p>${esc(x.summary||strip(x.body).slice(0,180))}</p>
      <b>Yazıyı oku →</b>
    </div>
  </article>`).join('');
  grid.querySelectorAll('.editorial-card').forEach(card=>card.onclick=()=>openDetail(articles.find(x=>x.id===card.dataset.id)));
}
function openDetail(x){
  document.querySelector('#editorialDetailBody').innerHTML=`<article class="editorial-detail">
    <p class="eyebrow">Köşe yazısı</p>
    <h1>${esc(x.title)}</h1>
    ${x.image?`<img class="editorial-detail-cover" src="${esc(x.image)}" alt="${esc(x.title)}">`:''}
    <div class="detail-author"><div class="author-mark">${x.authorPhoto?`<img src="${esc(x.authorPhoto)}" alt="${esc(x.author)}">`:`<span>${esc(initials(x.author))}</span>`}</div><div><b>${esc(x.author)}</b><small>${esc(dateFmt(x.date))}</small><p>${esc(x.authorBio||'PEYZAJDER köşe yazarı')}</p></div></div>
    <div class="rich-article-body">${richBody(x.body)}</div>
  </article>`;
  document.querySelector('#editorialDetail').showModal();
}
fetch((window.peyzajderApiPath?window.peyzajderApiPath('/api/public/editorials'):'/api/public/editorials')).then(r=>r.json()).then(data=>{articles=Array.isArray(data)?data:[];render()}).catch(()=>{empty.hidden=false;empty.textContent='Köşe yazıları yüklenemedi.'});
search.addEventListener('input',render);
document.querySelector('#closeEditorial').onclick=()=>document.querySelector('#editorialDetail').close();
