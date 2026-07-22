const message=document.querySelector('#uploadMessage');
const profileMessage=document.querySelector('#profileMessage');
const companyMessage=document.querySelector('#companyMessage');
const jobMessage=document.querySelector('#jobMessage');
const paymentMessage=document.querySelector('#paymentMessage');
const file=document.querySelector('#document');
const logoInput=document.querySelector('#companyLogo');
const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
let member,companyLogoData='',memberTypes=[];
const MAX_APPLICATION_SIZE=1024*1024;

const money=n=>(Number(n)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺';
const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
const isCorporateType=value=>norm(value).includes('kurumsal');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatIban=value=>String(value||'').replace(/\s+/g,'').replace(/(.{4})/g,'$1 ').trim();

const activityGroups={
  'Tasarım ve Projelendirme':['Peyzaj Mimari Proje Tasarımı','Kentsel Tasarım','Çevre Düzenleme Projeleri','Uygulama Projeleri','3D Görselleştirme ve Animasyon','Keşif, Metraj ve Maliyet Analizi','Master Plan Hazırlama','Rekreasyon Alanı Tasarımı','Park ve Bahçe Tasarımı','Çatı ve Teras Bahçesi Tasarımı','Dikey Bahçe Tasarımı'],
  'Peyzaj Uygulama':['Park Yapımı','Bahçe Düzenleme','Sert Zemin Uygulamaları','Ahşap Yapılar (Pergola, Kamelya vb.)','Çocuk Oyun Alanı Yapımı','Spor Sahası Yapımı','Kent Mobilyaları Montajı','Sulak Alan ve Gölet Yapımı','Yapısal Peyzaj Uygulamaları'],
  'Bitkisel Üretim':['Fidan Üretimi','Ağaç Yetiştiriciliği','Çalı Üretimi','Yer Örtücü Bitki Üretimi','Mevsimlik Çiçek Üretimi','Çok Yıllık Bitki Üretimi','Süs Bitkileri Üretimi','İç Mekân Bitkisi Üretimi','Palmiyeler ve Egzotik Bitkiler','Tohum Üretimi','Çelik ve Fide Üretimi'],
  'Çim ve Yer Örtücü Sistemleri':['Rulo Çim Üretimi','Hazır Çim Uygulaması','Çim Tohumu Satışı','Spor Sahası Çimi','Hibrit Çim Sistemleri','Hidroseeding (Hidrolik Çim Ekimi)','Yer Örtücü Bitki Uygulamaları'],
  'Sulama Sistemleri':['Otomatik Sulama Sistemleri','Tarımsal Sulama Sistemleri','Damla Sulama','Yağmurlama Sulama','Akıllı Sulama Otomasyonu','Sulama Projelendirme','Sulama Montajı','Sulama Bakım ve Onarımı','Pompa ve Filtrasyon Sistemleri'],
  'Peyzaj Bakım Hizmetleri':['Bahçe Bakımı','Çim Bakımı','Ağaç Budama','Çalı Budama','Gübreleme','İlaçlama','Yabancı Ot Mücadelesi','Mevsimlik Çiçek Dikimi','Bitki Yenileme','Sulama Bakımı'],
  'Su Yapıları':['Süs Havuzu','Yapay Gölet','Şelale Sistemleri','Biyolojik Göletler','Fıskiye Sistemleri','Havuz Bakımı'],
  'Çevre ve Altyapı':['Erozyon Kontrolü','Rehabilitasyon Çalışmaları','Yeşil Alan Tesisi','Karayolu Peyzajı','Endüstriyel Peyzaj','Maden Sahası Rehabilitasyonu','Çevre Düzenleme'],
  'Donatı ve Yapısal Ürünler':['Kent Mobilyaları','Ahşap Donatı Üretimi','Çocuk Oyun Grupları','Spor Ekipmanları','Çit ve Panel Sistemleri','Saksı Üretimi','Peyzaj Aydınlatması'],
  'Satış ve Tedarik':['Bitki Satışı','Peyzaj Malzemeleri Satışı','Saksı ve Donatı Satışı','Gübre Satışı','Bitki Koruma Ürünleri','Sulama Ekipmanları Satışı','Çim Tohumu Satışı','Toprak ve Torf Satışı','Malç ve Dekoratif Taş Satışı'],
  'Danışmanlık ve Teknik Hizmetler':['Peyzaj Danışmanlığı','Kontrollük Hizmetleri','Teknik Müşavirlik','İhale Danışmanlığı','Bilirkişilik','Eğitim Hizmetleri','Yeşil Bina (LEED/BREEAM) Danışmanlığı']
};

function setCorporateArea(visible){
  document.querySelectorAll('[data-corporate-only]').forEach(el=>{el.hidden=!visible});
  if(!visible&&['#company','#companyJobs'].includes(location.hash)){
    history.replaceState({},'',`${location.pathname}#application`);
    document.querySelector('#application')?.scrollIntoView({block:'start'});
  }
}

function setApprovedArea(visible){
  document.querySelectorAll('[data-approved-only]').forEach(el=>{el.hidden=!visible});
  if(!visible&&location.hash==='#profile'){
    history.replaceState({},'',`${location.pathname}#application`);
    document.querySelector('#application')?.scrollIntoView({block:'start'});
  }
}

function setMemberArea(visible){
  document.querySelectorAll('[data-member-only]').forEach(el=>{el.hidden=!visible});
}

function setPendingArea(visible){
  document.querySelectorAll('[data-pending-only]').forEach(el=>{el.hidden=!visible});
}

function setPortalMode(d){
  const approved=!!d.membershipApproved;
  const corporate=d.panelType==='corporate';
  setPendingArea(!approved);
  setApprovedArea(approved);
  setCorporateArea(corporate);
  setMemberArea(approved&&!corporate);
  document.querySelector('.portal-hero').hidden=approved;
  document.querySelector('#application').hidden=approved;
  const notice=document.querySelector('#approvalNotice');
  if(!approved){
    notice.hidden=false;
    notice.textContent=d.application
      ? `İmzalı başvurunuz alındı. ${d.application.membershipType||d.membershipType||'Üyelik'} başvurunuz admin veya moderatör onayından sonra panele açılacak.`
      : 'Dernek üyeliği için ıslak imzalı başvuru formunu yükleyin. Paneliniz onaydan sonra açılacak.';
  }else{
    notice.hidden=true;
    notice.textContent='';
    const target=corporate?'#company':'#profile';
    if(!location.hash||location.hash==='#application'){
      history.replaceState({},'',`${location.pathname}${target}`);
      document.querySelector(target)?.scrollIntoView({block:'start'});
    }
  }
}

function toggleOrganizationField(){
  const select=document.querySelector('#portalMembershipType');
  const field=document.querySelector('#organizationField');
  if(!select||!field)return;
  const show=isCorporateType(select.value);
  field.hidden=!show;
  const input=field.querySelector('input');
  if(input){
    input.required=show;
    if(!show)input.value='';
  }
}

function renderActivities(selected=[]){
  const box=document.querySelector('#activityChoices');
  if(!box)return;
  const chosen=new Set(selected||[]);
  box.innerHTML=Object.entries(activityGroups).map(([group,items])=>`
    <details class="activity-group" open>
      <summary>${group}</summary>
      <div>${[group,...items].map(name=>`<label><input type="checkbox" value="${name.replace(/"/g,'&quot;')}" ${chosen.has(name)?'checked':''}> ${name}</label>`).join('')}</div>
    </details>`).join('');
}

async function loadMemberTypes(selected){
  const select=document.querySelector('#portalMembershipType');
  if(!select)return;
  try{
    const types=await fetch(apiPath('/api/public/member-types'),{cache:'no-store'}).then(r=>r.json());
    if(Array.isArray(types)&&types.length){
      memberTypes=types;
      select.innerHTML=types.map(t=>`<option value="${String(t.title||'').replace(/"/g,'&quot;')}">${t.title}</option>`).join('');
    }
    if(selected)select.value=selected;
    select.onchange=()=>{
      const selectedType=memberTypes.find(t=>t.title===select.value);
      renderFees({...member?.finance,category:select.value,entryFee:Number(selectedType?.entryFee)||0});
      toggleOrganizationField();
    };
    select.onchange();
  }catch{
    if(selected)select.value=selected;
    toggleOrganizationField();
  }
}

function fillProfile(d){
  const form=document.querySelector('#profileForm');
  form.name.value=d.name||'';
  form.phone.value=d.phone||'';
  form.city.value=d.city||'';
  form.profession.value=d.profession||'';
}

function renderFees(finance={}){
  const tariff=finance.currentTariff,entry=Number(finance.entryFee)||0;
  document.querySelector('#feeInfo').innerHTML=`<h4>Üyelik bedelleri</h4>
    <div class="fee-row"><span>Üye kategorisi</span><b>${finance.category||'Genel'}</b></div>
    <div class="fee-row"><span>Tanımlı aidat</span><b>${tariff?`${money(tariff.amount)} / ${tariff.frequency||'dönem'}`:'Henüz tarife tanımlanmadı'}</b></div>
    <div class="fee-row warning"><span>Üyelik giriş bedeli</span><b>${entry?money(entry):'Henüz tanımlanmadı'}</b></div>
    <small>Giriş bedeli tek seferliktir. Aidat ve giriş bedeli sayman panelindeki tanımlardan otomatik okunur.</small>`;
}

function fillCompany(company={}){
  const f=document.querySelector('#companyForm');
  ['name','phone','email','website','city','address','description'].forEach(k=>{if(f[k])f[k].value=company[k]||''});
  companyLogoData=company.logo||company.image||'';
  document.querySelector('#companyStatus').textContent=company.status||'Henüz kart yok';
  renderActivities(Array.isArray(company.activities)?company.activities:String(company.activities||company.specialty||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean));
}

function renderJobs(jobs=[]){
  const box=document.querySelector('#jobList');
  if(!box)return;
  box.innerHTML=jobs.length?`<h4>İlan taleplerim</h4>${jobs.map(j=>`<div class="job-row"><b>${j.title}</b><span>${j.type||'İlan'} · ${j.location||''}</span><em>${j.status||'Onay bekliyor'}</em></div>`).join('')}`:'<p class="hint">Henüz ilan talebiniz yok.</p>';
}

function renderPaymentInfo(finance={},profile={}){
  const box=document.querySelector('#paymentInfo');if(!box)return;
  const bank=finance.bankAccount,balance=finance.balance||{},tariff=finance.currentTariff;
  if(!profile.membershipApproved||!bank){box.innerHTML='<p class="hint">Ödeme bilgileri üyelik onayından sonra gösterilir.</p>';return}
  box.innerHTML=`<div class="payment-bank">
    <div><small>ALICI</small><b>${escapeHtml(bank.accountName||'PEYZAJDER')}</b></div>
    <div><small>IBAN</small><b class="iban">${escapeHtml(formatIban(bank.iban))}</b><button id="copyIban" type="button">IBAN'ı kopyala</button></div>
    <div><small>ÖDEME AÇIKLAMASI</small><b>${escapeHtml(finance.paymentReference||'')}</b></div>
  </div>
  <div class="payment-summary">
    <article><small>Üyelik giriş bedeli</small><b>${Number(finance.entryFee)>0?money(finance.entryFee):'Tanımlanmadı'}</b></article>
    <article><small>Güncel aidat</small><b>${tariff?`${money(tariff.amount)} / ${escapeHtml(tariff.frequency||'dönem')}`:'Tanımlanmadı'}</b></article>
    <article><small>Toplam kalan borç</small><b>${money(balance.remaining||0)}</b></article>
  </div>
  <p class="payment-note">Havale açıklamasına yukarıdaki ödeme açıklamasını aynen yazın. Ödeme yaptıktan sonra dekontunuzu aşağıdaki formdan saymana iletin.</p>`;
  document.querySelector('#copyIban').onclick=async()=>{try{await navigator.clipboard.writeText(String(bank.iban||''));paymentMessage.textContent='IBAN kopyalandı.'}catch{paymentMessage.textContent='IBAN kopyalanamadı; elle seçebilirsiniz.'}};
}

function renderInvitations(items=[]){
  const box=document.querySelector('#invitationList');if(!box)return;
  box.innerHTML=items.length?items.map(x=>`<article class="job-row"><div><small>${x.date?new Date(x.date).toLocaleDateString('tr-TR'):'DAVETİYE'}</small><b>${x.title||'PEYZAJDER etkinliği'}</b><p>${x.message||x.description||''}</p>${x.location?`<a href="${x.location}" target="_blank" rel="noopener">Yer / bağlantı →</a>`:''}</div></article>`).join(''):'<p class="hint">Üyelik türünüze gönderilmiş güncel davetiye bulunmuyor.</p>';
}

function renderNotifications(items=[]){
  const box=document.querySelector('#notificationList');if(!box)return;
  box.innerHTML=items.length?items.map(item=>`<article class="job-row"><div><small>${item.startDate?new Date(item.startDate).toLocaleDateString('tr-TR'):'BİLDİRİM'}</small><b>${item.title||'PEYZAJDER bildirimi'}</b><p>${item.message||item.description||''}</p>${item.link||item.url?`<a href="${item.link||item.url}" target="_blank" rel="noopener">Detayı aç →</a>`:''}</div></article>`).join(''):'<p class="hint">Güncel bildiriminiz bulunmuyor.</p>';
}

function renderMemberMessages(items=[]){
  const box=document.querySelector('#memberMessageList');if(!box)return;
  box.innerHTML=items.length?items.map(x=>`<div class="job-row"><b>${x.direction||'Mesaj'}</b><span>${x.message||''}</span><em>${new Date(x.createdAt||Date.now()).toLocaleString('tr-TR')}</em></div>`).join(''):'<p class="hint">Henüz mesaj yok.</p>';
}

function renderSupportTickets(items=[]){
  const box=document.querySelector('#supportList');if(!box)return;
  box.innerHTML=items.length?items.map(item=>`<div class="job-row"><b>${item.title||'Destek talebi'}</b><span>${item.message||''}</span>${item.reply?`<p><strong>Yönetim yanıtı:</strong> ${item.reply}</p>`:''}<em>${item.status||'Açık'} · ${new Date(item.createdAt||Date.now()).toLocaleString('tr-TR')}</em></div>`).join(''):'<p class="hint">Henüz destek talebi yok.</p>';
}

async function loadSupportTickets(){
  try{const response=await fetch(apiPath('/api/member/support'),{credentials:'same-origin'});if(response.ok)renderSupportTickets(await response.json())}catch{}
}

async function loadJobs(){
  try{const r=await fetch(apiPath('/api/member/jobs'),{credentials:'same-origin'});if(r.ok)renderJobs(await r.json())}catch{}
}

async function load(){
  const r=await fetch(apiPath('/api/member/me'),{credentials:'same-origin'});
  const d=await r.json();
  if(!r.ok)return location.href='member-login.html';
  member=d;
  document.querySelector('#hello').textContent=`Merhaba, ${d.name||d.email}`;
  document.querySelector('#status').textContent=d.membershipStatus||'Site üyesi';
  const selectedType=d.application?.membershipType||d.membershipType||d.finance?.category||'Bireysel';
  await loadMemberTypes(selectedType);
  fillProfile(d);
  renderFees(d.finance||{});
  renderPaymentInfo(d.finance||{},d);
  const showCorporatePanel=d.panelType==='corporate';
  setPortalMode(d);
  renderNotifications(d.notifications||[]);
  renderInvitations(d.invitations||[]);
  renderMemberMessages(d.messages||[]);
  if(d.membershipApproved)loadSupportTickets();
  const hasApplication=Boolean(d.application);
  document.querySelector('#applicationUploadCard').hidden=hasApplication;
  document.querySelector('#application').classList.toggle('has-application',hasApplication);
  if(showCorporatePanel){
    fillCompany(d.company||{email:d.email,phone:d.phone,city:d.city,name:d.application?.organization||''});
    loadJobs();
  }
  if(new URLSearchParams(location.search).get('created')){
    document.querySelector('#createdNotice').hidden=false;
    history.replaceState({},'',location.pathname);
  }
  if(d.application&&!d.membershipApproved){
    document.querySelector('#currentApplication').hidden=false;
    document.querySelector('#applicationInfo').innerHTML=`<b>${d.application.documentName||'İmzalı başvuru formu'}</b><span>${d.application.status}</span><a href="${d.application.documentUrl}" target="_blank">Belgeyi görüntüle</a>`;
  }else{
    document.querySelector('#currentApplication').hidden=true;
  }
}

function imageToWebp(input,max=900){
  return new Promise((resolve,reject)=>{
    const f=input.files?.[0];if(!f)return resolve('');
    const img=new Image(),reader=new FileReader();
    reader.onload=()=>{img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/webp',.84))};img.onerror=reject;img.src=reader.result};
    reader.onerror=reject;reader.readAsDataURL(f);
  });
}

file.addEventListener('change',()=>{
  const selected=file.files[0];
  if(selected&&selected.size>MAX_APPLICATION_SIZE){
    file.value='';
    document.querySelector('#fileLabel').textContent='Dosya seçin veya buraya bırakın';
    message.textContent='Dosya en fazla 1 MB olabilir.';
    return;
  }
  message.textContent='';
  document.querySelector('#fileLabel').textContent=selected?.name||'Dosya seçin veya buraya bırakın';
});
logoInput.addEventListener('change',async()=>{companyMessage.textContent='Logo WebP formatına hazırlanıyor…';companyLogoData=await imageToWebp(logoInput);companyMessage.textContent='Logo hazır. Kaydedince onaya gönderilecek.'});

document.querySelector('#uploadForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!file.files[0])return;if(file.files[0].size>MAX_APPLICATION_SIZE){message.textContent='Dosya en fazla 1 MB olabilir.';return}message.textContent='Belgeniz yükleniyor…';
  const reader=new FileReader();reader.onload=async()=>{try{const form=Object.fromEntries(new FormData(e.target));form.data=reader.result;form.name=file.files[0].name;const r=await fetch(apiPath('/api/member/application'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.error);message.textContent='İmzalı başvurunuz yönetim paneline iletildi.';load()}catch(x){message.textContent=x.message}};reader.readAsDataURL(file.files[0]);
});

document.querySelector('#profileForm').addEventListener('submit',async e=>{
  e.preventDefault();profileMessage.textContent='Bilgileriniz kaydediliyor…';
  try{const data=Object.fromEntries(new FormData(e.target));const r=await fetch(apiPath('/api/member/profile'),{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Bilgiler kaydedilemedi');profileMessage.textContent='Kişisel bilgileriniz güncellendi.';await load()}catch(x){profileMessage.textContent=x.message}
});

document.querySelector('#companyForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const activities=[...document.querySelectorAll('#activityChoices input:checked')].map(x=>x.value);
  if(!activities.length){companyMessage.textContent='Firma Bulucu için en az bir faaliyet alanı seçin.';return}
  companyMessage.textContent='Firma kartı kaydediliyor…';
  try{const data=Object.fromEntries(new FormData(e.target));data.logo=companyLogoData;data.activities=activities;const r=await fetch(apiPath('/api/member/company'),{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Firma kartı kaydedilemedi');companyMessage.textContent='Firma kartınız yayınlandı ve Firma Bulucu alanına eklendi.';fillCompany(d)}catch(x){companyMessage.textContent=x.message}
});

document.querySelector('#paymentNotificationForm').addEventListener('submit',async e=>{
  e.preventDefault();const receipt=document.querySelector('#paymentReceipt'),selected=receipt.files?.[0];if(!selected)return;if(selected.size>MAX_APPLICATION_SIZE){paymentMessage.textContent='Dekont en fazla 1 MB olabilir.';receipt.value='';return}paymentMessage.textContent='Ödeme bildiriminiz gönderiliyor…';
  const reader=new FileReader();reader.onload=async()=>{try{const data=Object.fromEntries(new FormData(e.target));data.data=reader.result;data.name=selected.name;const response=await fetch(apiPath('/api/member/payment-notification'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)}),result=await response.json();if(!response.ok)throw new Error(result.error||'Ödeme bildirimi gönderilemedi');e.target.reset();e.target.paymentDate.value=new Date().toISOString().slice(0,10);paymentMessage.textContent='Dekontunuz sayman onayına gönderildi.'}catch(error){paymentMessage.textContent=error.message}};reader.readAsDataURL(selected);
});

document.querySelector('#jobForm').addEventListener('submit',async e=>{
  e.preventDefault();jobMessage.textContent='İlan talebi gönderiliyor…';
  try{const data=Object.fromEntries(new FormData(e.target));data.company=document.querySelector('#companyForm').name.value||member.application?.organization||member.name;const r=await fetch(apiPath('/api/member/jobs'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.error||'İlan gönderilemedi');jobMessage.textContent='İlan talebiniz onaya gönderildi.';e.target.reset();loadJobs()}catch(x){jobMessage.textContent=x.message}
});

document.querySelector('#memberMessageForm').addEventListener('submit',async e=>{
  e.preventDefault();const status=document.querySelector('#memberMessageStatus');status.textContent='Mesaj gönderiliyor…';
  try{const data=Object.fromEntries(new FormData(e.target));const r=await fetch(apiPath('/api/member/messages'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Mesaj gönderilemedi');e.target.reset();status.textContent='Mesajınız yönetime iletildi.';await load()}catch(x){status.textContent=x.message}
});

document.querySelector('#supportForm')?.addEventListener('submit',async event=>{
  event.preventDefault();const output=document.querySelector('#supportMessage');output.textContent='Destek talebiniz kaydediliyor…';
  try{const response=await fetch(apiPath('/api/member/support'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(Object.fromEntries(new FormData(event.target)))}),data=await response.json();if(!response.ok)throw new Error(data.error||'Destek talebi oluşturulamadı');event.target.reset();output.textContent='Destek talebiniz yönetime iletildi.';loadSupportTickets()}catch(error){output.textContent=error.message}
});

document.querySelector('#logout').onclick=async()=>{await fetch(apiPath('/api/member/logout'),{credentials:'same-origin'});location.href='member-login.html'};
document.querySelectorAll('.portal-side nav a[href^="#"]').forEach(a=>a.onclick=()=>{document.querySelectorAll('.portal-side nav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')});
setApprovedArea(false);
setCorporateArea(false);
setMemberArea(false);
setPendingArea(true);
renderActivities();
toggleOrganizationField();
document.querySelector('#paymentNotificationForm').paymentDate.value=new Date().toISOString().slice(0,10);
load();
