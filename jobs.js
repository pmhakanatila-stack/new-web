const jobsApi=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
const jobsEsc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let jobs=[],activeType='tumu';
const grid=document.querySelector('#jobsGrid');
const filtersEl=document.querySelector('#jobsFilters');
const isExpired=x=>x.endDate&&new Date(x.endDate).getTime()<new Date().setHours(0,0,0,0);
const fmtDate=d=>d?new Date(d).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'';

function renderFilters(){
  const types=[...new Set(jobs.map(x=>x.type).filter(Boolean))];
  const options=['tumu',...types];
  filtersEl.innerHTML=options.map(t=>`<button class="${t===activeType?'active':''}" data-type="${jobsEsc(t)}">${jobsEsc(t==='tumu'?'Tümü':t)}</button>`).join('');
  filtersEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{activeType=b.dataset.type;renderFilters();renderGrid()});
}

function renderGrid(){
  const shown=jobs.filter(x=>activeType==='tumu'||x.type===activeType);
  document.querySelector('[data-count]').textContent=`${shown.length} ilan`;
  grid.innerHTML=shown.length?shown.map(x=>`<article class="job-card ${isExpired(x)?'is-expired':''}">
    <div class="job-card-head"><span class="job-type">${jobsEsc(x.type||'İlan')}</span>${isExpired(x)?'<span class="job-expired-tag">Süresi doldu</span>':''}</div>
    <h3>${jobsEsc(x.title)}</h3>
    <p class="job-meta">${[x.company,x.location].filter(Boolean).map(jobsEsc).join(' · ')||'PEYZAJDER üyesi firma'}</p>
    ${x.description?`<p class="job-desc">${jobsEsc(x.description.slice(0,220))}</p>`:''}
    <div class="job-card-foot">${x.endDate?`<span class="job-deadline">Son başvuru: ${fmtDate(x.endDate)}</span>`:'<span class="job-deadline">Süre belirtilmedi</span>'}${x.url&&!isExpired(x)?`<a class="job-apply" href="${jobsEsc(x.url)}" target="_blank" rel="noopener">Başvur →</a>`:''}</div>
  </article>`).join(''):'<div class="section-empty">Şu anda yayında ilan bulunmuyor.</div>';
}

fetch(jobsApi('/api/public/job-posts'),{cache:'no-store'}).then(r=>r.json()).then(data=>{
  jobs=Array.isArray(data.items)?data.items:[];
  renderFilters();
  renderGrid();
}).catch(()=>{grid.innerHTML='<div class="section-empty">İlanlar şu anda yüklenemedi.</div>'});
