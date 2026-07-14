const $=s=>document.querySelector(s),apiPath=path=>('/api/'+String(path||'').replace(/^\/api\//,'')).replace(/\/+/g,'/'),api=async(path,opt={})=>{const url=apiPath(path),r=await fetch(url,{credentials:'same-origin',...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}}),txt=await r.text();let d={};try{d=txt?JSON.parse(txt):{}}catch{throw new Error(`API yanıtı JSON değil (${r.status}) ${url}: ${txt.slice(0,120)||'Boş yanıt'}`)}if(!r.ok)throw new Error(d.error||`İşlem başarısız (${r.status}) ${url}`);return d};
const modules={
dashboard:['Genel bakış','ANA','⌂'],content:['İçerikler','WEB SİTESİ','▤'],events:['Etkinlikler','WEB SİTESİ','◇'],publications:['Yayınlar','WEB SİTESİ','▧'],webinars:['Webinarlar','WEB SİTESİ','◫'],galleries:['Foto galeriler','MULTİMEDYA','▣'],videos:['Videolar','MULTİMEDYA','▷'],articles:['Köşe yazıları','MULTİMEDYA','✎'],authors:['Köşe yazarları','MULTİMEDYA','♙'],
members:['Tüm üyeler','ÜYELER VE KURULLAR','◎'],memberGroups:['Üye grupları','ÜYELER VE KURULLAR','◉'],applications:['Üyelik başvuruları','ÜYELER VE KURULLAR','＋'],boards:['Kurullar ve üyeleri','ÜYELER VE KURULLAR','♙'],firms:['Firma rehberi','ÜYELER VE KURULLAR','⌖'],
dues:['Aidat kayıtları','AİDAT YÖNETİMİ','₺'],duePeriods:['Aidat tanımları','AİDAT YÖNETİMİ','◷'],payments:['Ödemeler','AİDAT YÖNETİMİ','✓'],businessLedger:['İşletme hesabı','DEFTER YÖNETİMİ','▥'],decisions:['Karar defteri','DEFTER YÖNETİMİ','≣'],
subscribers:['E-bülten aboneleri','İLETİŞİM','@'],emailCampaigns:['E-posta yönetimi','İLETİŞİM','✉'],smsCampaigns:['SMS yönetimi','İLETİŞİM','▤'],notifications:['Bildirim yönetimi','İLETİŞİM','♢'],contactMessages:['Gelen mesajlar','İLETİŞİM','☏'],supportTickets:['Destek talepleri','İLETİŞİM',''],surveys:['Anketler','İLETİŞİM','☑'],
menus:['Menü yönetimi','YERLEŞİM','≡'],sliders:['Slaytlar','YERLEŞİM','▱'],popups:['Açılır pencereler','YERLEŞİM','▢'],promoPanels:['Yarışma panosu','YERLEŞİM','◂'],socialLinks:['Sosyal medya','YERLEŞİM','⌁'],sponsors:['Sponsor / reklam alanları','YERLEŞİM','★'],sponsorCategories:['Sponsor kategorileri','YERLEŞİM','◆'],jobPosts:['İş ilanları','FIRSATLAR','↗'],bankAccounts:['Hesap numaraları','AYARLAR','₺'],settings:['Site ayarları','AYARLAR','⚙'],users:['Yetkililer','AYARLAR','♜'],modules:['Modüller','AYARLAR','◈']};
const F={title:['title','Başlık','text'],name:['name','Ad / isim','text'],status:['status','Durum','select','Aktif,Pasif,Taslak,Yayında,Beklemede,Tamamlandı'],description:['description','Açıklama','textarea'],date:['date','Tarih','date'],email:['email','E-posta','email'],phone:['phone','Telefon','text'],amount:['amount','Tutar','number']};
const schemas={content:[F.title,['category','Kategori','select','haberler,duyurular,basinda-biz,ilanlar,ihaleler,projeler,kurumsal'],F.status,['summary','Özet','textarea'],['body','İçerik','textarea'],['image','Görsel yolu','text']],events:[F.title,F.date,['location','Konum','text'],F.status,F.description],publications:[F.title,['file','Dosya bağlantısı','text'],F.date,F.status,F.description],webinars:[F.title,F.date,['speaker','Konuşmacı','text'],['link','Katılım bağlantısı','url'],F.status,F.description],galleries:[F.title,['cover','Kapak görseli','text'],F.date,F.status,F.description],videos:[F.title,['videoUrl','Video bağlantısı','url'],F.status,F.description],articles:[F.title,['author','Yazar','text'],['image','Yazı görseli','text'],F.date,['featuredUntil','Ana sayfada gösterim bitişi','date'],F.status,['body','Yazı','textarea']],authors:[F.name,F.email,['photo','Fotoğraf','text'],F.status,F.description],members:[F.name,F.email,F.phone,['memberNo','Üye no','text'],['group','Üye grubu','text'],F.status],memberGroups:[F.title,['entryFee','Üyelik giriş bedeli','number'],['order','Sıra','number'],F.description,F.status],applications:[F.name,F.email,F.phone,F.date,F.status,['note','Not','textarea']],boards:[['title','Kurul','text'],F.name,['role','Görev','text'],F.status],firms:[F.name,['logo','Logo / WebP yolu','text'],['city','Şehir','text'],['address','Adres','textarea'],F.phone,F.email,['website','Web sitesi','url'],['activities','Faaliyet alanları','textarea'],['specialty','Kısa uzmanlık özeti','text'],F.status,F.description],dues:[['member','Üye','text'],['period','Dönem','text'],F.amount,['paid','Ödenen','number'],['dueDate','Son ödeme','date'],F.status],duePeriods:[F.title,F.amount,['startDate','Başlangıç','date'],['endDate','Bitiş','date'],F.status],payments:[['member','Üye','text'],F.amount,F.date,['method','Yöntem','select','Havale,Kredi Kartı,Nakit'],F.status],businessLedger:[F.title,F.date,['type','Tür','select','Gelir,Gider'],F.amount,F.description],decisions:[F.title,['decisionNo','Karar no','text'],F.date,['body','Karar metni','textarea'],F.status],subscribers:[F.email,F.name,F.status],emailCampaigns:[F.title,['subject','Konu','text'],['audience','Alıcı grubu','text'],['body','Mesaj','textarea'],F.status],smsCampaigns:[F.title,['audience','Alıcı grubu','text'],['message','SMS metni','textarea'],F.status],notifications:[F.title,['audience','Hedef','text'],['message','Bildirim','textarea'],F.status],contactMessages:[F.name,F.email,F.phone,['subject','Konu','text'],['message','Mesaj','textarea'],F.status],supportTickets:[F.title,F.name,F.email,['priority','Öncelik','select','Düşük,Normal,Yüksek'],['message','Talep','textarea'],F.status],surveys:[F.title,['question','Soru','textarea'],['options','Seçenekler (virgülle)','text'],F.status],menus:[F.title,['url','Bağlantı','text'],['parent','Üst menü','text'],['order','Sıra','number'],F.status],sliders:[F.title,['image','Görsel','text'],['url','Bağlantı','text'],['order','Sıra','number'],F.status],popups:[F.title,['body','İçerik','textarea'],['startDate','Başlangıç','date'],['endDate','Bitiş','date'],F.status],socialLinks:[F.title,['url','Profil bağlantısı','url'],F.status],sponsors:[F.name,['placement','Reklam alanı','text'],['image','Logo / görsel yolu','text'],['url','Bağlantı','url'],['endDate','Bitiş','date'],F.status],jobPosts:[F.title,['company','Firma','text'],['location','Konum','text'],['type','İlan tipi','select','Eleman arama,Stajyer arama,Tam zamanlı,Yarı zamanlı,Proje bazlı'],['url','Başvuru bağlantısı','url'],['endDate','Son başvuru','date'],F.status,F.description],bankAccounts:[['bank','Banka','text'],['accountName','Hesap adı','text'],['iban','IBAN','text'],['currency','Para birimi','select','TRY,USD,EUR'],F.status],settings:[F.title,['key','Ayar anahtarı','text'],['value','Değer','textarea'],F.status],users:[F.name,F.email,['role','Yetki','select','Yönetici,Editör,Muhasebe,Üye yöneticisi'],F.status],modules:[F.title,['key','Modül kodu','text'],F.status,F.description]};
schemas.promoPanels=[F.title,['label','Yatık kenar yazısı','text'],['body','Kısa açıklama','textarea'],['buttonText','Buton metni','text'],['url','Bağlantı','url'],['startDate','Başlangıç','date'],['endDate','Bitiş','date'],['order','Sıra','number'],F.status];
schemas.promoPanels=[F.title,['label','Yatık kenar yazısı','text'],['body','Kısa açıklama','textarea'],['buttonText','Buton metni','text'],['url','Bağlantı','url'],['mainSponsorTitle','Sponsor başlığı','text'],['mainSponsorLogo','Ana sponsor logosu','text'],['mainSponsorUrl','Ana sponsor web adresi','url'],['startDate','Başlangıç','date'],['endDate','Bitiş','date'],['order','Sıra','number'],F.status];
schemas.sponsors=[F.name,['placement','Yerleşim','select','Yarışma Sayfası,Ana Sayfa,Genel'],['category','Sponsor kategorisi','text'],['image','Logo / görsel yolu','text'],['url','Web adresi','url'],['order','Sıra','number'],['endDate','Bitiş','date'],F.status,F.description];
schemas.sponsorCategories=[F.title,['order','Sıra','number'],F.status,F.description];
schemas.users=[F.name,F.email,['role','Yetki','select','Yönetici,Moderatör,Sayman,Köşe Yazarı'],['password','Geçici şifre (boş bırakılırsa otomatik)','password'],['autoPassword','Şifre otomatik oluştur','select',',Evet'],F.status];
schemas.boards=[['title','Kurul adı','text'],F.name,['role','Görev / unvan','text'],['term','Görev dönemi','text'],['order','Sıralama','number'],['photo','Fotoğraf yolu','text'],['bio','Kısa özgeçmiş','textarea'],F.status];
let state={view:'dashboard',items:[],edit:null};
const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2200)}
let currentRole='admin';const uiAccess={sayman:new Set(['dashboard','dues','duePeriods','payments','businessLedger','bankAccounts','members','memberGroups','settings']),moderator:new Set(['dashboard','content','events','publications','webinars','galleries','videos','articles','authors','sliders','jobPosts','firms','users']),author:new Set(['articles'])};
function buildNav(){let last='';const entries=Object.entries(modules).filter(([k])=>currentRole==='admin'||uiAccess[currentRole]?.has(k));$('#nav').innerHTML=entries.map(([k,[label,group,icon]])=>{const h=group!==last?(last=group,group==='ANA'?'':`<p>${group}</p>`):'';return`${h}<button type="button" class="${k==='dashboard'?'active':''}" data-view="${k}" title="${label}">${icon} <span>${label}</span></button>`}).join('')}
async function boot(){try{const me=await api('me');currentRole=me.role||'admin';showApp()}catch{$('#loginView').hidden=false}}function showApp(){$('#loginView').hidden=true;$('#appView').hidden=false;buildNav();$('#today').textContent=new Intl.DateTimeFormat('tr-TR',{dateStyle:'full'}).format(new Date());openView('dashboard')}
$('#loginForm').onsubmit=async e=>{e.preventDefault();try{const result=await api('login',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});currentRole=result.role||'admin';showApp()}catch(x){$('#loginError').textContent=x.message}};$('#logout').onclick=async()=>{await api('logout');location.reload()};$('#nav').onclick=e=>{const b=e.target.closest('[data-view]');if(b)openView(b.dataset.view)};
async function openView(view){try{state.view=view;$('#nav .active')?.classList.remove('active');$(`#nav [data-view="${view}"]`)?.classList.add('active');$('#viewTitle').textContent=modules[view][0];$('#addButton').hidden=view==='dashboard';if(view==='dashboard')return dashboard();state.items=await api(view);renderList()}catch(err){$('#workspace').innerHTML=`<p class="empty">Bu bölüm yüklenemedi: ${escapeHtml(err.message||'Bağlantı hatası')}</p>`;toast(err.message||'Bölüm yüklenemedi')}}
async function dashboard(){const d=await api('dashboard'),cards=['content','events','members','dues','firms'];$('#workspace').innerHTML=`<div class="stat-grid">${cards.map(k=>`<article class="stat"><i>${modules[k][0]}</i><strong>${d.counts[k]||0}</strong></article>`).join('')}</div><div class="dash-grid"><article class="panel welcome"><p class="eyebrow">PEYZAJDER YÖNETİM</p><h2>Tüm dernek işlemleri tek panelde.</h2><p>Web içeriklerinden aidatlara, üye ve kurul kayıtlarından iletişim kampanyalarına kadar ${Object.keys(modules).length-1} yönetim modülü etkin.</p></article><article class="panel"><h2>Son işlemler</h2>${d.activity.length?d.activity.map(x=>`<div class="activity-row"><span>•</span><div><b>${x.action}: ${escapeHtml(x.item||modules[x.collection]?.[0]||'Kayıt')}</b><small>${new Date(x.at).toLocaleString('tr-TR')}</small></div></div>`).join(''):'<p class="empty">Henüz işlem yok.</p>'}</article></div>`}
function renderList(){$('#workspace').innerHTML=`<div class="data-toolbar"><input id="tableSearch" placeholder="${modules[state.view][0]} içinde ara…"><select id="statusFilter"><option value="">Tüm durumlar</option><option>Yayında</option><option>Taslak</option><option>Aktif</option><option>Beklemede</option><option>Tamamlandı</option></select></div><div class="table-wrap"><table><thead><tr><th>BAŞLIK / AD</th><th>DETAY</th><th>DURUM</th><th>GÜNCELLEME</th><th>İŞLEM</th></tr></thead><tbody id="rows"></tbody></table></div>`;drawRows();$('#tableSearch').oninput=drawRows;$('#statusFilter').onchange=drawRows}
function drawRows(){const q=($('#tableSearch').value||'').toLocaleLowerCase('tr'),s=$('#statusFilter').value||'',list=state.items.filter(x=>JSON.stringify(x).toLocaleLowerCase('tr').includes(q)&&(!s||x.status===s));$('#rows').innerHTML=list.length?list.map(x=>`<tr><td><b>${escapeHtml(x.title||x.name||x.member||x.bank||x.email||'Kayıt')}</b><small>${escapeHtml(x.summary||x.description||x.subject||x.role||x.email||'')}</small></td><td>${escapeHtml(x.category||x.city||x.date||x.period||x.amount||x.key||'—')}</td><td><span class="status">${escapeHtml(x.status||'Kayıtlı')}</span></td><td>${new Date(x.updatedAt||x.createdAt).toLocaleDateString('tr-TR')}</td><td><div class="row-actions"><button data-edit="${x.id}">Düzenle</button><button data-delete="${x.id}">Sil</button></div></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Henüz kayıt yok. “Yeni kayıt” ile ekleyebilirsiniz.</td></tr>`;$('#rows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(state.items.find(x=>x.id===b.dataset.edit)));$('#rows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeItem(b.dataset.delete))}
$('#addButton').onclick=()=>openEditor();$('#closeEditor').onclick=$('#cancelEditor').onclick=()=>$('#editor').close();function openEditor(item=null){state.edit=item;$('#formEyebrow').textContent=item?'KAYDI D?ZENLE':'YEN? KAYIT';$('#formTitle').textContent=item?(item.title||item.name||'Kayd? d?zenle'):`Yeni ${modules[state.view][0]} kaydı`;$('#formFields').innerHTML=`<div class="field-grid">${(schemas[state.view]||[F.title,F.description,F.status]).map(([key,label,type,opt])=>{const v=escapeHtml(item?.[key]||'');if(type==='textarea')return`<label class="full">${label}<textarea name="${key}">${v}</textarea></label>`;if(type==='select')return`<label>${label}<select name="${key}">${opt.split(',').map(o=>`<option ${o===(item?.[key]||'')?'selected':''}>${o}</option>`).join('')}</select></label>`;return`<label>${label}<input name="${key}" type="${type}" value="${v}"></label>`}).join('')}</div>`;$('#editor').showModal()}
$('#editorForm').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{await api(state.edit?`${state.view}/${state.edit.id}`:state.view,{method:state.edit?'PUT':'POST',body:JSON.stringify(data)});$('#editor').close();toast('Kayıt kaydedildi');state.items=await api(state.view);renderList()}catch(x){toast(x.message)}};async function removeItem(id){if(!confirm('Bu kaydı silmek istediğinize emin misiniz'))return;await api(`${state.view}/${id}`,{method:'DELETE'});state.items=state.items.filter(x=>x.id!==id);drawRows();toast('Kayıt silindi')}
const drawRowsBase=drawRows;drawRows=function(){drawRowsBase();if(state.view==='applications'){document.querySelectorAll('#rows tr').forEach(row=>{const id=row.querySelector('[data-edit]').dataset.edit,item=state.items.find(x=>x.id===id);if(item.documentUrl&&row.children[1])row.children[1].innerHTML=`<a href="${escapeHtml(item.documentUrl)}" target="_blank" style="color:#416b4e;font-weight:700">İmzalı formu aç ↗</a>`})}};
document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="dashboard.css">');
dashboard=async function(){const d=await api('dashboard'),safe=async n=>{try{return await api(n)}catch{return[]}},members=await safe('members'),applications=await safe('applications'),dues=await safe('dues'),messages=await safe('contactMessages');const pending=dues.filter(x=>!['Ödendi','Tamamlandı'].includes(x.status)).reduce((s,x)=>s+(Number(x.amount)||0)-(Number(x.paid)||0),0),recent=members.slice(0,5),vals=[140,125,510,455,80,220,285,95,80,185,135,180,115,160,270,845,285,260,275,990,105,230,305,235,265,100,350,125,90,555],points=vals.map((v,i)=>`${i*(700/29)},${230-v/5}`).join(' ');$('#workspace').innerHTML=`<div class="overview-cards"><article class="overview-card"><span class="overview-icon green">♙</span><div><small>ONAYLI ÜYE</small><strong>${members.filter(x=>x.status.includes('Üye')||x.status==='Aktif').length}</strong><em>Üye kayıtlarını görüntüle</em></div></article><article class="overview-card"><span class="overview-icon yellow">◎</span><div><small>ONAY BEKLEYEN ÜYE</small><strong>${applications.filter(x=>!['Onaylandı','Reddedildi'].includes(x.status)).length}</strong><em>Başvuruları incele</em></div></article><article class="overview-card"><span class="overview-icon teal">₺</span><div><small>BEKLEYEN AİDAT</small><strong>${pending.toLocaleString('tr-TR',{minimumFractionDigits:2})} ₺</strong><em>Tahsilat kayıtlarını aç</em></div></article><article class="overview-card"><span class="overview-icon blue">▤</span><div><small>YAYINDAKİ İÇERİK</small><strong>${d.published}</strong><em>Toplam ${d.counts.content} içerik</em></div></article></div><section class="analytics-panel"><div class="overview-heading"><div><h2>Site ziyaretçi istatistikleri</h2><p>Son 30 günlük görünüm</p></div><span class="status">Son 30 gün</span></div><div class="analytics-content"><div class="chart-box"><svg viewBox="0 0 700 245" preserveAspectRatio="none"><defs><linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b9363" stop-opacity=".3"/><stop offset="1" stop-color="#4b9363" stop-opacity="0"/></linearGradient></defs><polygon class="chart-fill" points="0,240 ${points} 700,240"/><polyline class="chart-line" points="${points}"/></svg><div class="chart-label-row"><span>8 Haz</span><span>14 Haz</span><span>20 Haz</span><span>26 Haz</span><span>2 Tem</span><span>7 Tem</span></div></div><aside class="analytics-summary"><div class="summary-block"><b>Bugün</b><span>● 136 ziyaretçi</span><span>◉ 347 gösterim</span></div><div class="summary-block"><b>Son 30 gün</b><span>● 4.056 ziyaretçi</span><span>◉ 8.084 gösterim</span></div><div class="summary-block"><b>Toplam</b><span>● 227.349 ziyaretçi</span><span>◉ 309.928 gösterim</span></div></aside></div></section><div class="overview-lower"><section class="overview-panel"><h2>Son üyeler</h2>${recent.length?recent.map(x=>`<div class="recent-member"><i>${escapeHtml((x.name||'Ü').split(' ').map(y=>y[0]).slice(0,2).join(''))}</i><div><b>${escapeHtml(x.name||'İsimsiz üye')}</b><small>${escapeHtml(x.memberNo||x.status||'Site üyesi')} · ${new Date(x.createdAt||Date.now()).toLocaleDateString('tr-TR')}</small></div></div>`).join(''):'<p class="empty">Henüz üye kaydı yok.</p>'}</section><section class="overview-panel"><h2>Hızlı erişim</h2><div class="quick-actions"><button data-go="sliders">＋ Anasayfaya slayt ekle</button><button data-go="menus">≡ Menüleri düzenle</button><button data-go="members">♙ Üyeleri listele</button><button data-go="emailCampaigns">✉ Toplu e-posta gönder</button><button data-go="content">▤ Yeni haber ekle</button><button data-go="events">◇ Yeni etkinlik ekle</button><button data-go="dues">₺ Aidatları listele</button><button data-go="settings">⚙ Site ayarları</button></div><h2 style="margin-top:24px">Okunmamış mesajlar <span class="status">${messages.filter(x=>x.status!=='Okundu').length}</span></h2></section></div>`;document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go))};
const overviewDashboard=dashboard;dashboard=async function(){await overviewDashboard();try{const d=await api('dashboard'),rows=(d.activity||[]).slice(0,8);document.querySelector('.overview-lower')?.insertAdjacentHTML('beforeend',`<section class="overview-panel"><h2>Yönetim hareketleri</h2>${rows.length?rows.map(x=>`<div class="activity-row"><span>•</span><div><b>${escapeHtml(x.user||'Sistem')} · ${escapeHtml(x.action||'İşlem')}</b><small>${escapeHtml(x.item||modules[x.collection]?.[0]||'Kayıt')} · ${new Date(x.at||Date.now()).toLocaleString('tr-TR')}</small></div></div>`).join(''):'<p class="empty">Henüz işlem yok.</p>'}</section>`)}catch{}};
const drawRowsWithSpecialCases=drawRows;drawRows=function(){if(state.view!=='menus')return drawRowsWithSpecialCases();const q=($('#tableSearch').value||'').toLocaleLowerCase('tr'),s=$('#statusFilter').value||'',list=state.items.filter(x=>JSON.stringify(x).toLocaleLowerCase('tr').includes(q)&&(!s||x.status===s)).sort((a,b)=>String(a.parent||'').localeCompare(String(b.parent||''),'tr')||(Number(a.order)||0)-(Number(b.order)||0)||String(a.title||'').localeCompare(String(b.title||''),'tr'));$('#rows').innerHTML=list.length?list.map(x=>`<tr><td><b>${escapeHtml(x.title||'Menü')}</b><small>${escapeHtml(x.parent?`Üst menü: ${x.parent}`:'Ana menü')}</small></td><td>${escapeHtml(`${x.url||'—'} · Sıra ${x.order||'—'}`)}</td><td><span class="status">${escapeHtml(x.status||'Aktif')}</span></td><td>${new Date(x.updatedAt||x.createdAt).toLocaleDateString('tr-TR')}</td><td><div class="row-actions"><button data-edit="${x.id}">Düzenle</button><button data-delete="${x.id}">Sil</button></div></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Henüz menü kaydı yok. “Yeni kayıt” ile ekleyebilirsiniz.</td></tr>`;$('#rows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(state.items.find(x=>x.id===b.dataset.edit)));$('#rows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeItem(b.dataset.delete))};
document.addEventListener('click',e=>{const b=e.target.closest?.('#nav [data-view]');if(b){e.preventDefault();openView(b.dataset.view)}},true);


const adminFlowOrder=[
  ['dashboard','Genel bak\u0131\u015f','ANA','\u2302'],
  ['siteMap','Site yerle\u015fim haritas\u0131','ANA','\u2301'],
  ['homeSettings','Ana sayfa metinleri','01 ANA SAYFA','\u2726'],
  ['promoPanels','Sa\u011f yar\u0131\u015fma panosu','01 ANA SAYFA','\u25c2'],
  ['sliders','G\u00fcndem slayt\u0131','02 G\u00dcNDEM','\u25b1'],
  ['news','Haberler','02 G\u00dcNDEM','\u25a4'],
  ['events','Etkinlikler','02 G\u00dcNDEM','\u25c7'],
  ['notices','Duyurular','02 G\u00dcNDEM','!'],
  ['firms','Firma rehberi','03 REHBER VE \u00dcYEL\u0130K','\u2316'],
  ['sponsors','Sponsor / reklam alanlar\u0131','03 REHBER VE \u00dcYEL\u0130K','\u2605'],
  ['sponsorCategories','Sponsor kategorileri','03 REHBER VE \u00dcYEL\u0130K','\u25c6'],
  ['jobPosts','\u0130\u015f ilanlar\u0131','03 REHBER VE \u00dcYEL\u0130K','\u2197'],
  ['members','T\u00fcm \u00fcyeler','03 REHBER VE \u00dcYEL\u0130K','\u25cf'],
  ['memberGroups','\u00dcye gruplar\u0131','03 REHBER VE \u00dcYEL\u0130K','\u25ce'],
  ['applications','\u00dcyelik ba\u015fvurular\u0131','03 REHBER VE \u00dcYEL\u0130K','\uff0b'],
  ['boards','Kurullar ve y\u00f6netim','04 KURUMSAL','\u2659'],
  ['content','Kurumsal / di\u011fer i\u00e7erikler','04 KURUMSAL','\u25a4'],
  ['publications','Yay\u0131nlar','04 KURUMSAL','\u25a7'],
  ['webinars','Webinarlar','04 KURUMSAL','\u25eb'],
  ['articles','K\u00f6\u015fe yaz\u0131lar\u0131','04 YAZARLAR VE MEDYA','\u270e'],
  ['authors','K\u00f6\u015fe yazarlar\u0131','04 YAZARLAR VE MEDYA','\u2659'],
  ['galleries','Foto galeriler','04 YAZARLAR VE MEDYA','\u25a3'],
  ['videos','Videolar','04 YAZARLAR VE MEDYA','\u25b7'],
  ['dues','Aidat kay\u0131tlar\u0131','05 MAL\u0130 \u0130\u015eLER','\u20ba'],
  ['duePeriods','Aidat tan\u0131mlar\u0131','05 MAL\u0130 \u0130\u015eLER','\u25c7'],
  ['payments','\u00d6demeler','05 MAL\u0130 \u0130\u015eLER','\u2713'],
  ['businessLedger','Gelir / gider kasas\u0131','05 MAL\u0130 \u0130\u015eLER','\u25a5'],
  ['bankAccounts','Hesap numaralar\u0131','05 MAL\u0130 \u0130\u015eLER','\u20ba'],
  ['decisions','Karar defteri','06 DEFTER VE KAYIT','\u2263'],
  ['contactMessages','Gelen mesajlar','07 \u0130LET\u0130\u015e\u0130M','\u260f'],
  ['subscribers','E-b\u00fclten aboneleri','07 \u0130LET\u0130\u015e\u0130M','@'],
  ['emailCampaigns','E-posta y\u00f6netimi','07 \u0130LET\u0130\u015e\u0130M','\u2709'],
  ['smsCampaigns','SMS y\u00f6netimi','07 \u0130LET\u0130\u015e\u0130M','\u25a4'],
  ['notifications','Bildirim y\u00f6netimi','07 \u0130LET\u0130\u015e\u0130M','\u2662'],
  ['supportTickets','Destek talepleri','07 \u0130LET\u0130\u015e\u0130M',''],
  ['surveys','Anketler','07 \u0130LET\u0130\u015e\u0130M','\u2611'],
  ['menus','Men\u00fc y\u00f6netimi','08 S\u0130TE AYARLARI','\u2261'],
  ['popups','A\u00e7\u0131l\u0131r pencereler','08 S\u0130TE AYARLARI','\u25a2'],
  ['socialLinks','Sosyal medya','08 S\u0130TE AYARLARI','\u2301'],
  ['settings','Site ayarlar\u0131','08 S\u0130TE AYARLARI','\u2699'],
  ['users','Site yönetimi kullanıcıları','08 S\u0130TE AYARLARI','\u265c'],
  ['modules','Mod\u00fcller','08 S\u0130TE AYARLARI','\u25c8']
];

adminFlowOrder.forEach(([key,label,group,icon])=>{if(modules[key])modules[key]=[label,group,icon];else if(['siteMap','homeSettings','news','notices'].includes(key))modules[key]=[label,group,icon]});
Object.keys(modules).forEach(key=>{if(!adminFlowOrder.some(([k])=>k===key))delete modules[key]});
const reorderedModules={};adminFlowOrder.forEach(([key])=>{if(modules[key])reorderedModules[key]=modules[key]});Object.keys(modules).forEach(key=>delete modules[key]);Object.assign(modules,reorderedModules);
if(uiAccess&&uiAccess.moderator)['siteMap','news','notices'].forEach(k=>uiAccess.moderator.add(k));
const contentViews={
  news:{category:'haberler',singular:'Haber',area:'ANA SAYFA / G\u00dcNDEM / HABERLER',title:'Haberleri y\u00f6netin',desc:'Ana sayfadaki Haberler kutusu, G\u00fcndem slayt\u0131 ve haber ar\u015fivi bu kay\u0131tlardan beslenir. Haber; duyuru veya etkinlikle kar\u0131\u015fmaz.',preview:'archive.html?cat=haberler'},
  notices:{category:'duyurular',singular:'Duyuru',area:'ANA SAYFA / G\u00dcNDEM / DUYURULAR',title:'Duyurular\u0131 y\u00f6netin',desc:'Ana sayfadaki Duyurular kutusu ve duyuru ar\u015fivi bu kay\u0131tlardan beslenir. Duyurular otomatik g\u00fcndem slayt\u0131na girmez.',preview:'archive.html?cat=duyurular'}
};
const homeSettingDefs=[
  ['home.hero.eyebrow','Hero \u00fcst etiketi','Do\u011fa \u00b7 Tasar\u0131m \u00b7 Ortak ak\u0131l'],
  ['home.hero.title','Hero ana ba\u015fl\u0131k','Ya\u015fanabilir bir gelecek i\u00e7in peyzaj\u0131 birlikte d\u00f6n\u00fc\u015ft\u00fcr\u00fcyoruz.'],
  ['home.hero.summary','Hero a\u00e7\u0131klama','Mesleki kaliteyi y\u00fckselten, s\u00fcrd\u00fcr\u00fclebilirli\u011fi oda\u011f\u0131na alan ve sekt\u00f6r\u00fcn t\u00fcm payda\u015flar\u0131n\u0131 ayn\u0131 zeminde bulu\u015fturan ba\u011f\u0131ms\u0131z bir meslek a\u011f\u0131.'],
  ['home.gundem.eyebrow','G\u00fcndem k\u00fc\u00e7\u00fck ba\u015fl\u0131k','PEYZAJDER g\u00fcndemi'],
  ['home.competition.title','Yar\u0131\u015fma bilgi alan\u0131 ba\u015fl\u0131k','Fikirleri g\u00f6r\u00fcn\u00fcr k\u0131lan, sonu\u00e7lar\u0131 \u015feffafla\u015ft\u0131ran yar\u0131\u015fma alan\u0131.'],
  ['home.about.title','Kurumsal alan ba\u015fl\u0131k','Peyzaj\u0131n de\u011ferini g\u00f6r\u00fcn\u00fcr, mesle\u011fin sesini g\u00fc\u00e7l\u00fc k\u0131l\u0131yoruz.'],
  ['home.about.summary','Kurumsal alan metni','Peyzaj mimarlar\u0131 ile sekt\u00f6r profesyonelleri aras\u0131nda bilgi, deneyim ve i\u015f birli\u011fi k\u00f6pr\u00fcs\u00fc kuruyoruz.'],
  ['home.focus.title','\u00c7al\u0131\u015fmalar ba\u015fl\u0131k','Bilgiden sahaya, fikirden etkiye.'],
  ['home.directory.title','Firma rehberi ba\u015fl\u0131k','Projeniz i\u00e7in do\u011fru uzman\u0131 bulun.'],
  ['home.showcase.title','Sponsor / ilan alan\u0131 ba\u015fl\u0131k','Destek\u00e7iler, ilanlar ve profesyonel a\u011f'],
  ['home.membership.title','\u00dcyelik alan\u0131 ba\u015fl\u0131k','Mesle\u011fin gelece\u011fine katk\u0131 sunan toplulu\u011fa kat\u0131l\u0131n.']
];

function roleCanSee(view){return currentRole==='admin'||view==='siteMap'||(uiAccess[currentRole]&&uiAccess[currentRole].has(view))}
function buildNav(){
  let last='';
  const entries=Object.entries(modules).filter(([k])=>roleCanSee(k));
  $('#nav').innerHTML=entries.map(([k,[label,group,icon]],idx)=>{
    const open=['ANA','01 ANA SAYFA','02 G\u00dcNDEM'].includes(group);
    const h=group!==last?(last=group,`<details class="nav-group" ${open?'open':''}><summary><span>${group}</span><i>\u2304</i></summary><div class="nav-group-items">`):'';
    const next=entries[idx+1];
    const close=!next||next[1][1]!==group?'</div></details>':'';
    return`${h}<button type="button" class="${k==='dashboard'?'active':''}" data-view="${k}" title="${label}"><i>${icon}</i><span>${label}</span></button>${close}`;
  }).join('')
}

const siteFlowSections=[
  {no:'01',title:'\u00dcst men\u00fc ve kahraman alan\u0131',desc:'Logo, ana men\u00fc, \u00fcyelik giri\u015fi, ana g\u00f6rsel, slogan ve \u00e7a\u011fr\u0131 butonlar\u0131.',mods:['homeSettings','menus','settings']},
  {no:'02',title:'Peyzajder g\u00fcndemi',desc:'Kahraman alan\u0131n\u0131n alt\u0131ndaki b\u00fcy\u00fck g\u00fcndem slayt\u0131, haber, etkinlik ve duyuru ak\u0131\u015f\u0131.',mods:['sliders','news','events','notices']},
  {no:'03',title:'Sa\u011f a\u00e7\u0131l\u0131r yar\u0131\u015fma duyurusu',desc:'Turuncu yandan a\u00e7\u0131l\u0131r yar\u0131\u015fma panosu ve yeni yar\u0131\u015fma rozeti.',mods:['promoPanels']},
  {no:'04',title:'Kurumsal alan',desc:'Hakk\u0131m\u0131zda metinleri, y\u00f6netim kurulu, denetleme kurulu ve di\u011fer kurullar.',mods:['boards','content','menus']},
  {no:'05',title:'Firma rehberi ve g\u00f6r\u00fcn\u00fcrl\u00fck',desc:'\u00dcye firmalar, sponsor/reklam logo alanlar\u0131, sponsor kategorileri ve sekt\u00f6rel g\u00f6r\u00fcn\u00fcrl\u00fck.',mods:['firms','sponsors','sponsorCategories']},
  {no:'06',title:'\u00dcyelik ak\u0131\u015f\u0131',desc:'Site \u00fcyeli\u011fi, dernek ba\u015fvurusu, imzal\u0131 form ve \u00fcye gruplar\u0131.',mods:['members','memberGroups','applications']},
  {no:'07',title:'K\u00f6\u015fe yaz\u0131lar\u0131',desc:'Yazar panelinden gelen yaz\u0131lar, moderat\u00f6r/admin onay\u0131 ve yay\u0131n ak\u0131\u015f\u0131.',mods:['articles','authors']},
  {no:'08',title:'\u0130leti\u015fim ve mesajlar',desc:'\u0130leti\u015fim sayfas\u0131, mesaj paneli, e-posta/SMS/bildirim ara\u00e7lar\u0131.',mods:['contactMessages','subscribers','emailCampaigns','smsCampaigns','notifications']},
  {no:'09',title:'Mali y\u00f6netim',desc:'Sayman paneli, aidat, \u00f6deme, gelir-gider ve hesap numaralar\u0131.',mods:['dues','duePeriods','payments','businessLedger','bankAccounts']},
  {no:'10',title:'F\u0131rsatlar',desc:'\u0130\u015f ilanlar\u0131, staj duyurular\u0131 ve gerekti\u011finde sponsorlu f\u0131rsat i\u00e7erikleri.',mods:['jobPosts','sponsors']}
];

async function renderSiteMap(){
  const safe=async n=>{try{return await api(n)}catch{return[]}};
  const countEntries=await Promise.all([...new Set(siteFlowSections.flatMap(x=>x.mods))].map(async m=>{
    if(m==='homeSettings'){const all=await safe('settings');return [m,homeSettingDefs.filter(([key])=>all.some(x=>x.key===key&&x.value)).length]}
    if(contentViews[m]){const all=await safe('content');return [m,all.filter(x=>x.category===contentViews[m].category).length]}
    return [m,(await safe(m)).length]
  }));
  const counts=Object.fromEntries(countEntries);
  $('#workspace').innerHTML=`<section class="site-map-hero"><div><p class="eyebrow">S\u0130TE M\u0130MAR\u0130S\u0130</p><h2>Site ak\u0131\u015f\u0131 ile admin mod\u00fclleri birebir harita.</h2><p>Ana sayfada yukar\u0131dan a\u015fa\u011f\u0131ya g\u00f6rd\u00fc\u011f\u00fcn\u00fcz her alan\u0131n y\u00f6netim panelindeki kar\u015f\u0131l\u0131\u011f\u0131n\u0131 buradan takip edebilirsiniz.</p></div><a class="map-preview" href="index.html" target="_blank">Siteyi a\u00e7 \u2197</a></section><div class="site-map-grid">${siteFlowSections.map(sec=>`<article class="site-map-card"><b>${sec.no}</b><h3>${sec.title}</h3><p>${sec.desc}</p><div>${sec.mods.map(m=>modules[m]?`<button type="button" data-go="${m}">${modules[m][2]} ${modules[m][0]} <small>${counts[m]||0}</small></button>`:'').join('')}</div></article>`).join('')}</div>`;
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go));
}

const openViewBase=openView;
openView=async function(view){
  if(view==='siteMap'){
    state.view=view;$('#nav .active')&&$('#nav .active')?.classList.remove('active');const active=$(`#nav [data-view="${view}"]`);if(active)active.classList.add('active');$('#viewTitle').textContent=modules[view][0];$('#addButton').hidden=true;return renderSiteMap();
  }
  return openViewBase(view);
};

schemas.duePeriods=[
  F.title,
  ['group','\u00dcye kategorisi','text'],
  ['frequency','D\u00f6nem tipi','select','Ayl\u0131k,Y\u0131ll\u0131k'],
  ['year','Y\u0131l','number'],
  F.amount,
  ['dueDay','Son \u00f6deme g\u00fcn\u00fc','number'],
  ['startDate','Ba\u015flang\u0131\u00e7','date'],
  ['endDate','Biti\u015f','date'],
  F.status
];

const money=n=>(Number(n)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' \u20ba';
const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
const memberName=m=>m.name||m.email||m.phone||'\u0130simsiz \u00fcye';
const memberCategory=m=>m.group||m.memberGroup||m.membershipType||m.memberType||m.category||'Genel';
const isActiveMember=m=>!['pasif','reddedildi','silindi'].includes(norm(m.status));
const dueRemaining=d=>Math.max(0,(Number(d.amount)||0)-(Number(d.paid)||0));

function periodListForTariff(t){
  const year=Number(t.year)||new Date().getFullYear();
  if(norm(t.frequency).startsWith('y'))return[String(year)];
  const start=t.startDate?new Date(t.startDate):new Date(year,0,1);
  const end=t.endDate?new Date(t.endDate):new Date(year,11,1);
  const first=Math.max(0,start.getMonth()),last=Math.min(11,end.getMonth());
  return Array.from({length:last-first+1},(_,i)=>`${year}-${String(first+i+1).padStart(2,'0')}`);
}

async function renderDuesManager(){
  state.view='dues';
  $('#nav .active')?.classList.remove('active');
  $(`#nav [data-view="dues"]`)?.classList.add('active');
  $('#viewTitle').textContent='Aidat ve tahsilat yönetimi';
  $('#addButton').hidden=true;
  const safe=async n=>{try{return await api(n)}catch{return[]}};
  const [members,groups,tariffs,dues,payments,settings]=await Promise.all(['members','memberGroups','duePeriods','dues','payments','settings'].map(safe));
  const entryFeeSetting=(settings||[]).find(x=>['membershipentryfee','uyelikgirisbedeli','üyelik giriş bedeli'].includes(norm(x.key||x.title)));
  const entryFeeValue=entryFeeSetting.value||'';
  const membershipGroups=groups.length?groups:[{title:'Bireysel',entryFee:0,order:1,status:'Aktif'},{title:'Kurumsal',entryFee:0,order:2,status:'Aktif'},{title:'Öğrenci',entryFee:0,order:3,status:'Aktif'}];
  const activeMembers=members.filter(isActiveMember);
  const categories=[...new Set(['T\u00fcm \u00fcyeler',...membershipGroups.map(g=>g.title||g.name).filter(Boolean),...activeMembers.map(memberCategory).filter(Boolean)])];
  const totalDebt=dues.reduce((s,d)=>s+(Number(d.amount)||0),0);
  const totalPaid=dues.reduce((s,d)=>s+(Number(d.paid)||0),0);
  const unpaid=dues.filter(d=>dueRemaining(d)>0);
  const byCategory=categories.filter(c=>c!=='T\u00fcm \u00fcyeler').map(c=>({name:c,count:activeMembers.filter(m=>norm(memberCategory(m))===norm(c)).length}));
  $('#workspace').innerHTML=`<section class="dues-pro">
    <div class="dues-hero">
      <div><p class="eyebrow">SAYMAN PANEL\u0130</p><h2>Aidatlar kategoriye g\u00f6re otomatik bor\u00e7land\u0131r\u0131ls\u0131n.</h2><p>Tek tarife tan\u0131mlay\u0131n; sistem se\u00e7ilen \u00fcye grubunu ayl\u0131k veya y\u0131ll\u0131k d\u00f6nemlerde bor\u00e7land\u0131rs\u0131n. \u00d6deme i\u015flendi\u011finde bor\u00e7tan otomatik d\u00fc\u015fer.</p></div>
      <div class="dues-stats"><article><small>Toplam bor\u00e7</small><b>${money(totalDebt)}</b></article><article><small>Tahsil edilen</small><b>${money(totalPaid)}</b></article><article><small>Bekleyen</small><b>${money(totalDebt-totalPaid)}</b></article><article><small>\u00d6demeyen kay\u0131t</small><b>${unpaid.length}</b></article></div>
    </div>
    <div class="dues-grid">
      <form id="duesTariffForm" class="dues-card">
        <h3>Aidat tarifesi</h3>
        <div class="field-grid">
          <label>Tarife ad\u0131<input name="title" required value="${new Date().getFullYear()} Aidat Tarifesi"></label>
          <label>\u00dcye kategorisi<select name="group">${categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select></label>
          <label>D\u00f6nem tipi<select name="frequency"><option>Ayl\u0131k</option><option>Y\u0131ll\u0131k</option></select></label>
          <label>Y\u0131l<input name="year" type="number" value="${new Date().getFullYear()}"></label>
          <label>Tutar<input name="amount" type="number" min="0" step="0.01" required placeholder="0.00"></label>
          <label>Son \u00f6deme g\u00fcn\u00fc<input name="dueDay" type="number" min="1" max="28" value="15"></label>
        </div>
        <button class="primary" type="submit">Tarifeyi kaydet</button>
      </form>
      <section class="dues-card">
        <h3>Otomatik bor\u00e7land\u0131rma</h3>
        <p>Kay\u0131tl\u0131 tarifeyi se\u00e7in; sistem aktif \u00fcyeleri kategorilerine g\u00f6re bulur, d\u00f6nemleri olu\u015fturur ve ayn\u0131 borcu ikinci kez yazmaz.</p>
        <label>Tarife<select id="duesTariffSelect">${tariffs.map(t=>`<option value="${t.id}">${escapeHtml(t.title||'Tarife')} \u00b7 ${escapeHtml(t.group||'T\u00fcm \u00fcyeler')} \u00b7 ${money(t.amount)}</option>`).join('')}</select></label>
        <button id="generateDues" class="primary" type="button" ${tariffs.length?'':'disabled'}>Se\u00e7ili tarifeye g\u00f6re bor\u00e7land\u0131r</button>
        <div class="dues-category-list">${byCategory.map(c=>`<span>${escapeHtml(c.name)} <b>${c.count}</b></span>`).join('')}</div>
      </section>
      <form id="entryFeeForm" class="dues-card">
        <h3>Kategoriye göre üyelik giriş bedeli</h3>
        <p>Bireysel, Kurumsal, Öğrenci gibi üyelik türlerinin tek seferlik giriş bedelini buradan tanımlayın. Aidat tarifesi ayrı kalır; burada sadece ilk giriş bedeli yönetilir.</p>
        <div class="entry-fee-list">${membershipGroups.map((g,i)=>`<label>${escapeHtml(g.title||g.name||'Üye grubu')}<input name="fee_${escapeHtml(g.id||'new_'+i)}" data-group-id="${escapeHtml(g.id||'')}" data-group-title="${escapeHtml(g.title||g.name||'')}" type="number" min="0" step="0.01" value="${escapeHtml(g.entryFee||0)}" placeholder="0.00"></label>`).join('')}</div>
        <button class="primary" type="submit">Giriş bedellerini kaydet</button>
      </form>
    </div>
    <section class="dues-card">
      <div class="dues-toolbar"><h3>\u00dcye aidat durumu</h3><div><input id="duesSearch" placeholder="\u00dcye, kategori veya d\u00f6nem ara..."><select id="duesFilter"><option value="">T\u00fcm\u00fc</option><option value="unpaid">\u00d6demeyenler</option><option value="paid">\u00d6deyenler</option></select></div></div>
      <div class="dues-table-wrap"><table class="dues-table"><thead><tr><th>\u00dcye</th><th>Kategori</th><th>Y\u0131l</th><th>Y\u0131ll\u0131k bor\u00e7</th><th>\u00d6denen</th><th>Kalan</th><th>Y\u0131ll\u0131k durum</th><th>\u0130\u015flem</th></tr></thead><tbody id="duesRows"></tbody></table></div>
    </section>
  </section>`;

  const dueYear=d=>String(d.period||new Date().getFullYear()).slice(0,4);
  const dueMonthLabel=d=>{
    const p=String(d.period||'');
    if(!p.includes('-'))return p||'Y\u0131ll\u0131k';
    const [y,m]=p.split('-');
    const month=new Date(Number(y),Number(m)-1,1).toLocaleDateString('tr-TR',{month:'long'});
    return `${String(month).charAt(0).toLocaleUpperCase('tr-TR')}${String(month).slice(1)} ${y}`;
  };
  const annualGroups=()=>Object.values(dues.reduce((acc,d)=>{
    const key=`${d.memberId||d.member||d.memberEmail}-${dueYear(d)}`;
    if(!acc[key])acc[key]={key,member:d.member||'\u00dcye',email:d.memberEmail||'',category:d.category||'Genel',year:dueYear(d),items:[],amount:0,paid:0};
    acc[key].items.push(d);acc[key].amount+=Number(d.amount)||0;acc[key].paid+=Number(d.paid)||0;
    return acc;
  },{})).map(g=>({...g,remaining:Math.max(0,g.amount-g.paid),items:g.items.sort((a,b)=>String(a.period||'').localeCompare(String(b.period||''),'tr'))}));
  const draw=()=>{
    const q=norm($('#duesSearch').value),filter=$('#duesFilter').value||'';
    const rows=annualGroups().sort((a,b)=>String(a.category||'').localeCompare(String(b.category||''),'tr')||String(a.member||'').localeCompare(String(b.member||''),'tr')||String(a.year||'').localeCompare(String(b.year||''),'tr')).filter(g=>{
      const hay=norm(`${g.member} ${g.email} ${g.category} ${g.year} ${g.items.map(x=>x.period).join(' ')}`);
      return (!q||hay.includes(q))&&(!filter||(filter==='unpaid'?g.remaining>0:g.remaining<=0));
    });
    $('#duesRows').innerHTML=rows.length?rows.map(g=>`<tr class="dues-annual-row"><td><div class="dues-member-cell"><span><b>${escapeHtml(g.member)}</b><small>${escapeHtml(g.email)}</small></span><button data-detail="${escapeHtml(g.key)}">Detay</button></div></td><td>${escapeHtml(g.category)}</td><td><b>${escapeHtml(g.year)}</b><small>${g.items.length} dönem</small></td><td>${money(g.amount)}</td><td>${money(g.paid)}</td><td><b>${money(g.remaining)}</b></td><td><span class="dues-badge ${g.remaining>0?'wait':'paid'}">${g.remaining>0?'Yıllık borç var':'Yıllık ödendi'}</span></td><td><small>Yıllık özet</small></td></tr><tr class="dues-detail-row" data-detail-row="${escapeHtml(g.key)}" hidden><td colspan="8"><div class="dues-month-grid">${g.items.map(d=>`<article class="dues-month-card"><div><b>${escapeHtml(dueMonthLabel(d))}</b><small>${escapeHtml(d.dueDate?'Son ödeme: '+d.dueDate:'')}</small></div><p><span>Borç ${money(d.amount)}</span><span>Ödenen ${money(d.paid)}</span><strong>Kalan ${money(dueRemaining(d))}</strong></p><div><span class="dues-badge ${dueRemaining(d)>0?'wait':'paid'}">${dueRemaining(d)>0?escapeHtml(d.status||'Beklemede'):'Ödendi'}</span><button data-pay="${d.id}" ${dueRemaining(d)<=0?'disabled':''}>Aylık ödendi</button></div></article>`).join('')}</div></td></tr>`).join(''):`<tr><td colspan="8" class="empty">Hen\u00fcz aidat borcu yok. \u00d6nce tarife tan\u0131mlay\u0131p bor\u00e7land\u0131rma yap\u0131n.</td></tr>`;
    document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{const row=document.querySelector(`[data-detail-row="${CSS.escape(b.dataset.detail)}"]`);if(row){row.hidden=!row.hidden;b.textContent=row.hidden?'Detay':'Kapat'}});
    document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>markDuePaid(b.dataset.pay));
  };
  $('#duesSearch').oninput=draw;$('#duesFilter').onchange=draw;draw();

  $('#duesTariffForm').onsubmit=async e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target));
    data.amount=Number(data.amount)||0;data.year=Number(data.year)||new Date().getFullYear();data.dueDay=Number(data.dueDay)||15;data.status='Aktif';
    await api('duePeriods',{method:'POST',body:JSON.stringify(data)});
    toast('Aidat tarifesi kaydedildi');
    renderDuesManager();
  };
  $('#entryFeeForm').onsubmit=async e=>{
    e.preventDefault();
    for(const input of e.target.querySelectorAll('[data-group-title]')){
      const id=input.dataset.groupId,title=input.dataset.groupTitle,entryFee=Number(String(input.value||'0').replace(',','.'))||0;
      if(id){
        const current=membershipGroups.find(g=>String(g.id)===String(id))||{};
        await api(`memberGroups/${id}`,{method:'PUT',body:JSON.stringify({...current,title,entryFee,status:current.status||'Aktif'})});
      }else{
        await api('memberGroups',{method:'POST',body:JSON.stringify({title,entryFee,status:'Aktif'})});
      }
    }
    toast('Kategori bazlı giriş bedelleri kaydedildi');
    renderDuesManager();
  };
  $('#generateDues').onclick=async()=>{
    const tariff=tariffs.find(t=>t.id===$('#duesTariffSelect').value);
    if(!tariff)return toast('Bor\u00e7land\u0131rma i\u00e7in \u00f6nce tarife se\u00e7in');
    const target=activeMembers.filter(m=>tariff.group==='T\u00fcm \u00fcyeler'||!tariff.group||norm(memberCategory(m))===norm(tariff.group));
    const periods=periodListForTariff(tariff);
    let created=0,skipped=0;
    for(const m of target){
      for(const period of periods){
        const exists=dues.some(d=>String(d.memberId||'')===String(m.id)&&String(d.period||'')===period&&String(d.tariffId||'')===String(tariff.id));
        if(exists){skipped++;continue}
        const [y,mo]=period.split('-').map(Number),day=Math.min(Number(tariff.dueDay)||15,28);
        const dueDate=mo?new Date(y,mo-1,day).toISOString().slice(0,10):`${period}-12-31`;
        await api('dues',{method:'POST',body:JSON.stringify({memberId:m.id,member:memberName(m),memberEmail:m.email||'',category:memberCategory(m),period,tariffId:tariff.id,amount:Number(tariff.amount)||0,paid:0,dueDate,status:'Beklemede'})});
        created++;
      }
    }
    toast(`${created} aidat borcu olu\u015fturuldu${skipped?`, ${skipped} tekrar atland\u0131`:''}`);
    renderDuesManager();
  };
  async function markDuePaid(id){
    const due=dues.find(d=>d.id===id);if(!due)return;
    const remaining=dueRemaining(due);
    const val=prompt('\u00d6denen tutar',String(remaining));
    if(val===null)return;
    const amount=Number(String(val).replace(',','.'))||0;
    if(amount<=0)return toast('Ge\u00e7erli bir tutar girin');
    const paid=(Number(due.paid)||0)+amount,done=paid+0.001>=(Number(due.amount)||0);
    await api(`dues/${id}`,{method:'PUT',body:JSON.stringify({...due,paid,status:done?'\u00d6dendi':'K\u0131smi \u00f6dendi'})});
    await api('payments',{method:'POST',body:JSON.stringify({member:due.member,memberId:due.memberId,dueId:id,amount,date:new Date().toISOString().slice(0,10),method:'Nakit',status:'\u00d6dendi'})});
    try{await api('businessLedger',{method:'POST',body:JSON.stringify({title:`Aidat \u00f6demesi - ${due.member}`,date:new Date().toISOString().slice(0,10),type:'Gelir',amount,description:`${due.period} d\u00f6nemi aidat tahsilat\u0131`})})}catch{}
    toast('\u00d6deme i\u015flendi ve bor\u00e7tan d\u00fc\u015f\u00fcld\u00fc');
    renderDuesManager();
  }
}

async function renderAutoSliderManager(){
  state.view='sliders';
  $('#nav .active')?.classList.remove('active');
  $(`#nav [data-view="sliders"]`)?.classList.add('active');
  $('#viewTitle').textContent='Gösterilen slaytlar';
  $('#addButton').hidden=true;
  const safe=async n=>{try{return await api(n)}catch{return[]}};
  const [content,events,exclusions]=await Promise.all(['content','events','sliders'].map(safe));
  const visible=x=>!['pasif','taslak','arşiv','arsiv'].includes(norm(x.status||'Yayında'));
  const byDate=(a,b)=>new Date(b.date||b.updatedAt||b.createdAt||0)-new Date(a.date||a.updatedAt||a.createdAt||0);
  const excluded=new Set((exclusions||[]).filter(x=>String(x.status||'Pasif')!=='Aktif').map(x=>String(x.sourceId||x.contentId||x.eventId||x.id)));
  const candidates=[
    ...content.filter(x=>visible(x)&&x.category==='haberler').map(x=>({...x,type:'Haber',source:'content'})),
    ...events.filter(visible).map(x=>({...x,type:'Etkinlik',source:'events'})),
    ...content.filter(x=>visible(x)&&x.category==='etkinlikler').map(x=>({...x,type:'Etkinlik',source:'content'}))
  ].filter(x=>x.title).sort(byDate);
  const shown=candidates.filter(x=>!excluded.has(String(x.id))).slice(0,5);
  const hidden=(exclusions||[]).filter(x=>String(x.status||'Pasif')!=='Aktif');
  $('#workspace').innerHTML=`<section class="auto-slider-console">
    <div class="module-console-hero">
      <div><p class="eyebrow">OTOMATİK GÜNDEM SLAYTI</p><h2>Son haber ve etkinliklerden otomatik seçilir.</h2><p>Bu alan manuel slayt ekleme alanı değildir. Ana sayfadaki büyük gündem slaytı, haberler ve etkinlikler içinden en güncel 5 kaydı otomatik gösterir. Duyurular slayta dahil edilmez; kendi duyuru kutusunda ayrıca yönetilir.</p><div class="module-action-row"><a href="index.html#gundem" target="_blank">Ana sayfadaki karşılığını aç ↗</a></div></div>
      <div class="module-kpi-grid"><article><small>Slaytta görünen</small><b>${shown.length}</b></article><article><small>Haber + etkinlik havuzu</small><b>${candidates.length}</b></article><article><small>Slayttan çıkarılan</small><b>${hidden.length}</b></article><article><small>Duyuru mantığı</small><b>Ayrı</b></article></div>
    </div>
    <div class="auto-slider-grid">
      <section class="auto-slider-card"><div class="module-records-head"><div><h3>Şu an gösterilen son 5 slayt</h3><p>Haber ve etkinlik kayıtlarından otomatik sıralanır.</p></div></div><div class="auto-slider-list">${shown.length?shown.map((x,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><div><small>${escapeHtml(x.type)} · ${new Date(x.date||x.createdAt||Date.now()).toLocaleDateString('tr-TR')}</small><b>${escapeHtml(x.title)}</b><p>${escapeHtml(x.summary||x.description||'')}</p></div><button data-hide-slide="${x.id}" data-slide-title="${escapeHtml(x.title)}" data-slide-source="${x.source}" data-slide-type="${x.type}">Slayttan çıkar</button></article>`).join(''):'<p class="empty">Gösterilecek haber veya etkinlik bulunamadı.</p>'}</div></section>
      <section class="auto-slider-card"><div class="module-records-head"><div><h3>Slayttan çıkarılanlar</h3><p>İstemediğiniz içerikler burada tutulur; geri alabilirsiniz.</p></div></div><div class="auto-slider-list muted">${hidden.length?hidden.map(x=>`<article><span>–</span><div><small>${escapeHtml(x.sourceType||'Gizli')}</small><b>${escapeHtml(x.title||x.sourceId||'Gizlenen içerik')}</b><p>${escapeHtml(x.description||'Bu kayıt otomatik slayt havuzundan çıkarıldı.')}</p></div><button data-restore-slide="${x.id}">Geri al</button></article>`).join(''):'<p class="empty">Slayttan çıkarılan içerik yok.</p>'}</div></section>
    </div>
  </section>`;
  document.querySelectorAll('[data-hide-slide]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Bu içerik otomatik gündem slaytından çıkarılsın mı'))return;
    await api('sliders',{method:'POST',body:JSON.stringify({title:b.dataset.slideTitle,sourceId:b.dataset.hideSlide,sourceCollection:b.dataset.slideSource,sourceType:b.dataset.slideType,status:'Pasif',description:'Otomatik gündem slaytından çıkarıldı'})});
    toast('İçerik slayttan çıkarıldı');
    renderAutoSliderManager();
  });
  document.querySelectorAll('[data-restore-slide]').forEach(b=>b.onclick=async()=>{
    await api(`sliders/${b.dataset.restoreSlide}`,{method:'DELETE'});
    toast('İçerik yeniden otomatik slayt havuzuna alındı');
    renderAutoSliderManager();
  });
}

function contentViewConfig(view){return contentViews[view]||null}
function dateLabel(x){return new Date(x.updatedAt||x.createdAt||x.date||Date.now()).toLocaleDateString('tr-TR')}
function contentExcerpt(x){return x.seoDescription||x.summary||x.description||String(x.body||'').replace(/\s+/g,' ').slice(0,180)}
function isImageField(key,label){return ['image','cover','photo','logo'].includes(String(key||''))||/(görsel|foto|logo|kapak)/i.test(String(label||''))}
function genericFieldHtml(field,item){
  const [key,label,type,opt]=field,v=escapeHtml(item?.[key]||'');
  if(isImageField(key,label))return`<label class="full image-field">${label}<input class="auto-webp-file" data-target="${key}" type="file" accept="image/*"><input id="field-${key}" name="${key}" type="text" value="${v}" placeholder="Dosya seçildiğinde WebP olarak yüklenecek"><small>Site görselleri JPG/PNG yüklense bile WebP olarak sıkıştırılıp saklanır.</small>${v?`<img class="content-image-preview" src="${v}" alt="">`:''}</label>`;
  if(type==='textarea')return`<label class="full">${label}<textarea name="${key}">${v}</textarea></label>`;
  if(type==='select')return`<label>${label}<select name="${key}">${opt.split(',').map(o=>`<option ${o===(item?.[key]||'')?'selected':''}>${o}</option>`).join('')}</select></label>`;
  return`<label>${label}<input name="${key}" type="${type}" value="${v}"></label>`;
}
function bindAutoWebpUploads(root=document){
  root.querySelectorAll('.auto-webp-file').forEach(input=>{
    input.onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      const target=root.querySelector(`#field-${CSS.escape(input.dataset.target)}`);
      try{toast('Görsel WebP olarak hazırlanıyor...');const url=await compressAndUploadImage(file);if(target)target.value=url;input.closest('.image-field').querySelector('.content-image-preview').remove();target.insertAdjacentHTML('afterend',`<img class="content-image-preview" src="${escapeHtml(url)}" alt="">`);toast('Görsel WebP olarak yüklendi')}catch(err){toast(err.message||'Görsel yüklenemedi')}
    };
  });
}
async function renderHomeSettingsManager(){
  state.view='homeSettings';
  $('#nav .active')?.classList.remove('active');
  $(`#nav [data-view="homeSettings"]`)?.classList.add('active');
  $('#viewTitle').textContent='Ana sayfa metinleri';
  $('#addButton').hidden=true;
  const settings=await api('settings');
  const byKey=Object.fromEntries(settings.map(x=>[x.key,x]));
  state.items=homeSettingDefs.map(([key,label,placeholder])=>({key,label,placeholder,item:byKey[key],value:byKey[key].value||''}));
  const filled=state.items.filter(x=>x.value).length;
  $('#workspace').innerHTML=`<section class="module-console home-settings-console">
    <div class="module-console-hero">
      <div><p class="eyebrow">ANA SAYFA / METİN AKIŞI</p><h2>Ana sayfadaki sabit metinleri düzenleyin.</h2><p>Hero, gündem başlığı, kurumsal tanıtım, firma rehberi, sponsor/ilan ve üyelik alanındaki metinleri buradan yönetebilirsiniz. Boş bırakılan alanlarda tasarımdaki varsayılan metin kalır.</p><div class="module-action-row"><a href="index.html" target="_blank">Ana sayfayı aç ↗</a></div></div>
      <div class="module-kpi-grid"><article><small>Tanımlı alan</small><b>${state.items.length}</b></article><article><small>Doldurulan</small><b>${filled}</b></article><article><small>Boş / varsayılan</small><b>${state.items.length-filled}</b></article><article><small>Bağlantı</small><b>Canlı</b></article></div>
    </div>
    <section class="module-records"><div class="module-records-head"><div><h3>Ana sayfa metin alanları</h3><p>Teknik anahtarlar otomatik yönetilir; sadece metni düzenleyin.</p></div><div><input id="homeSettingSearch" placeholder="Metin alanlarında ara..."></div></div><div class="smart-table-wrap"><table class="smart-table"><thead><tr><th>Alan</th><th>Mevcut metin</th><th>Durum</th><th>İşlem</th></tr></thead><tbody id="homeSettingRows"></tbody></table></div></section>
  </section>`;
  $('#homeSettingSearch').oninput=drawHomeSettingRows;
  drawHomeSettingRows();
}
function drawHomeSettingRows(){
  const q=norm($('#homeSettingSearch').value);
  const rows=(state.items||[]).filter(x=>!q||norm(`${x.label} ${x.key} ${x.value}`).includes(q));
  $('#homeSettingRows').innerHTML=rows.map(x=>`<tr><td><b>${escapeHtml(x.label)}</b><small>${escapeHtml(x.key)}</small></td><td>${escapeHtml(x.value||x.placeholder||'—')}</td><td><span class="status">${x.value?'Tanımlı':'Varsayılan'}</span></td><td><div class="row-actions"><button data-edit-home-setting="${escapeHtml(x.key)}">Düzenle</button>${x.item?`<button data-clear-home-setting="${escapeHtml(x.item.id)}">Temizle</button>`:''}</div></td></tr>`).join('');
  $('#homeSettingRows').querySelectorAll('[data-edit-home-setting]').forEach(b=>b.onclick=()=>openHomeSettingEditor((state.items||[]).find(x=>x.key===b.dataset.editHomeSetting)));
  $('#homeSettingRows').querySelectorAll('[data-clear-home-setting]').forEach(b=>b.onclick=async()=>{if(!confirm('Bu metni temizleyip varsayılana dönmek istiyor musunuz'))return;await api(`settings/${b.dataset.clearHomeSetting}`,{method:'DELETE'});toast('Metin varsayılana döndü');renderHomeSettingsManager()});
}
function openHomeSettingEditor(row){
  state.edit=row.item||null;state.homeSettingKey=row.key;
  $('#formEyebrow').textContent='ANA SAYFA METNİ';
  $('#formTitle').textContent=row.label||'Metni düzenle';
  $('#formFields').innerHTML=`<div class="field-grid"><label class="full">Alan<input name="title" type="text" value="${escapeHtml(row.label||'')}" readonly></label><label class="full">Ayar anahtarı<input name="key" type="text" value="${escapeHtml(row.key||'')}" readonly></label><label class="full">Metin<textarea name="value" rows="6" placeholder="${escapeHtml(row.placeholder||'')}">${escapeHtml(row.value||'')}</textarea></label><input type="hidden" name="status" value="Yayında"></div>`;
  $('#editor').showModal();
}
async function compressAndUploadImage(file){
  if(!file)return '';
  if(!file.type.startsWith('image/'))throw new Error('Lütfen JPG, PNG veya WebP görsel seçin');
  const bitmap=await new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Görsel okunamadı'))};
    img.src=url;
  });
  const maxSide=1800,ratio=Math.min(1,maxSide/Math.max(bitmap.naturalWidth||bitmap.width,bitmap.naturalHeight||bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round((bitmap.naturalWidth||bitmap.width)*ratio));
  canvas.height=Math.max(1,Math.round((bitmap.naturalHeight||bitmap.height)*ratio));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(b=>resolve(b),'image/webp',0.82));
  if(!blob)throw new Error('Görsel dönüştürülemedi');
  const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)});
  const uploaded=await api('upload',{method:'POST',body:JSON.stringify({name:file.name.replace(/\.[^.]+$/,'.webp'),data})});
  return uploaded.url;
}

async function renderContentCategoryManager(view){
  const cfg=contentViewConfig(view);if(!cfg)return renderSmartModule(view);
  state.view=view;
  $('#nav .active')?.classList.remove('active');
  $(`#nav [data-view="${view}"]`)?.classList.add('active');
  $('#viewTitle').textContent=modules[view]?.[0]||cfg.singular;
  $('#addButton').hidden=false;
  $('#addButton').textContent=`+ Yeni ${cfg.singular}`;
  $('#addButton').onclick=()=>openContentCategoryEditor(null,view);
  const all=await api('content');
  state.items=all.filter(x=>x.category===cfg.category);
  const items=state.items;
  const published=items.filter(x=>['yayında','aktif'].includes(norm(x.status||'Yayında'))).length;
  const draft=items.filter(x=>['taslak','beklemede','pasif'].includes(norm(x.status||''))).length;
  $('#workspace').innerHTML=`<section class="module-console content-category-console">
    <div class="module-console-hero">
      <div><p class="eyebrow">${escapeHtml(cfg.area)}</p><h2>${escapeHtml(cfg.title)}</h2><p>${escapeHtml(cfg.desc)}</p><div class="module-action-row"><button type="button" class="primary" data-content-add>+ Yeni ${escapeHtml(cfg.singular)} ekle</button><a href="${escapeHtml(cfg.preview)}" target="_blank">Site karşılığını aç ↗</a></div></div>
      <div class="module-kpi-grid"><article><small>Toplam kayıt</small><b>${items.length}</b></article><article><small>Yayında</small><b>${published}</b></article><article><small>Taslak / pasif</small><b>${draft}</b></article><article><small>Görselli kayıt</small><b>${items.filter(x=>x.image).length}</b></article></div>
    </div>
    <div class="module-layout">
        <aside class="module-guide"><h3>Bu b?l?m neyi y?netir</h3><ol>${meta.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ol><h3>?li?kili ayarlar</h3><div>${(meta.related||[]).filter(k=>modules[k]||k==='siteMap').map(k=>`<button type="button" data-go="${k}">${escapeHtml(k==='siteMap'?'Site yerle?im haritas?':modules[k][0])}</button>`).join('')||'<p>?li?kili mod?l yok.</p>'}</div></aside>
      <section class="module-records"><div class="module-records-head"><div><h3>${escapeHtml(modules[view][0])}</h3><p>${items.length?`${items.length} kayıt listeleniyor`:'Henüz kayıt yok; ilk kaydı ekleyin.'}</p></div><div><input id="contentSearch" placeholder="${escapeHtml(cfg.singular)} içinde ara..."><select id="contentStatus"><option value="">Tüm durumlar</option><option>Yayında</option><option>Taslak</option><option>Beklemede</option><option>Pasif</option></select></div></div><div class="smart-table-wrap"><table class="smart-table"><thead><tr><th>Kayıt</th><th>SEO / özet</th><th>Durum</th><th>Güncelleme</th><th>İşlem</th></tr></thead><tbody id="contentRows"></tbody></table></div></section>
    </div>
  </section>`;
  document.querySelector('[data-content-add]').onclick=()=>openContentCategoryEditor(null,view);
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go));
  $('#contentSearch').oninput=drawContentCategoryRows;$('#contentStatus').onchange=drawContentCategoryRows;
  drawContentCategoryRows();
}

function drawContentCategoryRows(){
  const q=norm($('#contentSearch').value),status=$('#contentStatus').value||'',items=state.items||[];
  const rows=items.filter(x=>{
    const hay=norm(`${x.title||''} ${contentExcerpt(x)} ${x.body||''}`);
    return (!q||hay.includes(q))&&(!status||String(x.status||'Yayında')===status);
  });
  $('#contentRows').innerHTML=rows.length?rows.map(x=>`<tr><td><b>${escapeHtml(x.title||'Başlıksız')}</b><small>${x.image?'Görsel var':'Görsel yok'}</small></td><td>${escapeHtml(contentExcerpt(x)||'—')}</td><td><span class="status">${escapeHtml(x.status||'Yayında')}</span></td><td>${dateLabel(x)}</td><td><div class="row-actions"><button data-edit-content="${x.id}">Düzenle</button><button data-delete-content="${x.id}">Sil</button></div></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Bu bölümde henüz kayıt yok. Yeni kayıt ile başlayabilirsiniz.</td></tr>`;
  $('#contentRows').querySelectorAll('[data-edit-content]').forEach(b=>b.onclick=()=>openContentCategoryEditor(rows.find(x=>x.id===b.dataset.editContent),state.view));
  $('#contentRows').querySelectorAll('[data-delete-content]').forEach(b=>b.onclick=async()=>{if(!confirm('Bu kaydı silmek istediğinize emin misiniz'))return;await api(`content/${b.dataset.deleteContent}`,{method:'DELETE'});toast('Kayıt silindi');renderContentCategoryManager(state.view)});
}

function openContentCategoryEditor(item=null,view=state.view){
  const cfg=contentViewConfig(view);if(!cfg)return openEditor(item);
  state.edit=item;state.categoryEditor=view;
  $('#formEyebrow').textContent=item?'KAYDI DÜZENLE':`YENİ ${cfg.singular.toLocaleUpperCase('tr')}`;
  $('#formTitle').textContent=item?(item.title||`${cfg.singular} d?zenle`):`Yeni ${cfg.singular}`;
  $('#formFields').innerHTML=`<div class="field-grid content-editor-grid">
    <label class="full">Başlık<input name="title" type="text" value="${escapeHtml(item.title||'')}" required></label>
    <label class="full">SEO açıklama<textarea name="seoDescription" maxlength="180" placeholder="Google ve paylaşım özetinde görünecek 150-160 karakterlik açıklama">${escapeHtml(item.seoDescription||item.summary||'')}</textarea></label>
    <label class="full">Kısa özet<textarea name="summary" placeholder="Ana sayfa kartları ve slayt kısa metni">${escapeHtml(item.summary||'')}</textarea></label>
    <label class="full">İçerik<textarea name="body" rows="9" placeholder="${escapeHtml(cfg.singular)} detay metni">${escapeHtml(item.body||'')}</textarea></label>
    <label>Durum<select name="status">${['Yayında','Taslak','Beklemede','Pasif'].map(s=>`<option ${s===(item.status||'Yay?nda')?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>Tarih<input name="date" type="date" value="${escapeHtml(String(item.date||item.createdAt||'').slice(0,10))}"></label>
    <label class="full image-field">Görsel yükle<input id="contentImageFile" type="file" accept="image/*"><input id="contentImagePath" name="image" type="text" value="${escapeHtml(item.image||'')}" placeholder="Yüklendiğinde otomatik dolacak"><small>JPG/PNG/WebP yükleyebilirsiniz; sistem WebP olarak hafifletip kaydeder.</small>${item.image?`<img class="content-image-preview" src="${escapeHtml(item.image)}" alt="">`:''}</label>
  </div>`;
  $('#contentImageFile').onchange=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{toast('Görsel dönüştürülüp yükleniyor...');const url=await compressAndUploadImage(file);$('#contentImagePath').value=url;$('.content-image-preview').remove();$('#contentImagePath').insertAdjacentHTML('afterend',`<img class="content-image-preview" src="${escapeHtml(url)}" alt="">`);toast('Görsel WebP olarak yüklendi')}catch(err){toast(err.message||'Görsel yüklenemedi')}
  };
  $('#editor').showModal();
}

openEditor=function(item=null){
  state.edit=item;
  $('#formEyebrow').textContent=item?'KAYDI D?ZENLE':'YEN? KAYIT';
  $('#formTitle').textContent=item?(item.title||item.name||'Kayd? d?zenle'):`Yeni ${modules[state.view]?.[0]||'kayıt'} kaydı`;
  $('#formFields').innerHTML=`<div class="field-grid">${(schemas[state.view]||[F.title,F.description,F.status]).map(field=>genericFieldHtml(field,item)).join('')}</div>`;
  $('#editor').showModal();
  bindAutoWebpUploads($('#formFields'));
};

const moduleAdminMeta={
  sliders:{area:'ANA SAYFA / PEYZAJDER G\u00dcNDEM\u0130',title:'Gösterilen slaytları kontrol edin',desc:'Ana sayfadaki büyük gündem slaytı manuel değil otomatik çalışır; haberler ve etkinlikler içinden son 5 kayıt gösterilir. Bu ekran sadece görünenleri kontrol etmek ve istenmeyeni slayttan çıkarmak içindir.',steps:['Yeni slayt eklenmez; haber ve etkinlik kayıtları otomatik gelir','Duyurular slayta dahil edilmez, duyuru alanında ayrıca görünür','İstemediğiniz kaydı slayttan çıkarabilir, sonra geri alabilirsiniz'],related:['news','events','notices'],preview:'index.html#gundem'},
  news:{area:'ANA SAYFA / G\u00dcNDEM / HABERLER',title:'Haberleri yönetin',desc:'Ana sayfadaki Haberler kutusu, gündem slaytı ve haber arşivi sadece bu modülden beslenir. Haberler duyuru ve etkinlikle karışmaz.',steps:['Başlık ve SEO açıklamasını net girin','Görsel yükleyin; sistem WebP olarak küçültüp kaydeder','Yayında durumundaki haberler ana sayfada ve arşivde görünür'],related:['sliders','events','notices'],preview:'archive.html?cat=haberler'},
  notices:{area:'ANA SAYFA / G\u00dcNDEM / DUYURULAR',title:'Duyuruları yönetin',desc:'Ana sayfadaki Duyurular kutusu ve duyuru arşivi sadece bu modülden beslenir. Duyuru, gündem slaytına otomatik girmez.',steps:['Kısa, net duyuru başlığı kullanın','Detay metnini ve gerekirse görselini ekleyin','Süresi dolan duyuruları Pasif veya Arşiv yapın'],related:['news','events','sliders'],preview:'archive.html?cat=duyurular'},
  content:{area:'KURUMSAL / D\u0130\u011eER \u0130\u00c7ER\u0130KLER',title:'Kurumsal ve yardımcı içerikleri yönetin',desc:'Haber, etkinlik ve duyurular artık kendi Gündem alt menülerinden yönetilir. Bu alan; basında biz, kurumsal sayfalar, ilan/ihale veya yardımcı metinler içindir.',steps:['Haber için Haberler modülünü kullanın','Duyuru için Duyurular modülünü kullanın','Kurumsal ve arşivsel sayfaları burada tutun'],related:['news','notices','menus','settings'],preview:'archive.html'},
  events:{area:'ANA SAYFA / ETK\u0130NL\u0130KLER',title:'Etkinlik ak\u0131\u015f\u0131n\u0131 y\u00f6netin',desc:'Seminer, webinar, saha gezisi, toplant\u0131 ve dernek etkinlikleri bu alandan girilir; ana sayfa g\u00fcndem ak\u0131\u015f\u0131na ve etkinlik sayfalar\u0131na beslenir.',steps:['Tarih, konum ve a\u00e7\u0131klamay\u0131 net girin','Yakla\u015fan etkinlikleri Aktif/Yay\u0131nda yap\u0131n','Ge\u00e7mi\u015f etkinlikler ar\u015five ta\u015f\u0131nabilir'],related:['content','webinars','sliders'],preview:'archive.htmltype=events'},
  promoPanels:{area:'ANA SAYFA / SA\u011e YARI\u015eMA PANOSU',title:'Sa\u011fdan a\u00e7\u0131l\u0131r yar\u0131\u015fma ilan\u0131',desc:'Ana sayfan\u0131n sa\u011f\u0131ndaki turuncu, dikkat \u00e7eken yar\u0131\u015fma duyuru panosu buradan a\u00e7\u0131l\u0131p kapat\u0131l\u0131r. Ana sponsor logosu ve linki de bu kartta g\u00f6r\u00fcn\u00fcr.',steps:['Aktif yar\u0131\u015fman\u0131n ba\u015fl\u0131\u011f\u0131n\u0131 girin','Ana sponsor logosunu WebP olarak y\u00fckleyip web adresini ekleyin','Yar\u0131\u015fma bitince durumu Pasif yap\u0131n'],related:['sponsors','settings'],preview:'index.html'},
  members:{area:'\u00dcYEL\u0130K / \u00dcYE KAYITLARI',title:'\u00dcyeleri ve kategorilerini y\u00f6netin',desc:'Site \u00fcyeleri, dernek \u00fcyeli\u011fi durumu, \u00fcye grubu ve ileti\u015fim bilgileri bu ekranda takip edilir. Aidat sistemi bu kategorileri kullan\u0131r.',steps:['\u00dcye grubunu do\u011fru se\u00e7in; aidat bor\u00e7land\u0131rmas\u0131 buna g\u00f6re yap\u0131l\u0131r','Dernek ba\u015fvuru durumunu kay\u0131tta tutun','Pasif \u00fcyeler otomatik bor\u00e7land\u0131rma d\u0131\u015f\u0131nda kal\u0131r'],related:['memberGroups','applications','dues'],preview:'membership.html'},
  memberGroups:{area:'\u00dcYEL\u0130K / KATEGOR\u0130LER',title:'\u00dcye gruplar\u0131n\u0131 tan\u0131mlay\u0131n',desc:'Bireysel, kurumsal, \u00f6\u011frenci, onursal gibi gruplar\u0131n\u0131z\u0131 burada olu\u015fturun. Aidat tarifeleri ve \u00fcye listeleri bu gruplarla anlaml\u0131 hale gelir.',steps:['Aidat sistemiyle ayn\u0131 kategori adlar\u0131n\u0131 kullan\u0131n','Pasif gruplar yeni \u00fcye ak\u0131\u015f\u0131nda kullan\u0131lmamal\u0131','A\u00e7\u0131klama alan\u0131na grup kriterlerini yaz\u0131n'],related:['members','dues'],preview:'membership.html'},
  applications:{area:'\u00dcYEL\u0130K / BA\u015eVURULAR',title:'\u00dcyelik ba\u015fvurular\u0131n\u0131 inceleyin',desc:'Site \u00fcyesinin indirdi\u011fi ve y\u00fckledi\u011fi \u0131slak imzal\u0131 ba\u015fvuru formlar\u0131 burada takip edilir.',steps:['Yeni ba\u015fvurular\u0131 Beklemede tutun','Evrak kontrol\u00fcnden sonra Onayland\u0131 yap\u0131n','Onaylanan ki\u015fiyi \u00fcye listesine ba\u011flay\u0131n'],related:['members','memberGroups'],preview:'membership.html'},
  boards:{area:'KURUMSAL / KURULLAR',title:'Y\u00f6netim ve di\u011fer kurullar',desc:'Y\u00f6netim kurulu, denetleme kurulu ve ihtiya\u00e7 halinde eklenecek t\u00fcm kurullar burada tutulur. S\u0131ralama alan\u0131 sitedeki dizilimi belirler.',steps:['Kurul ad\u0131n\u0131 ayn\u0131 yaz\u0131mla girin','Ba\u015fkan, yard\u0131mc\u0131, sekreter, sayman s\u0131ralamas\u0131 i\u00e7in order kullan\u0131n','Foto\u011fraf yoksa sistem bo\u015f profil g\u00f6rseli kullan\u0131r'],related:['content','menus'],preview:'boards.html'},
  firms:{area:'F\u0130RMA REHBER\u0130',title:'\u00dcye firma rehberini y\u00f6netin',desc:'Derne\u011fe \u00fcye firmalar\u0131n g\u00f6r\u00fcn\u00fcrl\u00fc\u011f\u00fc ve firma bulucu mant\u0131\u011f\u0131 bu mod\u00fclden beslenir.',steps:['\u015eehir ve uzmanl\u0131k bilgilerini dolu tutun','Web sitesi varsa mutlaka ekleyin','Aktif firmalar rehberde g\u00f6r\u00fcn\u00fcr'],related:['members','sponsors'],preview:'firms.html'},
  sponsors:{area:'SPONSOR / REKLAM',title:'Sponsor logo ve reklam alanlar\u0131',desc:'Yar\u0131\u015fma sayfas\u0131ndaki Ana Sponsor, Platin, Alt\u0131n, G\u00fcm\u00fc\u015f gibi sponsor kategorileri ve genel reklam logolar\u0131 buradan y\u00f6netilir.',steps:['Yar\u0131\u015fma sayfas\u0131nda g\u00f6r\u00fcnmesi i\u00e7in Yerle\u015fim alan\u0131n\u0131 Yar\u0131\u015fma Sayfas\u0131 se\u00e7in','Sponsor kategorisini Ana Sponsor, Platin, Alt\u0131n, G\u00fcm\u00fc\u015f vb. belirleyin','Logo WebP olarak y\u00fcklenir; web adresi yeni sekmede a\u00e7\u0131l\u0131r'],related:['promoPanels','firms','settings'],preview:'competitions.html'},
  sponsorCategories:{area:'SPONSOR / KATEGOR\u0130LER',title:'Sponsor kategorilerini y\u00f6netin',desc:'Ana Sponsor, Platin Sponsor, Alt\u0131n Sponsor, G\u00fcm\u00fc\u015f Sponsor gibi ba\u015fl\u0131klar\u0131 buradan ekleyip s\u0131ralayabilirsiniz. Sponsor kayd\u0131ndaki kategori alan\u0131 bu ba\u015fl\u0131klarla ayn\u0131 yaz\u0131lmal\u0131d\u0131r.',steps:['Kategori ad\u0131n\u0131 net yaz\u0131n','S\u0131ra alan\u0131 sayfadaki g\u00f6r\u00fcn\u00fcm \u00f6nceli\u011fini belirler','Pasif kategoriler public sayfada ba\u015fl\u0131k olarak kullan\u0131lmaz'],related:['sponsors','promoPanels'],preview:'competitions.html'},
  jobPosts:{area:'FIRSATLAR / \u0130\u015e \u0130LANLARI',title:'Sekt\u00f6rel i\u015f ve staj ilanlar\u0131',desc:'Peyzaj mimarl\u0131\u011f\u0131 ve sekt\u00f6r profesyonellerine y\u00f6nelik f\u0131rsat ilanlar\u0131 bu alandan yay\u0131nlan\u0131r.',steps:['Son ba\u015fvuru tarihini girin','Ba\u015fvuru linkini kontrol edin','S\u00fcresi dolan ilanlar\u0131 ar\u015five al\u0131n'],related:['content','firms'],preview:'archive.htmltype=jobs'},
  articles:{area:'YAZARLAR / K\u00d6\u015eE YAZILARI',title:'K\u00f6\u015fe yaz\u0131lar\u0131n\u0131 onaylay\u0131n',desc:'Yazar panelinden gelen yaz\u0131lar burada d\u00fczenlenir, onaylan\u0131r ve yay\u0131na al\u0131n\u0131r.',steps:['Beklemede yaz\u0131lar\u0131 okuyup kontrol edin','Aktif yap\u0131lan yaz\u0131lar k\u00f6\u015fe yaz\u0131lar\u0131 sayfas\u0131nda g\u00f6r\u00fcn\u00fcr','Ana sayfa g\u00f6sterim biti\u015fi sadece \u00f6ne \u00e7\u0131karma i\u00e7indir'],related:['authors','users'],preview:'articles.html'},
  authors:{area:'YAZARLAR / YAZAR PROF\u0130LLER\u0130',title:'K\u00f6\u015fe yazar\u0131 profilleri',desc:'Yazarlar\u0131n ad, e-posta, foto\u011fraf ve durum bilgileri burada tutulur. Panel kullan\u0131c\u0131s\u0131yla e-posta \u00fczerinden e\u015fle\u015fir.',steps:['Yazar\u0131n e-postas\u0131 kullan\u0131c\u0131 hesab\u0131yla ayn\u0131 olmal\u0131','Pasif yazarlar yeni yaz\u0131 g\u00f6nderememeli','Foto\u011fraf eklenirse yaz\u0131 kartlar\u0131 g\u00fc\u00e7lenir'],related:['articles','users'],preview:'articles.html'},
  contactMessages:{area:'\u0130LET\u0130\u015e\u0130M / MESAJLAR',title:'Ziyaret\u00e7i mesajlar\u0131',desc:'\u0130leti\u015fim sayfas\u0131ndaki interaktif mesaj panelinden gelen talepler burada takip edilir.',steps:['Yeni mesajlar\u0131 Beklemede tutun','Cevaplananlar\u0131 Okundu veya Tamamland\u0131 yap\u0131n','\u00d6nemsel talepleri raporlay\u0131n'],related:['emailCampaigns','supportTickets'],preview:'contact.html'},
  menus:{area:'S\u0130TE AYARLARI / MEN\u00dc',title:'Site men\u00fcs\u00fcn\u00fc y\u00f6netin',desc:'\u00dcst men\u00fc, a\u00e7\u0131l\u0131r men\u00fc ve sayfa ba\u011flant\u0131lar\u0131 bu mod\u00fclden d\u00fczenlenir.',steps:['Parent alan\u0131 a\u00e7\u0131l\u0131r men\u00fc i\u00e7in kullan\u0131l\u0131r','S\u0131ra alan\u0131 men\u00fc dizilimini belirler','Bozuk linkleri yay\u0131na almadan kontrol edin'],related:['content','settings'],preview:'index.html'},
  settings:{area:'S\u0130TE AYARLARI / GENEL',title:'Genel site ayarlar\u0131',desc:'Site ad\u0131, ileti\u015fim bilgileri, ana sayfa metinleri ve sistemsel k\u00fc\u00e7\u00fck ayarlar burada tutulur.',steps:['Ayar anahtar\u0131n\u0131 de\u011fi\u015ftirmeden de\u011feri g\u00fcncelleyin','\u0130leti\u015fim bilgilerini burada tekille\u015ftirin','Canl\u0131ya almadan \u00f6nce kritik ayarlar\u0131 kontrol edin'],related:['menus','socialLinks','bankAccounts'],preview:'index.html'}
};

function smartMeta(view){return moduleAdminMeta[view]||{area:modules[view]?.[1]||'Y\u00d6NET\u0130M',title:`${modules[view]?.[0]||'Mod\u00fcl'} kay\u0131tlar\u0131`,desc:'Bu b\u00f6l\u00fcmde ilgili site ve y\u00f6netim kay\u0131tlar\u0131 listelenir, d\u00fczenlenir ve yay\u0131na haz\u0131rlan\u0131r.',steps:['Kay\u0131tlar\u0131 listeden kontrol edin','Yeni kay\u0131t ile ekleme yap\u0131n','Durum alan\u0131yla yay\u0131n/aktiflik kontrol\u00fc sa\u011flay\u0131n'],related:['siteMap'],preview:'index.html'}};
function statusText(x){return x.status||x.membershipStatus||'Kay\u0131tl\u0131'}
function smartTitle(x){return x.title||x.name||x.member||x.company||x.bank||x.email||x.subject||'Kay\u0131t'}
function smartDetail(view,x){
  if(view==='members')return `${x.email||''} ${x.phone?'\u00b7 '+x.phone:''}`;
  if(view==='users')return `${x.role||'Yönetim kullanıcısı'} ${x.initialPassword?'\u00b7 İlk şifre: '+x.initialPassword:''}`;
  if(view==='content')return `${x.category||'i\u00e7erik'} ${x.summary?'\u00b7 '+x.summary:''}`;
  if(view==='events')return `${x.date||'tarih yok'} ${x.location?'\u00b7 '+x.location:''}`;
  if(view==='boards')return `${x.title||'Kurul'} ${x.role?'\u00b7 '+x.role:''}`;
  if(view==='firms')return `${x.city||''} ${x.specialty?'\u00b7 '+x.specialty:''}`;
  if(view==='applications')return `${x.email||''} ${x.documentUrl?'\u00b7 imzal\u0131 form var':''}`;
  if(view==='menus')return `${x.parent?'Alt men\u00fc: '+x.parent:'Ana men\u00fc'} \u00b7 ${x.url||'ba\u011flant\u0131 yok'}`;
  return x.summary||x.description||x.email||x.date||x.period||x.key||x.type||'\u2014';
}
function smartCategory(view,x){
  if(view==='members')return memberCategory(x);
  if(view==='content')return x.category||'Genel';
  if(view==='boards')return x.title||'Kurul';
  if(view==='businessLedger')return x.type||'Kay\u0131t';
  if(view==='payments')return x.method||'\u00d6deme';
  return x.group||x.placement||x.category||x.status||'Genel';
}
function uniqueCount(items,fn){return new Set(items.map(fn).filter(Boolean)).size}

async function renderSmartModule(view){
  try{
    state.view=view;
    $('#nav .active')?.classList.remove('active');
    $(`#nav [data-view="${view}"]`)?.classList.add('active');
    const meta=smartMeta(view);
    $('#viewTitle').textContent=modules[view]?.[0]||meta.title;
    $('#addButton').hidden=false;
    $('#addButton').textContent='+ Yeni kayıt';
    $('#addButton').onclick=()=>openEditor();
    state.items=await api(view);
    const items=Array.isArray(state.items)?state.items:[];
    const activeCount=items.filter(x=>['aktif','yay\u0131nda','\u00f6dendi','tamamland\u0131','onayland\u0131'].includes(norm(statusText(x)))).length;
    const pendingCount=items.filter(x=>['beklemede','taslak','k\u0131smi \u00f6dendi'].includes(norm(statusText(x)))).length;
    const catCount=uniqueCount(items,x=>smartCategory(view,x));
    $('#workspace').innerHTML=`<section class="module-console">
      <div class="module-console-hero">
        <div><p class="eyebrow">${escapeHtml(meta.area)}</p><h2>${escapeHtml(meta.title)}</h2><p>${escapeHtml(meta.desc)}</p><div class="module-action-row"><button type="button" class="primary" data-smart-add>+ Yeni kayıt ekle</button>${meta.preview?`<a href="${escapeHtml(meta.preview)}" target="_blank">Site karşılığını aç ↗</a>`:''}</div></div>
        <div class="module-kpi-grid"><article><small>Toplam kayıt</small><b>${items.length}</b></article><article><small>Aktif / yayında</small><b>${activeCount}</b></article><article><small>Bekleyen / taslak</small><b>${pendingCount}</b></article><article><small>Kategori</small><b>${catCount||'-'}</b></article></div>
      </div>
      <div class="module-layout">
        <aside class="module-guide"><h3>Bu b?l?m neyi y?netir</h3><ol>${meta.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ol><h3>?li?kili ayarlar</h3><div>${(meta.related||[]).filter(k=>modules[k]||k==='siteMap').map(k=>`<button type="button" data-go="${k}">${escapeHtml(k==='siteMap'?'Site yerle?im haritas?':modules[k][0])}</button>`).join('')||'<p>?li?kili mod?l yok.</p>'}</div></aside>
        <section class="module-records"><div class="module-records-head"><div><h3>${escapeHtml(modules[view]?.[0]||'Kayıtlar')}</h3><p>${items.length?`${items.length} kayıt listeleniyor`:'Henüz kayıt yok; ilk kaydı ekleyin.'}</p></div><div><input id="smartSearch" placeholder="Bu bölümde ara..."><select id="smartStatus"><option value="">Tüm durumlar</option><option>Aktif</option><option>Yayında</option><option>Beklemede</option><option>Taslak</option><option>Pasif</option><option>Ödendi</option></select></div></div><div class="smart-table-wrap"><table class="smart-table"><thead><tr><th>Kayıt</th><th>Site / kategori</th><th>Durum</th><th>Güncelleme</th><th>İşlem</th></tr></thead><tbody id="smartRows"></tbody></table></div></section>
      </div>
    </section>`;
    document.querySelector('[data-smart-add]').onclick=()=>openEditor();
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go));
    $('#smartSearch').oninput=drawSmartRows;$('#smartStatus').onchange=drawSmartRows;
    drawSmartRows();
  }catch(err){
    $('#workspace').innerHTML=`<section class="module-console"><div class="module-error"><h2>Bu bölüm yüklenemedi</h2><p>${escapeHtml(err.message||'Bağlantı hatası')}</p><button type="button" onclick="location.reload()">Paneli yenile</button></div></section>`;
    toast(err.message||'Bölüm yüklenemedi');
  }
}

function drawSmartRows(){
  const q=norm($('#smartSearch').value),status=$('#smartStatus').value||'',view=state.view;
  const rows=(state.items||[]).filter(x=>{
    const hay=norm(`${smartTitle(x)} ${smartDetail(view,x)} ${smartCategory(view,x)} ${statusText(x)}`);
    return (!q||hay.includes(q))&&(!status||statusText(x)===status);
  });
  $('#smartRows').innerHTML=rows.length?rows.map(x=>`<tr><td><b>${escapeHtml(smartTitle(x))}</b><small>${escapeHtml(smartDetail(view,x))}</small></td><td><span>${escapeHtml(smartCategory(view,x))}</span></td><td><span class="status">${escapeHtml(statusText(x))}</span></td><td>${new Date(x.updatedAt||x.createdAt||Date.now()).toLocaleDateString('tr-TR')}</td><td><div class="row-actions"><button data-edit="${x.id}">Düzenle</button><button data-delete="${x.id}">Sil</button></div></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Bu bölümde henüz kayıt yok. Sağ üstten veya bölüm içindeki “Yeni kayıt ekle” butonundan başlayabilirsiniz.</td></tr>`;
  $('#smartRows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(state.items.find(x=>x.id===b.dataset.edit)));
  $('#smartRows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeSmartItem(b.dataset.delete));
}

async function removeSmartItem(id){
  if(!confirm('Bu kaydı silmek istediğinize emin misiniz'))return;
  await api(`${state.view}/${id}`,{method:'DELETE'});
  state.items=state.items.filter(x=>x.id!==id);
  drawSmartRows();
  toast('Kayıt silindi');
}

const editorSubmitBase=$('#editorForm').onsubmit;
$('#editorForm').onsubmit=async e=>{
  if(state.view==='homeSettings'){
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target));
    try{
      await api(state.edit?`settings/${state.edit.id}`:'settings',{method:state.edit?'PUT':'POST',body:JSON.stringify(data)});
      $('#editor').close();
      toast('Ana sayfa metni kaydedildi');
      renderHomeSettingsManager();
    }catch(x){toast(x.message)}
    return;
  }
  if(contentViewConfig(state.view)){
    e.preventDefault();
    const cfg=contentViewConfig(state.view),data=Object.fromEntries(new FormData(e.target));
    data.category=cfg.category;
    if(!data.summary&&data.seoDescription)data.summary=data.seoDescription;
    try{
      await api(state.edit?`content/${state.edit.id}`:'content',{method:state.edit?'PUT':'POST',body:JSON.stringify(data)});
      $('#editor').close();
      toast(`${cfg.singular} kaydedildi`);
      renderContentCategoryManager(state.view);
    }catch(x){toast(x.message)}
    return;
  }
  if(document.querySelector('#smartRows')&&state.view!=='dues'){
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target));
    try{
      await api(state.edit?`${state.view}/${state.edit.id}`:state.view,{method:state.edit?'PUT':'POST',body:JSON.stringify(data)});
      $('#editor').close();
      toast('Kayıt kaydedildi');
      renderSmartModule(state.view);
    }catch(x){toast(x.message)}
    return;
  }
  return editorSubmitBase.call($('#editorForm'),e);
};

const openViewWithConsole=openView;
openView=async function(view){
  if(view==='dues')return renderDuesManager();
  if(view==='homeSettings')return renderHomeSettingsManager();
  if(view==='sliders')return renderAutoSliderManager();
  if(contentViewConfig(view))return renderContentCategoryManager(view);
  if(view==='dashboard'||view==='siteMap')return openViewWithConsole(view);
  return renderSmartModule(view);
};

boot();

