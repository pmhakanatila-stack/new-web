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
    <div class="job-card-foot">${x.endDate?`<span class="job-deadline">Son başvuru: ${fmtDate(x.endDate)}</span>`:'<span class="job-deadline">Süre belirtilmedi</span>'}${!isExpired(x)?`<button type="button" class="job-apply" data-apply-id="${jobsEsc(x.id)}" data-apply-title="${jobsEsc(x.title)}">Başvur →</button>`:''}</div>
  </article>`).join(''):'<div class="section-empty">Şu anda yayında ilan bulunmuyor.</div>';
  grid.querySelectorAll('[data-apply-id]').forEach(btn=>btn.addEventListener('click',()=>openApplyModal(btn.dataset.applyId,btn.dataset.applyTitle)));
}

fetch(jobsApi('/api/public/job-posts'),{cache:'no-store'}).then(r=>r.json()).then(data=>{
  jobs=Array.isArray(data.items)?data.items:[];
  renderFilters();
  renderGrid();
}).catch(()=>{grid.innerHTML='<div class="section-empty">İlanlar şu anda yüklenemedi.</div>'});

const applyModal=document.querySelector('#jobApplyModal');
const applyForm=document.querySelector('#jobApplyForm');
const applyMessage=document.querySelector('#applyMessage');
let applyJobId='';
function openApplyModal(jobId,jobTitle){
  applyJobId=jobId;
  document.querySelector('#applyJobTitle').textContent=jobTitle?`"${jobTitle}" ilanına başvur`:'İlana başvur';
  applyForm.reset();
  applyMessage.textContent='';
  applyModal.classList.add('open');
  applyModal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeApplyModal(){
  applyModal.classList.remove('open');
  applyModal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
applyModal.querySelectorAll('[data-apply-close]').forEach(el=>el.addEventListener('click',closeApplyModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&applyModal.classList.contains('open'))closeApplyModal()});

applyForm.addEventListener('submit',e=>{
  e.preventDefault();
  applyMessage.textContent='Gönderiliyor…';
  const submitBtn=applyForm.querySelector('.job-apply-submit');
  submitBtn.disabled=true;
  const data=Object.fromEntries(new FormData(applyForm));
  data.jobId=applyJobId;
  const cvInput=document.querySelector('#applyCv');
  const file=cvInput.files&&cvInput.files[0];
  const send=payload=>fetch(jobsApi('/api/public/job-applications'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Başvuru gönderilemedi');return d})
    .then(()=>{applyMessage.textContent='Başvurunuz alındı, teşekkür ederiz.';applyForm.reset();setTimeout(closeApplyModal,1400)})
    .catch(err=>{applyMessage.textContent=err.message})
    .finally(()=>{submitBtn.disabled=false});
  if(file){
    if(file.size>3*1024*1024){applyMessage.textContent='CV dosyası 3 MB sınırını aşıyor';submitBtn.disabled=false;return}
    const reader=new FileReader();
    reader.onload=()=>{data.data=reader.result;send(data)};
    reader.onerror=()=>{applyMessage.textContent='Dosya okunamadı, lütfen tekrar deneyin';submitBtn.disabled=false};
    reader.readAsDataURL(file);
  }else{
    send(data);
  }
});
