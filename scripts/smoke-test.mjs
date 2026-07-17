import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const temp=await mkdtemp(join(tmpdir(),'peyzajder-smoke-'));
let port=43271,base=`http://127.0.0.1:${port}`;
let server;
function start(nextPort=port){port=nextPort;base=`http://127.0.0.1:${port}`;server=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),PEYZAJDER_HOST:'127.0.0.1',PEYZAJDER_DATA_DIR:temp,PEYZAJDER_UPLOAD_DIR:join(temp,'uploads'),PEYZAJDER_ADMIN_USER:'smoke-admin',PEYZAJDER_ADMIN_PASSWORD:'Smoke!2026'},stdio:['ignore','pipe','pipe']})}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(`${base}/api/public/home`)).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Sunucu başlamadı')}
async function request(path,{method='GET',body,cookie}={}){const response=await fetch(`${base}${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await response.text();let data;try{data=JSON.parse(text)}catch{throw new Error(`${path}: JSON yerine ${response.status} ${text.slice(0,100)}`)}if(!response.ok)throw new Error(`${path}: ${response.status} ${data.error||text}`);return{data,cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie,status:response.status}}
async function requestFailure(path,options={}){try{await request(path,options)}catch(error){return error}throw new Error(`${path}: işlemin başarısız olması bekleniyordu`)}
function stop(){return new Promise(resolve=>{if(!server||server.exitCode!==null)return resolve();server.once('exit',resolve);server.kill();setTimeout(resolve,1500).unref()})}

try{
  start();await ready();
  const health=await request('/api/health');if(!health.data.ok)throw new Error('Sağlık kontrolü başarısız');
  const home=await request('/api/public/home');if(!Array.isArray(home.data.haberler)||home.data.haberler.length<1)throw new Error('Başlangıç içerikleri yüklenmedi');
  const login=await request('/api/login',{method:'POST',body:{username:'smoke-admin',password:'Smoke!2026'}}),adminCookie=login.cookie;
  const migratedEvents=await request('/api/events',{cookie:adminCookie});
  if(!migratedEvents.data.length||!migratedEvents.data.every(x=>x.title&&(x.body||x.description)))throw new Error('Eski etkinlikler dolu etkinlik kayıtlarına taşınmadı');
  const grassSeminar=migratedEvents.data.find(x=>String(x.title||'').includes('Performans Odaklı Peyzajda Çim'));if(!grassSeminar||grassSeminar.date!=='2026-04-10T18:00'||grassSeminar.images?.length!==9||!grassSeminar.body.includes('Alpaslan Ünal'))throw new Error('Performans Odaklı Peyzajda Çim etkinliği metin ve galerisiyle aktarılmadı');
  const eventIds=home.data.etkinlikler.map(x=>x.id);if(new Set(eventIds).size!==eventIds.length)throw new Error('Ana sayfada mükerrer etkinlik kaydı var');
  const editableEvent=migratedEvents.data[0];
  await request(`/api/events/${editableEvent.id}`,{method:'PUT',cookie:adminCookie,body:{...editableEvent,summary:'Düzenleme bağlantısı testi',body:'<p>Etkinlik düzenleme metni</p>',description:'<p>Etkinlik düzenleme metni</p>',image:'uploads/event-cover.webp',images:['uploads/event-gallery.webp']}});
  const editedEvent=await request(`/api/events/${editableEvent.id}`,{cookie:adminCookie});if(editedEvent.data.body!=='<p>Etkinlik düzenleme metni</p>'||editedEvent.data.image!=='uploads/event-cover.webp'||editedEvent.data.images?.length!==1)throw new Error('Etkinlik düzenleme içeriği ve fotoğrafları korunmadı');
  const editedPublicEvent=await request(`/api/public/item?id=${encodeURIComponent(editableEvent.id)}`);if(editedPublicEvent.data.body!=='<p>Etkinlik düzenleme metni</p>'||editedPublicEvent.data.image!=='uploads/event-cover.webp'||editedPublicEvent.data.images?.length!==1)throw new Error('Düzenlenen etkinlik ana siteye bağlanmadı');
  await request('/api/memberGroups',{method:'POST',cookie:adminCookie,body:{title:'Köşe Yazarı',status:'Aktif'}});
  const publicMemberTypes=await request('/api/public/member-types');if(publicMemberTypes.data.some(x=>String(x.title).toLocaleLowerCase('tr-TR').includes('yazar')))throw new Error('Köşe yazarı ziyaretçi üyelik seçeneklerine sızdı');
  const forbiddenRegistration=await requestFailure('/api/register',{method:'POST',body:{name:'Deneme Yazar',email:`writer-${Date.now()}@example.test`,phone:'0532 555 44 33',password:'Deneme!2026',membershipType:'Köşe Yazarı'}});if(!String(forbiddenRegistration.message).includes('400'))throw forbiddenRegistration;
  for(const collection of ['content','events','boards','members','firms','applications','dues','articles','sponsors','users','invitations','memberMessages']){const result=await request(`/api/${collection}`,{cookie:adminCookie});if(!Array.isArray(result.data))throw new Error(`${collection} liste değil`)}
  const title='UTF-8 doğrulama: Çığ, ıhlamur, öğrenci ve şüphe';
  await request('/api/settings',{method:'POST',cookie:adminCookie,body:{key:'site.name',title:'Site kısa adı',value:'PEYZAJDER TEST',status:'Aktif'}});
  await request('/api/socialLinks',{method:'POST',cookie:adminCookie,body:{title:'Instagram',platform:'instagram',url:'https://instagram.com/peyzajder',status:'Aktif'}});
  await request('/api/modules',{method:'POST',cookie:adminCookie,body:{key:'showcase',title:'Sponsor ve ilanlar',status:'Pasif'}});
  const siteConfig=await request('/api/public/site-config');
  if(siteConfig.data.settings['site.name']!=='PEYZAJDER TEST'||siteConfig.data.socialLinks.length!==1||siteConfig.data.modules.find(x=>x.key==='showcase')?.status!=='Pasif')throw new Error('Site özelleştirme ayarları ziyaretçi API’sine yansımadı');
  await request('/api/settings',{method:'POST',cookie:adminCookie,body:{key:'email.webhookToken',title:'Gizli e-posta tokenı',value:'secret-smoke-token',status:'Aktif'}});
  const secretAudit=await request('/api/public/site-config');if(secretAudit.data.settings['email.webhookToken'])throw new Error('Gizli iletişim servis tokenı public API’ye sızdı');
  const newsletterEmail=`newsletter-${Date.now()}@example.test`;
  await request('/api/public/newsletter',{method:'POST',body:{name:'Bülten Deneme',email:newsletterEmail}});
  const subscribers=await request('/api/subscribers',{cookie:adminCookie});if(!subscribers.data.some(x=>x.email===newsletterEmail&&x.status==='Aktif'))throw new Error('E-bülten aboneliği yönetim listesine düşmedi');
  const survey=await request('/api/surveys',{method:'POST',cookie:adminCookie,body:{title:'Smoke anketi',question:'Peyzaj önemli mi?',options:['Evet','Kesinlikle'],status:'Aktif'}});
  const publicSurvey=await request('/api/public/survey');if(!publicSurvey.data.active||publicSurvey.data.id!==survey.data.id)throw new Error('Aktif anket ana sayfa API’sine yansımadı');
  await request('/api/public/survey/vote',{method:'POST',body:{surveyId:survey.data.id,option:'0'}});
  const surveys=await request('/api/surveys',{cookie:adminCookie});if(Number(surveys.data.find(x=>x.id===survey.data.id)?.votes?.[0])!==1)throw new Error('Anket oyu sonuçlara işlenmedi');
  const emailCampaign=await request('/api/emailCampaigns',{method:'POST',cookie:adminCookie,body:{title:'Gönderim ayarı testi',subject:'Test',audience:'E-bülten aboneleri',body:'Test',status:'Hazır'}});
  const unconfiguredSend=await requestFailure('/api/communications/email/send',{method:'POST',cookie:adminCookie,body:{campaignId:emailCampaign.data.id}});if(!String(unconfiguredSend.message).includes('409'))throw new Error('E-posta servisi ayarsızken gönderim engellenmedi');
  const legacyFixture=['https://www.','peyzajder.org/eski-haber'].join('');
  const galleryImages=['uploads/smoke-gallery-1.webp','uploads/smoke-gallery-2.webp'];
  const richImageBody='<p>İçerik metni</p><figure class="article-inline-image"><img src="uploads/smoke-gallery-1.webp" alt=""><figcaption>Deneme görseli</figcaption></figure>';
  const created=await request('/api/content',{method:'POST',cookie:adminCookie,body:{title,category:'haberler',summary:'Türkçe içerik',body:richImageBody,image:'uploads/smoke-cover.webp',images:galleryImages,sourceUrl:legacyFixture,status:'Yayında'}});
  const item=await request(`/api/content/${created.data.id}`,{cookie:adminCookie});if(item.data.title!==title)throw new Error('Türkçe içerik korunmadı');
  const publicItem=await request(`/api/public/item?id=${encodeURIComponent(created.data.id)}`);if(publicItem.data.sourceUrl)throw new Error('Eski peyzajder.org kaynak bağlantısı ziyaretçi API’sine sızdı');if(publicItem.data.image!=='uploads/smoke-cover.webp'||publicItem.data.images.length!==2)throw new Error('Kapak ve içerik galerisi ayrı korunmadı');if(!publicItem.data.body.includes('<img src="uploads/smoke-gallery-1.webp"'))throw new Error('Metin içi görsel güvenli içerikten silindi');
  const email=`smoke-${Date.now()}@example.test`;
  const registration=await request('/api/register',{method:'POST',body:{name:'Öykü Çağlar',email,phone:'0532 555 12 34',password:'Deneme!2026',membershipType:'Kurumsal'}}),memberCookie=registration.cookie;
  const pending=await request('/api/member/me',{cookie:memberCookie});if(pending.data.membershipApproved||pending.data.panelType!=='application')throw new Error('Onaysız üye yanlış panele yönlendirildi');if(pending.data.finance?.bankAccount)throw new Error('Banka hesabı onaysız üyeye gösterildi');
  await request('/api/member/application',{method:'POST',cookie:memberCookie,body:{membershipType:'Kurumsal',organization:'Çınar Peyzaj',name:'form.png',data:'data:image/png;base64,iVBORw0KGgo='}});
  const applications=await request('/api/applications',{cookie:adminCookie}),application=applications.data.find(x=>x.email===email);if(!application)throw new Error('Üyelik başvurusu admin paneline düşmedi');
  await request(`/api/applications/${application.id}`,{method:'PUT',cookie:adminCookie,body:{status:'Onaylandı'}});
  const approved=await request('/api/member/me',{cookie:memberCookie});if(!approved.data.membershipApproved||approved.data.panelType!=='corporate')throw new Error('Kurumsal onay panel yönlendirmesi hatalı');if(approved.data.finance?.bankAccount?.iban!=='TR740011100000000162599985')throw new Error('Onaylı üyeye dernek banka hesabı gösterilmedi');
  const notification=await request('/api/notifications',{method:'POST',cookie:adminCookie,body:{title:'Kurumsal üye bildirimi',audience:'Kurumsal',message:'Panel bildirimi denemesi',status:'Aktif'}});
  const notifiedMember=await request('/api/member/me',{cookie:memberCookie});if(!notifiedMember.data.notifications?.some(x=>x.id===notification.data.id))throw new Error('Hedefli bildirim üye paneline ulaşmadı');
  const notificationBadge=await request('/api/panel-notifications',{cookie:memberCookie});if(notificationBadge.data.unreadNotifications!==1||notificationBadge.data.total<1)throw new Error('Bildirim panel rozetine eklenmedi');
  await request('/api/panel-notifications',{method:'POST',cookie:memberCookie});
  const readNotificationBadge=await request('/api/panel-notifications',{cookie:memberCookie});if(readNotificationBadge.data.unreadNotifications!==0)throw new Error('Okunan bildirim rozetten düşmedi');
  await request('/api/member/support',{method:'POST',cookie:memberCookie,body:{title:'Panel deneme sorunu',category:'Teknik destek',priority:'Normal',message:'Destek akışı kontrolü'}});
  const supportTickets=await request('/api/supportTickets',{cookie:adminCookie});if(!supportTickets.data.some(x=>x.email===email&&x.title==='Panel deneme sorunu'))throw new Error('Üye destek talebi yönetime ulaşmadı');
  await request('/api/member/payment-notification',{method:'POST',cookie:memberCookie,body:{paymentType:'Üyelik giriş bedeli',amount:5000,paymentDate:'2026-07-16',name:'dekont.png',data:'data:image/png;base64,iVBORw0KGgo='}});
  const paymentNotices=await request('/api/payments',{cookie:adminCookie});if(!paymentNotices.data.some(x=>x.email===email&&x.status==='Onay bekliyor'&&x.receiptUrl))throw new Error('Üye ödeme bildirimi sayman kayıtlarına düşmedi');
  await request('/api/invitations',{method:'POST',cookie:adminCookie,body:{title:'Kurumsal Üye Buluşması',audience:'Kurumsal',message:'Davet metni',status:'Yayında',date:'2026-09-01'}});
  const invited=await request('/api/member/me',{cookie:memberCookie});if(!invited.data.invitations?.some(x=>x.title==='Kurumsal Üye Buluşması'))throw new Error('Kurumsal davetiye üyeye ulaşmadı');
  await request('/api/member/messages',{method:'POST',cookie:memberCookie,body:{message:'Yönetim için deneme mesajı'}});
  const memberMessages=await request('/api/memberMessages',{cookie:adminCookie});if(!memberMessages.data.some(x=>x.email===email&&x.message.includes('deneme mesajı')))throw new Error('Üye mesajı yönetime ulaşmadı');
  const individualEmail=`individual-${Date.now()}@example.test`;
  const individualRegistration=await request('/api/register',{method:'POST',body:{name:'İpek Öğrenci',email:individualEmail,phone:'0533 555 12 34',password:'Deneme!2026',membershipType:'Öğrenci'}}),individualCookie=individualRegistration.cookie;
  await request('/api/member/application',{method:'POST',cookie:individualCookie,body:{membershipType:'Öğrenci',name:'form.png',data:'data:image/png;base64,iVBORw0KGgo='}});
  const individualApplications=await request('/api/applications',{cookie:adminCookie}),individualApplication=individualApplications.data.find(x=>x.email===individualEmail);
  await request(`/api/applications/${individualApplication.id}`,{method:'PUT',cookie:adminCookie,body:{status:'Onaylandı'}});
  const individualApproved=await request('/api/member/me',{cookie:individualCookie});if(!individualApproved.data.membershipApproved||individualApproved.data.panelType!=='member'||individualApproved.data.isCorporate)throw new Error('Bireysel/öğrenci panel yönlendirmesi hatalı');
  await request('/api/members',{method:'POST',cookie:adminCookie,body:{name:'Sistem Yöneticisi',email:'admin-account@peyzajder.org',group:'Admin',membershipStatus:'Onaylandı',status:'Aktif Üye'}});
  const tariff=await request('/api/duePeriods',{method:'POST',cookie:adminCookie,body:{title:'Smoke yıllık aidat',group:'Tüm üyeler',frequency:'Yıllık',year:2026,amount:1200,dueDay:15,status:'Aktif'}});
  const firstGeneration=await request('/api/finance/dues/generate',{method:'POST',cookie:adminCookie,body:{tariffId:tariff.data.id}});if(firstGeneration.data.created!==2)throw new Error(`Aidat yalnız gerçek üyeler için üretilmedi: ${firstGeneration.data.created}`);
  const generatedDues=await request('/api/dues',{cookie:adminCookie}),sampleDue=generatedDues.data.find(x=>x.tariffId===tariff.data.id);await request('/api/dues',{method:'POST',cookie:adminCookie,body:{...sampleDue,id:undefined,batchId:'legacy-duplicate',paid:0}});
  const deduplicated=await request('/api/finance/dues/deduplicate',{method:'POST',cookie:adminCookie,body:{}});if(deduplicated.data.removed!==1)throw new Error('Mükerrer aidat temizleme işlemi başarısız');
  const secondGeneration=await request('/api/finance/dues/generate',{method:'POST',cookie:adminCookie,body:{tariffId:tariff.data.id}});if(secondGeneration.data.created!==0||secondGeneration.data.skipped!==2)throw new Error('Aidat yeniden hesaplamada mükerrer borç oluşturdu');
  const rollback=await request('/api/finance/dues/rollback',{method:'POST',cookie:adminCookie,body:{tariffId:tariff.data.id}});if(rollback.data.removed!==2)throw new Error('Aidat borçlandırması geri alınamadı');
  const remainingDues=await request('/api/dues',{cookie:adminCookie});if(remainingDues.data.some(x=>x.tariffId===tariff.data.id))throw new Error('Geri alınan aidat kayıtları silinmedi');
  await stop();start(port+1);await ready();
  const persisted=JSON.parse(await readFile(join(temp,'cms.json'),'utf8'));if(!persisted.content.some(x=>x.title===title))throw new Error('Sunucu yeniden başlayınca veri kayboldu');if(persisted.content.some(x=>/^https?:\/\/(?:www\.)?peyzajder\.org/i.test(String(x.sourceUrl||''))))throw new Error('Eski kaynak bağlantısı kalıcı veriden temizlenmedi');
  console.log('API, etkinlik düzenleme ve fotoğraf bağlantısı, site özelleştirme, üyelik onayı, yazar kategori koruması, aidat mükerrer/geri alma kontrolü, davetiye, mesajlaşma, Türkçe veri ve yeniden başlatma testi başarılı.');
}finally{await stop();await rm(temp,{recursive:true,force:true})}
