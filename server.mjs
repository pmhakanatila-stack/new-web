import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat,copyFile,rename} from 'node:fs/promises';
import {extname,join,normalize,resolve} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';

const root=process.cwd(), dataDir=resolve(process.env.PEYZAJDER_DATA_DIR||join(root,'data')), uploadDir=resolve(process.env.PEYZAJDER_UPLOAD_DIR||join(root,'uploads')), dbFile=join(dataDir,'cms.json'), dbBackupFile=join(dataDir,'cms.backup.json');
const normalizedBase=String(process.env.PEYZAJDER_BASE_PATH||'').trim().replace(/^\/(.+)\/$/,'/$1');
const BASE_PATH=normalizedBase==='/'?'':normalizedBase;
const COOKIE_PATH=BASE_PATH||'/';
const PORT=Number(process.env.PORT||4173), HOST=process.env.PEYZAJDER_HOST||'0.0.0.0', USER=process.env.PEYZAJDER_ADMIN_USER||'admin', PASSWORD=process.env.PEYZAJDER_ADMIN_PASSWORD||'Peyzajder!2026';
if((process.env.NODE_ENV||'')==='production'&&(!process.env.PEYZAJDER_ADMIN_USER||!process.env.PEYZAJDER_ADMIN_PASSWORD)){
  console.error('HATA: NODE_ENV=production iken PEYZAJDER_ADMIN_USER ve PEYZAJDER_ADMIN_PASSWORD ortam degiskenleri tanimlanmadan sunucu baslatilamaz (varsayilan admin/Peyzajder!2026 herkesce tahmin edilebilir). Hosting panelinden bu degiskenleri ayarlayip tekrar baslatin.');
  process.exit(1);
}
const sessions=new Map(),resetTokens=new Map();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const collections=['content','events','boards','members','firms','accounts','memberGroups','applications','dues','duePeriods','payments','businessLedger','decisions','subscribers','emailCampaigns','smsCampaigns','notifications','invitations','memberMessages','notificationReads','surveys','galleries','videos','articles','authors','publications','webinars','menus','sliders','promoPanels','socialLinks','sponsors','sponsorCategories','jobPosts','bankAccounts','contactMessages','supportTickets','settings','users','modules'];
await mkdir(dataDir,{recursive:true});await mkdir(uploadDir,{recursive:true});

const isLegacyPeyzajderSource=value=>/^https?:\/\/(?:www\.)?peyzajder\.org(?:[/?#]|$)/i.test(String(value||'').trim());
function removeLegacyContentSources(value){
  let changed=0;
  for(const collection of ['content','events','articles','publications','webinars','galleries','videos']){
    for(const item of value?.[collection]||[]){
      if(isLegacyPeyzajderSource(item?.sourceUrl)){delete item.sourceUrl;changed++}
    }
  }
  return changed;
}

function normalizeDb(value={}){
  const result=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  for(const collection of collections)if(!Array.isArray(result[collection]))result[collection]=[];
  if(!Array.isArray(result.activity))result.activity=[];
  return result;
}
function canonicalizeEvents(value){
  const legacy=(value.content||[]).filter(item=>item.category==='etkinlikler');
  if(!legacy.length)return 0;
  const byId=new Map((value.events||[]).map(item=>[String(item.id||''),item]));
  const byTitle=new Map((value.events||[]).map(item=>[String(item.title||'').trim().toLocaleLowerCase('tr-TR'),item]));
  let changed=0;
  for(const source of legacy){
    const expectedId=String(source.id||'').startsWith('event-')?String(source.id):`event-${source.id}`;
    let target=byId.get(expectedId)||byTitle.get(String(source.title||'').trim().toLocaleLowerCase('tr-TR'));
    if(!target){
      target={...source,id:expectedId,category:'etkinlikler'};
      value.events.push(target);byId.set(expectedId,target);changed++;
      continue;
    }
    for(const key of ['title','summary','seoDescription','body','description','image','date','location','status','sourceUrl','createdAt']){
      if((target[key]===undefined||target[key]===null||target[key]==='')&&source[key]){target[key]=source[key];changed++}
    }
    if((!Array.isArray(target.images)||!target.images.length)&&Array.isArray(source.images)&&source.images.length){target.images=[...source.images];changed++}
    target.category='etkinlikler';
  }
  value.content=value.content.filter(item=>item.category!=='etkinlikler');
  return changed+legacy.length;
}
function enrichGrassSeminarEvent(value){
  const matches=item=>String(item?.title||'').toLocaleLowerCase('tr-TR').includes('performans odaklı peyzajda çim');
  const article=(value.content||[]).filter(matches).sort((a,b)=>(b.images?.length||0)-(a.images?.length||0))[0];
  const candidates=(value.events||[]).filter(matches);
  const target=candidates.find(item=>item.id==='event-content-53')||candidates[0];
  if(!target&&!article)return 0;
  if(target?.migrationVersion==='grass-seminar-v1'&&!article&&candidates.length===1)return 0;
  const event=target||{id:'event-content-53',category:'etkinlikler',createdAt:new Date().toISOString()};
  if(!target)value.events.unshift(event);
  const image=article?.image||'assets/migrated/news/sektorel-seminerler-performans-odakli-peyzajda-cim/01.webp';
  const images=Array.isArray(article?.images)&&article.images.length?[...article.images]:Array.from({length:9},(_,index)=>`assets/migrated/news/sektorel-seminerler-performans-odakli-peyzajda-cim/${String(index+1).padStart(2,'0')}.webp`);
  Object.assign(event,{
    title:'Sektörel Seminerler: Performans Odaklı Peyzajda Çim',
    category:'etkinlikler',
    status:'Yayında',
    summary:'PEYZAJDER Sektörel Seminerler Serisi’nin ilk buluşmasında çim türleri, doğru tür seçimi, tesis ve bakım uygulamaları ele alındı.',
    seoDescription:'PEYZAJDER’in Performans Odaklı Peyzajda Çim seminerinde serin ve sıcak iklim çimleri, tesis, bakım ve sürdürülebilir uygulamalar değerlendirildi.',
    body:[
      '10 Nisan 2026 tarihinde gerçekleştirdiğimiz Sektörel Seminerler Serisi’nin ilk buluşmasını başarıyla tamamladık.',
      '“Performans Odaklı Peyzajda Çim” başlığı altında; serin iklim ve sıcak iklim çim türleri, çim tesisi sürecinde dikkat edilmesi gereken teknik ayrıntılar ve doğru tür seçiminin önemi üzerine kapsamlı bir değerlendirme yaptık.',
      'Aynı alan içerisinde dahi bakı, toprak yapısı, su varlığı ve bakım kriterlerinin nasıl farklı sonuçlar doğurabileceğini birlikte ele alarak uygulamaya dönük önemli çıkarımlar elde ettik.',
      'Sektör profesyonelleri ve öğrenci topluluklarının katılımıyla gerçekleşen bu buluşma, bilgi paylaşımının ve ortak aklın ne kadar kıymetli olduğunu bir kez daha ortaya koydu. Katılımcılarımızla birlikte yalnızca teorik bilgileri değil, sahada karşılığı olan pratik yaklaşımları da tartışma fırsatı bulduk.',
      'Dernek yönetimi olarak temel hedefimiz; doğru bilgiyi yaygınlaştırmak, mesleki standartları güçlendirmek ve peyzaj uygulamalarında sürdürülebilir, verimli ve bilinçli yaklaşımların benimsenmesine katkı sağlamaktır. Bu doğrultuda düzenli seminer ve etkinliklerle sektöre değer katmaya devam edeceğiz.',
      'Değerli katkıları için konuşmacımız Sayın Alpaslan Ünal’a; tohum ve rulo çim üreticisi olmasının yanı sıra sahada aktif uygulayıcı kimliğiyle paylaştığı bilgi ve deneyimler için teşekkür ederiz. Kendisinin derneğimizin kurumsal üyesi olması bizler için ayrıca değer taşımaktadır.',
      'Katılım sağlayan, katkı sunan ve bu sürecin parçası olan tüm meslektaşlarımıza ve öğrenci arkadaşlarımıza teşekkür ederiz. Birlikte öğrenmeye, üretmeye ve geliştirmeye devam edeceğiz.'
    ].map(paragraph=>`<p>${paragraph}</p>`).join(''),
    date:'2026-04-10T18:00',
    location:'',
    image,
    images,
    migrationVersion:'grass-seminar-v1',
    updatedAt:new Date().toISOString()
  });
  value.events=value.events.filter(item=>item===event||!matches(item));
  value.content=value.content.filter(item=>!matches(item)||item.category==='duyurular');
  return 1;
}
function enrichYapiderPresentationEvent(value){
  const matches=item=>{
    const title=String(item?.title||'').toLocaleLowerCase('tr-TR');
    return title.includes('yatırım profesyonelleri ve iş birliği derneği')&&title.includes('kapsamlı bir sunum');
  };
  const candidates=(value.events||[]).filter(matches);
  const target=candidates.find(item=>item.id==='event-content-51')||candidates[0];
  const legacy=(value.content||[]).find(matches);
  if(!target&&!legacy)return 0;
  if(target?.migrationVersion==='yapider-presentation-v1'&&!legacy&&candidates.length===1)return 0;
  const event=target||{id:'event-content-51',category:'etkinlikler',createdAt:new Date().toISOString()};
  if(!target)value.events.unshift(event);
  Object.assign(event,{
    title:'YAPİDER Buluşması: Peyzajın Satış ve Mülk Değerine Etkisi',
    category:'etkinlikler',
    status:'Yayında',
    summary:'YAPİDER ve PEYZAJDER üyelerinin katıldığı buluşmada nitelikli peyzaj uygulamalarının satış ve mülk değerine etkisi ele alındı.',
    seoDescription:'YAPİDER ve PEYZAJDER buluşmasında peyzajın gayrimenkul değerine etkisi, kurakçıl peyzaj, performans standartları ve uygulama çözümleri konuşuldu.',
    body:[
      '<p>Yatırım Profesyonelleri ve İş Birliği Derneği (YAPİDER) ile Peyzaj Mimarları ve Sektör Profesyonelleri Derneği (PEYZAJDER) üyelerinin yoğun katılımıyla, gayrimenkul sektörüne yön veren kapsamlı bir sunum gerçekleştirdik.</p>',
      '<p>PEYZAJDER Yönetim Kurulu Başkanı Fulya Akfidan Sevim tarafından yapılan “Peyzaj Uygulamalarının Satış ve Mülk Değerine Etkisi” başlıklı sunum, sektör temsilcilerinden büyük ilgi gördü.</p>',
      '<p>Etkinlik boyunca şu başlıklar somut örneklerle ele alındı:</p>',
      '<ul><li>Nitelikli peyzajın gayrimenkul değerine etkisi</li><li>Doğru bitkilendirme ve kurakçıl peyzaj yaklaşımı</li><li>Performans bazlı peyzaj standartları</li><li>Sektörde sık yapılan hatalar ve çözüm önerileri</li></ul>',
      '<p>Etkinlik sonunda YAPİDER tarafından sunumumuza verilen plaket, iş birliğimizin güçlenerek devam edeceğinin değerli bir göstergesi oldu. Nazik davetleri ve bu anlamlı takdimleri için kendilerine teşekkür ediyoruz.</p>',
      '<p>PEYZAJDER olarak; gayrimenkul geliştirme, müteahhitlik sektörü, organize sanayi bölgeleri, belediyeler ve kamu kurumları başta olmak üzere peyzaj tabanlı sürdürülebilirlik, yeşil dönüşüm, karbon yönetimi ve performans bazlı peyzaj projeleri alanlarında bilgi paylaşmaya, eğitim ve sunumlar gerçekleştirmeye hazırız.</p>',
      '<p>Şehirler için daha yaşanabilir, daha dirençli ve daha değerli bir gelecek birlikte mümkün. PEYZAJDER olarak katkı vermekten gurur duyuyoruz.</p>'
    ].join(''),
    date:'2025-11-30T17:00',
    location:'YAPİDER',
    image:'assets/migrated/events/yapider-gayrimenkul-sunumu/01.webp',
    images:['assets/migrated/events/yapider-gayrimenkul-sunumu/01.webp'],
    migrationVersion:'yapider-presentation-v1',
    updatedAt:new Date().toISOString()
  });
  value.events=value.events.filter(item=>item===event||!matches(item));
  value.content=value.content.filter(item=>!matches(item)||item.category==='duyurular');
  return 1;
}
async function readJson(path){return JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''))}
async function initialDb(){
  try{return normalizeDb(await readJson(dbFile))}catch{}
  try{return normalizeDb(await readJson(dbBackupFile))}catch{}
  try{const seeded=normalizeDb(await readJson(join(root,'seed-cms.json')));await save(seeded);return seeded}catch{}
  let migrated=[];try{const source=await readJson(join(root,'content-data.json'));migrated=source.pages.filter(x=>x.title&&!x.error).map((x,i)=>({id:`content-${i+1}`,title:x.title,category:x.category,status:'Yayında',summary:x.paragraphs?.[0]||'',body:(x.paragraphs||[]).join('\n\n'),image:x.images?.[0]?.src||'',createdAt:new Date().toISOString()}))}catch{}
  const fresh=normalizeDb({content:migrated,events:migrated.filter(x=>x.category==='etkinlikler').map(x=>({...x,id:`event-${x.id}`})),boards:[{id:'board-1',title:'Yönetim Kurulu',name:'Fulya AKFİDAN SEVİM',role:'Başkan',status:'Aktif',createdAt:new Date().toISOString()}],activity:[]});await save(fresh);return fresh;
}
let saveChain=Promise.resolve();
async function save(value){
  const payload=JSON.stringify(normalizeDb(value),null,2);
  saveChain=saveChain.then(async()=>{
    const temporary=`${dbFile}.tmp`;
    try{await copyFile(dbFile,dbBackupFile)}catch{}
    await writeFile(temporary,payload,'utf8');
    await rename(temporary,dbFile);
  });
  return saveChain;
}
let db=await initialDb();
const removedLegacySources=removeLegacyContentSources(db);
if(removedLegacySources){await save(db);try{await copyFile(dbFile,dbBackupFile)}catch{}}
const defaultMemberTypes=[['Bireysel',1],['Kurumsal',2],['Öğrenci',3]];
const earlyNorm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
let memberTypesChanged=false;
for(const [title,order] of defaultMemberTypes){
  if(!db.memberGroups.some(g=>earlyNorm(g.title||g.name)===earlyNorm(title))){
    db.memberGroups.push({id:`memberGroups-${earlyNorm(title).replace(/[^a-z0-9]+/gi,'-')}`,title,entryFee:0,status:'Aktif',order,createdAt:new Date().toISOString()});
    memberTypesChanged=true;
  }
}
if(memberTypesChanged){
  await save(db);
}
const defaultBankSeedKey='finance.defaultBankSeeded.v1';
if(!(db.settings||[]).some(x=>x.key===defaultBankSeedKey)){
  const iban='TR740011100000000162599985';
  if(!(db.bankAccounts||[]).some(x=>String(x.iban||'').replace(/\s+/g,'').toUpperCase()===iban)){
    db.bankAccounts.unshift({id:`bankAccounts-${Date.now()}-${randomBytes(3).toString('hex')}`,bank:'Dernek banka hesabı',accountName:'PEYZAJ MİMARLARI VE SEKTÖR PROFESYONELLERİ DERNEĞİ',iban,currency:'TRY',status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  }
  db.settings.push({id:`settings-${Date.now()}-${randomBytes(3).toString('hex')}`,key:defaultBankSeedKey,title:'Varsayılan dernek banka hesabı aktarımı',value:'Tamamlandı',status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  await save(db);
}
if(!db.content.length){try{const source=JSON.parse((await readFile(join(root,'content-data.json'),'utf8')).replace(/^\uFEFF/,''));db.content=source.pages.filter(x=>x.title&&!x.error).map((x,i)=>({id:`content-${i+1}`,title:x.title,category:x.category,status:'Yayında',summary:x.paragraphs?.[0]||'',body:(x.paragraphs||[]).join('\n\n'),image:x.images?.[0]?.src||'',createdAt:new Date().toISOString()}));db.events=db.content.filter(x=>x.category==='etkinlikler').map(x=>({...x,id:`event-${x.id}`}));await save(db)}catch{}}
const canonicalizedEventCount=canonicalizeEvents(db);
if(canonicalizedEventCount)await save(db);
const enrichedGrassSeminarCount=enrichGrassSeminarEvent(db);
if(enrichedGrassSeminarCount)await save(db);
const enrichedYapiderPresentationCount=enrichYapiderPresentationEvent(db);
if(enrichedYapiderPresentationCount)await save(db);
const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(data))};
const withBase=p=>`${BASE_PATH}${p.startsWith('/')?p:`/${p}`}`;
const body=async req=>{const parts=[];for await(const c of req)parts.push(c);if(!parts.length)return{};const data=JSON.parse(Buffer.concat(parts).toString('utf8')),pathname=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname,collection=pathname.startsWith('/api/author/articles')?'articles':pathname.split('/').filter(Boolean)[1]||'';return sanitizeRichRecord(collection,data)};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const session=req=>sessions.get(cookies(req).peyzajder_session);
const adminSession=req=>sessions.get(cookies(req).peyzajder_admin_session)||((sessions.get(cookies(req).peyzajder_session)?.type==='admin')?sessions.get(cookies(req).peyzajder_session):null);
const memberSession=req=>sessions.get(cookies(req).peyzajder_member_session)||((sessions.get(cookies(req).peyzajder_session)?.type==='member')?sessions.get(cookies(req).peyzajder_session):null);
const secureEqual=(a,b)=>{const ah=scryptSync(a,'peyzajder-local',32),bh=scryptSync(b,'peyzajder-local',32);return timingSafeEqual(ah,bh)};
let auditUser=USER;
const audit=(action,collection,item,user=auditUser)=>db.activity.unshift({id:randomBytes(6).toString('hex'),action,collection,item:item?.title||item?.name||item?.email||'',at:new Date().toISOString(),user});
const roleAccess={admin:new Set(collections),sayman:new Set(['dues','duePeriods','payments','businessLedger','bankAccounts','members','memberGroups','settings']),moderator:new Set(['content','events','publications','webinars','galleries','videos','articles','authors','sliders','jobPosts','firms','users','applications','members','invitations','memberMessages','notifications','supportTickets','surveys']),author:new Set([])};
const normalizedRole=r=>{const x=String(r||'').toLocaleLowerCase('tr');if(x.includes('muhasebe')||x.includes('sayman'))return'sayman';if(x.includes('köşe')||x.includes('köşe')||x.includes('kose')||x.includes('yazar'))return'author';if(x.includes('editör')||x.includes('editör')||x.includes('editor')||x.includes('moderatör')||x.includes('moderatör')||x.includes('moderator'))return'moderator';return'admin'};
const roleLabel=r=>({admin:'Yönetici',moderator:'Moderatör',sayman:'Sayman',author:'Köşe Yazarı'}[r]||'Yönetici');
const tempPassword=()=>`Pyz-${randomBytes(3).toString('hex')}-${randomBytes(3).toString('hex')}!`;
function ensureDefaultStaff(){
  const defaults=[
    ['admin1@peyzajder.org','Admin 1','Yönetici'],
    ['admin2@peyzajder.org','Admin 2','Yönetici'],
    ['moderator1@peyzajder.org','Moderatör 1','Moderatör'],
    ['moderator2@peyzajder.org','Moderatör 2','Moderatör'],
    ['sayman@peyzajder.org','Sayman','Sayman']
  ];
  let changed=false;
  for(const [email,name,role] of defaults){
    if(!db.users.some(u=>String(u.email||u.username||'').toLowerCase()===email)){
      const plain=tempPassword(),salt=randomBytes(16).toString('hex');
      db.users.push({id:`users-${Date.now()}-${randomBytes(3).toString('hex')}`,name,email,role,status:'Aktif',systemRole:normalizedRole(role),passwordHash:scryptSync(plain,salt,32).toString('hex'),salt,initialPassword:plain,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      changed=true;
    }
  }
  return changed;
}
let staffChanged=ensureDefaultStaff();
for(const u of db.users||[]){
  const cleanRole=roleLabel(u.systemRole||normalizedRole(u.role));
  if(u.role!==cleanRole){u.role=cleanRole;u.systemRole=normalizedRole(cleanRole);staffChanged=true}
}
if(staffChanged)await save(db);
const normText=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
const richTags=new Set(['p','br','strong','b','em','i','u','h2','h3','ul','ol','li','blockquote','a','figure','figcaption','img']);
function sanitizeRichHtml(value){let html=String(value||'').trim().replace(/<!--([\s\S]*?)-->/g,'').replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi,'');return html.replace(/<\/?([a-z][a-z0-9]*)([^>]*)>/gi,(whole,rawTag,attrs)=>{const tag=String(rawTag).toLowerCase(),closing=whole.startsWith('</');if(!richTags.has(tag))return'';if(closing)return ['br','img'].includes(tag)?'':`</${tag}>`;if(tag==='br')return'<br>';if(tag==='img'){const match=String(attrs||'').match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i),src=match?.[1]||match?.[2]||match?.[3]||'';if(!/^(?:uploads\/|assets\/|https?:\/\/)/i.test(src))return'';const safe=src.replace(/&/g,'&amp;').replace(/"/g,'&quot;');return`<img src="${safe}" alt="" loading="lazy">`}if(tag==='a'){const match=String(attrs||'').match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i),href=match?.[1]||match?.[2]||match?.[3]||'';if(!/^(https?:\/\/|mailto:|\/|#)/i.test(href))return'<a>';const safe=href.replace(/&/g,'&amp;').replace(/"/g,'&quot;');return`<a href="${safe}" target="_blank" rel="noopener">`}if(tag==='figure')return'<figure class="article-inline-image">';return`<${tag}>`})}
function sanitizeRichRecord(name,item){const fields=name==='content'?['body']:name==='events'?['description','body']:name==='articles'?['body']:[];for(const field of fields)if(field in item)item[field]=sanitizeRichHtml(item[field]);return item}
const settingValue=(keys,fallback='')=>{const wanted=keys.map(normText);const item=(db.settings||[]).find(x=>wanted.includes(normText(x.key||x.title)));return item?String(item.value??item.amount??''):fallback};
const activeRecord=x=>!['pasif','taslak','arşiv','arsiv'].includes(normText(x?.status||'Aktif'));
const configuredValue=(key,fallback='')=>settingValue([key],process.env[key.toUpperCase().replaceAll('.','_')]||fallback);
async function postWebhook(url,token,payload){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(payload)});
  const text=await response.text();if(!response.ok)throw new Error(`${response.status} ${text.slice(0,180)}`);return text;
}
const memberCategory=m=>m.group||m.memberGroup||m.membershipType||m.memberType||m.category||'Genel';
const managementMemberWords=['admin','yönetici','yonetici','moderatör','moderator','sayman','muhasebe','editör','editor','yazar'];
const isManagementMemberValue=value=>managementMemberWords.some(word=>normText(value).includes(word));
const duesEligibleMember=m=>approvedStatus(m?.membershipStatus||m?.status)&&!isManagementMemberValue(`${m?.role||''} ${m?.systemRole||''} ${memberCategory(m)} ${String(m?.email||'').split('@')[0]}`);
const tariffPeriods=t=>{const year=Number(t.year)||new Date().getFullYear();if(normText(t.frequency).startsWith('y'))return[String(year)];const start=t.startDate?new Date(t.startDate):new Date(year,0,1),end=t.endDate?new Date(t.endDate):new Date(year,11,1),first=Math.max(0,start.getMonth()),last=Math.min(11,end.getMonth());return Array.from({length:last-first+1},(_,i)=>`${year}-${String(first+i+1).padStart(2,'0')}`)};
const isCorporateMember=(account,application)=>normText(account.memberType||account.membershipType||account.group||application?.membershipType||'').includes('kurumsal')||!!(application.organization);
const waitingStatusText=x=>x.includes('bekle')||x.includes('bekli')||x.includes('incele')||x.includes('yüklendi');
const approvedStatus=v=>{const x=normText(v);return (x.includes('onay')||x.includes('aktif'))&&!waitingStatusText(x)&&!x.includes('red')};
const rejectedStatus=v=>{const x=normText(v);return x.includes('red')||x.includes('ret')};
const pendingStatus=v=>waitingStatusText(normText(v));
const memberRecordFor=a=>(db.members||[]).find(x=>x.accountId===a?.id||String(x.email||'').toLowerCase()===String(a?.email||'').toLowerCase())||null;
const membershipApproved=(account,application,member=memberRecordFor(account))=>[account?.membershipStatus,application?.status,member?.membershipStatus,member?.status].some(approvedStatus);
const itemTime=item=>new Date(item.createdAt||item.date||item.updatedAt||0).getTime()||0;
function notificationSummary(req){
  const memberAuth=memberSession(req),staffAuth=adminSession(req);
  let key='',labels=[],messages=[],invitations=[],notifications=[];
  if(memberAuth){
    const account=db.accounts.find(x=>x.id===memberAuth.accountId);if(!account)return null;
    const application=db.applications.find(x=>x.accountId===account.id)||null,member=memberRecordFor(account),membershipType=account.membershipType||account.group||application?.membershipType||member?.membershipType||'';
    key=`member:${account.id}`;labels=['tümü','tüm üyeler','tum uyeler',normText(membershipType),normText(account.email)];if(['bireysel','öğrenci'].includes(normText(membershipType)))labels.push('bireysel & öğrenci','bireysel/öğrenci');
    messages=(db.memberMessages||[]).filter(x=>(x.accountId===account.id||normText(x.email)===normText(account.email))&&!normText(x.direction).includes('üyeden yönetime'));
  }else if(staffAuth){
    const role=staffAuth.role||'admin',email=String(staffAuth.user||'').toLowerCase();
    key=`staff:${email}`;labels=['tümü','tüm kullanıcılar','tum kullanicilar',normText(role),normText(roleLabel(role)),normText(email)];
    if(['admin','moderator'].includes(role))messages=(db.memberMessages||[]).filter(x=>normText(x.direction).includes('üyeden yönetime')||normText(x.recipient||x.to)===normText(email));
    else messages=(db.memberMessages||[]).filter(x=>normText(x.recipient||x.to)===normText(email));
  }else return null;
  invitations=(db.invitations||[]).filter(x=>!['pasif','taslak'].includes(normText(x.status||'Yayında'))).filter(x=>String(x.audience||x.target||'Tümü').split(',').map(normText).some(target=>labels.includes(target)));
  const today=new Date().toISOString().slice(0,10);
  notifications=(db.notifications||[]).filter(x=>!['pasif','taslak'].includes(normText(x.status||'Aktif'))).filter(x=>(!x.startDate||x.startDate<=today)&&(!x.endDate||x.endDate>=today)).filter(x=>String(x.audience||x.target||'Tümü').split(',').map(normText).some(target=>labels.includes(target)));
  const read=(db.notificationReads||[]).find(x=>x.key===key),seenAt=new Date(read?.seenAt||0).getTime()||0;
  const unreadMessages=messages.filter(x=>itemTime(x)>seenAt).length,unreadInvitations=invitations.filter(x=>itemTime(x)>seenAt).length,unreadNotificationItems=notifications.filter(x=>itemTime(x)>seenAt);
  return{key,unreadMessages,unreadInvitations,unreadNotifications:unreadNotificationItems.length,notifications:unreadNotificationItems.map(x=>({id:x.id,title:x.title||'Bildirim',message:x.message||x.description||'',link:x.link||x.url||''})),total:unreadMessages+unreadInvitations+unreadNotificationItems.length};
}
function syncApplicationApproval(application){
  if(!application?.accountId)return;
  const account=db.accounts.find(x=>x.id===application.accountId),member=memberRecordFor(account);
  const status=String(application.status||'');
  let next=pendingStatus(status)?'Onay bekliyor':status||'Onay bekliyor';
  if(approvedStatus(status))next='Onaylandı';
  if(rejectedStatus(status))next='Reddedildi';
  if(account){account.membershipStatus=next;account.membershipType=application.membershipType||account.membershipType;if(application.organization)account.organization=application.organization;account.updatedAt=new Date().toISOString()}
  if(member){member.membershipStatus=next;member.membershipType=application.membershipType||member.membershipType;member.group=application.membershipType||member.group;member.organization=application.organization||member.organization;member.status=next==='Onaylandı'?'Aktif Üye':next;member.applicationDocument=application.documentUrl||member.applicationDocument;member.updatedAt=new Date().toISOString()}
  if(next==='Onaylandı'&&member){const category=memberCategory(member),group=(db.memberGroups||[]).find(g=>normText(g.title||g.name)===normText(category)),amount=Number(group?.entryFee)||0,year=new Date(member.createdAt||account?.createdAt||application.createdAt||Date.now()).getFullYear(),period=`${year}-GIRIS`,exists=(db.dues||[]).some(d=>String(d.memberId)===String(member.id)&&(d.kind==='entryFee'||d.period===period));if(amount>0&&!exists)db.dues.unshift({id:`dues-${Date.now()}-${randomBytes(3).toString('hex')}`,kind:'entryFee',memberId:member.id,member:member.name||account?.name||application.name||'Üye',memberEmail:member.email||account?.email||application.email||'',category,period,amount,paid:0,dueDate:`${year}-12-31`,status:'Beklemede',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}
}
async function saveWebpDataUrl(data,prefix){
  const m=String(data||'').match(/^data:image\/webp;base64,(.+)$/);
  if(!m)return String(data||'');
  const buf=Buffer.from(m[1],'base64');
  if(buf.length>4*1024*1024)throw new Error('Görsel 4 MB sınırını aşıyor');
  const filename=`${prefix}-${Date.now()}-${randomBytes(3).toString('hex')}.webp`;
  await writeFile(join(uploadDir,filename),buf);
  return `uploads/${filename}`;
}
function memberFinance(account,includePaymentDetails=false){
  const member=(db.members||[]).find(x=>x.accountId===account.id)||account;
  const category=memberCategory(member);
  const nowYear=new Date().getFullYear();
  const active=x=>!['pasif','taslak','arşiv','arsiv'].includes(normText(x.status||'Aktif'));
  const tariffs=(db.duePeriods||[]).filter(active).filter(t=>!t.group||normText(t.group)==='tüm üyeler'||normText(t.group)===normText(category)).sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0)||new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));
  const currentTariff=tariffs.find(t=>(Number(t.year)||nowYear)===nowYear)||tariffs[0]||null;
  const group=(db.memberGroups||[]).find(g=>normText(g.title||g.name)===normText(category));
  const fallbackEntryFee=Number(String(settingValue(['membershipEntryFee','uyelikGirisBedeli','üyelik giriş bedeli','girisBedeli'],'0')).replace(',','.'))||0;
  const entryFee=Number(String(group?.entryFee??group?.fee??fallbackEntryFee).replace(',','.'))||0;
  const memberDues=(db.dues||[]).filter(d=>String(d.memberId||'')===String(member.id||''));
  const debt=memberDues.reduce((sum,d)=>sum+(Number(d.amount)||0),0),paid=memberDues.reduce((sum,d)=>sum+(Number(d.paid)||0),0);
  const finance={category,entryFee,currentTariff:currentTariff?{title:currentTariff.title||'',group:currentTariff.group||'',frequency:currentTariff.frequency||'',year:currentTariff.year||'',amount:Number(currentTariff.amount)||0}:null,balance:{debt,paid,remaining:Math.max(0,debt-paid)}};
  if(includePaymentDetails){
    const bank=(db.bankAccounts||[]).find(x=>!['pasif','taslak','arşiv','arsiv'].includes(normText(x.status||'Aktif')));
    finance.bankAccount=bank?{bank:bank.bank||'',accountName:bank.accountName||'',iban:String(bank.iban||'').replace(/\s+/g,'').toUpperCase(),currency:bank.currency||'TRY'}:null;
    finance.paymentReference=`${account.name||account.email} - ${category} - Üyelik Giriş Bedeli/Aidat - ${new Date().getFullYear()}`;
  }
  return finance;
}
function publicSponsorGroups(placement){
  const now=Date.now();
  const active=x=>!['Pasif','Taslak'].includes(String(x.status||'Aktif'))&&(!x.endDate||new Date(x.endDate).getTime()>=now);
  const placementText=normText(placement);
  const defaultCategories=['Ana Sponsor','Platin Sponsor','Altın Sponsor','Gümüş Sponsor','Bronz Sponsor','Destek Sponsoru'];
  const configured=(db.sponsorCategories||[]).filter(active).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)||String(a.title||a.name||'').localeCompare(String(b.title||b.name||''),'tr')).map(x=>x.title||x.name).filter(Boolean);
  const order=[...new Set([...configured,...defaultCategories])];
  const items=(db.sponsors||[]).filter(active).filter(x=>normText(x.placement).includes(placementText)).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)||String(a.name||'').localeCompare(String(b.name||''),'tr')).map(x=>({id:x.id,name:x.name||'',category:x.category||x.placement||'Sponsor',logo:x.image||x.logo||'',url:x.url||'',description:x.description||''}));
  const grouped=order.map(category=>({category,items:items.filter(x=>String(x.category||'')===category)})).filter(g=>g.items.length);
  const rest=items.filter(x=>!order.includes(String(x.category||'')));
  if(rest.length)grouped.push({category:'Diğer Sponsorlar',items:rest});
  return{groups:grouped,items,categories:order};
}
function publicContentItem(x,type='Gündem'){
  const clean=v=>String(v||'').replace(/var\s+approachingEvent;/gi,'').replace(/var\s+content_slider;/gi,'').replace(/google-site-verification=[^\s]+/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const body=sanitizeRichHtml(x.body||x.description||'');
  return{id:x.id,title:clean(x.title||x.name||''),category:x.category||'',type,summary:clean(x.summary||x.description||body.slice(0,220)),body,image:x.image||x.cover||'',images:Array.isArray(x.images)?x.images.filter(Boolean):[],date:x.date||x.createdAt||'',author:x.author||'',sourceUrl:isLegacyPeyzajderSource(x.sourceUrl)?'':x.sourceUrl||''};
}

async function api(req,res,url){
  if(url.pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,service:'peyzajder-cms',time:new Date().toISOString()});
  if(url.pathname==='/api/public/site-config'&&req.method==='GET'){
    const visible=x=>!['Pasif','Taslak','Arşiv'].includes(String(x.status||'Aktif'));
    const publicSetting=key=>!/(token|password|secret|webhook|api.?key|smtp)/i.test(String(key||''));
    const settings=Object.fromEntries((db.settings||[]).filter(visible).map(x=>[String(x.key||x.title||''),String(x.value||'')]).filter(([key,value])=>key&&value&&publicSetting(key)));
    const socialLinks=(db.socialLinks||[]).filter(x=>visible(x)&&String(x.url||'').trim()).map(({id,title,platform,url,status})=>({id,title,platform,url,status:'Aktif'}));
    const modules=(db.modules||[]).map(({key,title,status})=>({key,title,status:status||'Aktif'}));
    return json(res,200,{settings,socialLinks,modules});
  }
  if(url.pathname==='/api/public/home'&&req.method==='GET'){
    const cleanText=v=>String(v||'').replace(/var\s+approachingEvent;/gi,'').replace(/var\s+content_slider;/gi,'').replace(/google-site-verification=[^\s]+/gi,'').replace(/Çağrı Merkezi\s*\d[\d\s]+/gi,'').replace(/YÖNETİM Başkanın Mesajları/gi,'').replace(/DERNEK ve ÜYELER Hakkımızda Banka Hesap Numaralarımız/gi,'').replace(/DERNEK[\s\S]{0,120}Banka Hesap Numaralar[ıi]*m[ıi]*z/gi,'').replace(/Adres\s*:\s*Alaaddinbey Mah\.[\s\S]*Bursa/gi,'').replace(/E-Posta\s*:\s*bilgi@peyzajder\.org/gi,'').replace(/Güncel haberler, duyurular ve ihalelerden anında haberdar ol/gi,'').replace(/Bu internet sitesinde sizlere daha iyi hizmet sunulabilmesi için çerezler kullanılmaktadır\./gi,'').replace(/\s+/g,' ').trim();
    const detailUrl=x=>`content-detail.html?id=${encodeURIComponent(x.id||'')}`;
    const publicItem=x=>({id:x.id,title:cleanText(x.title||x.name||''),category:x.category||'',summary:cleanText(x.summary||x.description||''),body:cleanText(x.body||''),image:x.image||x.cover||'',date:x.date||x.createdAt||'',url:x.id?detailUrl(x):(x.sourceUrl||'archive.html'),author:x.author||''});
    const visible=x=>!['Pasif','Taslak','Arşiv'].includes(String(x.status||'Yayında'));
    const byDate=(a,b)=>new Date(b.date||b.createdAt||0)-new Date(a.date||a.createdAt||0);
    const content=(db.content||[]).filter(visible);
    let articles=(db.articles||[]).filter(visible).filter(x=>{
      const until=x.featuredUntil?new Date(x.featuredUntil).getTime():0;
      if(until)return until>=Date.now();
      const d=x.date||x.createdAt;
      return d?Date.now()-new Date(d).getTime()<=31*24*60*60*1000:false;
    }).sort(byDate).slice(0,1).map(publicItem);
    const editorial=articles.length?articles:content.filter(x=>x.category==='kose-yazilari'&&!String(x.title||'').toLocaleLowerCase('tr').includes('köşe yazıları -')).sort(byDate).slice(0,1).map(publicItem);
    const excludedSliderIds=new Set((db.sliders||[]).filter(x=>String(x.status||'Pasif')!=='Aktif').map(x=>String(x.sourceId||x.contentId||x.eventId||x.id)));
    const sliderPool=[
      ...content.filter(x=>x.category==='haberler').map(x=>({...publicItem(x),type:'Haber'})),
      ...(db.events||[]).filter(visible).map(x=>({...publicItem(x),type:'Etkinlik'}))
    ].filter(x=>x.title&&!excludedSliderIds.has(String(x.id))).sort(byDate);
    const sliderItems=sliderPool.slice(0,5);
    const publicSetting=key=>!/(token|password|secret|webhook|api.?key|smtp)/i.test(String(key||''));
    const settings=Object.fromEntries((db.settings||[]).filter(visible).map(x=>[String(x.key||x.title||''),String(x.value||'')]).filter(([k,v])=>k&&v&&publicSetting(k)));
    return json(res,200,{
      settings,
      sliders:sliderItems,
      haberler:content.filter(x=>x.category==='haberler').sort(byDate).slice(0,4).map(publicItem),
      etkinlikler:(db.events||[]).filter(visible).sort(byDate).slice(0,4).map(publicItem),
      duyurular:content.filter(x=>x.category==='duyurular').sort(byDate).slice(0,4).map(publicItem),
      articles:editorial,
      editorial
    })
  }
  if(url.pathname==='/api/public/boards'&&req.method==='GET'){const publicBoards=db.boards.filter(x=>x.recordType!=='board'&&x.status!=='Pasif').sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)).map(({id,title,name,role,term,photo,bio,status})=>({id,title,name,role,term,photo,bio,status}));return json(res,200,publicBoards)}
  if(url.pathname==='/api/public/menus'&&req.method==='GET'){return json(res,200,(db.menus||[]).filter(x=>x.status!=='Pasif').sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)).map(({id,title,url,parent,order,status})=>({id,title,url,parent,order,status})))}
  if(url.pathname==='/api/public/archive'&&req.method==='GET'){
    const visible=x=>!['Pasif','Taslak','Arşiv','Arsiv'].includes(String(x.status||'Yayında'));
    const byDate=(a,b)=>new Date(b.date||b.updatedAt||b.createdAt||0)-new Date(a.date||a.updatedAt||a.createdAt||0);
    const toArchive=(x,type,category=x.category||'haberler')=>({
      ...publicContentItem(x,type),
      category,
      url:`content-detail.html?id=${encodeURIComponent(x.id||'')}`
    });
    const items=[
      ...(db.content||[]).filter(visible).filter(x=>x.category!=='etkinlikler').map(x=>toArchive(x,x.category==='duyurular'?'Duyuru':x.category==='haberler'?'Haber':'İçerik')),
      ...(db.events||[]).filter(visible).map(x=>toArchive(x,'Etkinlik','etkinlikler')),
      ...(db.jobPosts||[]).filter(visible).map(x=>toArchive(x,'İlan','is-ilanlari')),
      ...(db.articles||[]).filter(visible).map(x=>toArchive(x,'Köşe Yazısı','kose-yazilari'))
    ].filter(x=>x.id&&x.title).sort(byDate);
    return json(res,200,{items,count:items.length,categories:[...new Set(items.map(x=>x.category).filter(Boolean))]});
  }
  if(url.pathname==='/api/public/item'&&req.method==='GET'){
    const id=String(url.searchParams.get('id')||'');
    const visible=x=>!['Pasif','Taslak','Arşiv','Arsiv'].includes(String(x.status||'Yayında'));
    const sources=[
      ...(db.content||[]).filter(x=>x.category!=='etkinlikler').map(x=>({...x,type:x.category==='duyurular'?'Duyuru':'Haber'})),
      ...(db.events||[]).map(x=>({...x,type:'Etkinlik'})),
      ...(db.jobPosts||[]).map(x=>({...x,type:'İlan'})),
      ...(db.articles||[]).map(x=>({...x,type:'Köşe Yazısı'}))
    ];
    const item=sources.find(x=>String(x.id)===id&&visible(x));
    if(!item)return json(res,404,{error:'İçerik bulunamadı'});
    return json(res,200,publicContentItem(item,item.type));
  }
  if(url.pathname==='/api/public/promo-panel'&&req.method==='GET'){const now=Date.now(),panel=(db.promoPanels||[]).filter(x=>!['Pasif','Taslak'].includes(String(x.status||'Aktif'))).filter(x=>(!x.startDate||new Date(x.startDate).getTime()<=now)&&(!x.endDate||new Date(x.endDate).getTime()>=now)).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)||new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0))[0];return json(res,200,panel?{active:true,title:panel.title||'',label:panel.label||'',body:panel.body||panel.description||'',buttonText:panel.buttonText||'TIKLA',url:panel.url||'https://peyzajder.com',mainSponsorTitle:panel.mainSponsorTitle||'Ana Sponsor',mainSponsorLogo:panel.mainSponsorLogo||'',mainSponsorUrl:panel.mainSponsorUrl||''}:{active:false})}
  if(url.pathname==='/api/public/competition-sponsors'&&req.method==='GET')return json(res,200,publicSponsorGroups('Yarışma Sayfası'))
  if(url.pathname==='/api/public/home-sponsors'&&req.method==='GET')return json(res,200,publicSponsorGroups('Ana Sayfa'))
  if(url.pathname==='/api/public/member-types'&&req.method==='GET'){
    const active=x=>!['pasif','taslak','arşiv','arsiv'].includes(normText(x.status||'Aktif'));
    return json(res,200,(db.memberGroups||[]).filter(active).filter(x=>!isManagementMemberValue(x.title||x.name)).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)||String(a.title||a.name||'').localeCompare(String(b.title||b.name||''),'tr')).map(x=>({id:x.id,title:x.title||x.name||'',entryFee:Number(x.entryFee)||0,description:x.description||''})));
  }
  if(url.pathname==='/api/public/firms'&&req.method==='GET'){
    const active=x=>['aktif','yayında','yayinda'].includes(normText(x.status||'Aktif'))||(Boolean(x.accountId)&&normText(x.status)==='onay bekliyor');
    return json(res,200,(db.firms||[]).filter(active).map(x=>({
      id:x.id,name:x.name||'',logo:x.logo||x.image||'',city:x.city||'',address:x.address||'',phone:x.phone||'',email:x.email||'',website:x.website||'',activities:Array.isArray(x.activities)?x.activities:String(x.activities||x.specialty||'').split(/[,;\n]/).map(y=>y.trim()).filter(Boolean),description:x.description||''
    })));
  }
  if(url.pathname==='/api/public/editorials'&&req.method==='GET'){const safe=x=>['aktif','yayında','yayinda'].includes(String(x.status||'Yayında').toLocaleLowerCase('tr'));const byDate=(a,b)=>new Date(b.date||b.updatedAt||b.createdAt||0)-new Date(a.date||a.updatedAt||a.createdAt||0);const authors=db.authors||[];return json(res,200,(db.articles||[]).filter(safe).sort(byDate).map(x=>{const a=authors.find(y=>String(y.email||'').toLowerCase()===String(x.authorEmail||'').toLowerCase()||String(y.name||'')===String(x.author||''));return{id:x.id,title:x.title||'',summary:x.summary||String(x.body||'').replace(/<[^>]+>/g,' ').slice(0,180),body:sanitizeRichHtml(x.body||''),image:x.image||'',date:x.date||x.createdAt||'',author:x.author||a?.name||'PEYZAJDER yazarı',authorEmail:x.authorEmail||a?.email||'',authorPhoto:a?.photo||'',authorBio:a?.description||'',status:x.status||''}}))}
  if(url.pathname==='/api/public/competitions'&&req.method==='GET'){try{const r=await fetch('https://peyzajder.com/api/v1/public/competitions',{headers:{'Accept':'application/json'}}),d=await r.json();return json(res,r.ok?200:r.status,d)}catch(e){return json(res,200,{success:false,error:'Yarışma platformuna şu anda ulaşılamadı',data:{active_competitions:[],result_competitions:[],completed_competitions:[]}})}}
  if(url.pathname==='/api/public/newsletter'&&req.method==='POST'){
    const b=await body(req),email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Geçerli bir e-posta adresi girin'});
    let item=(db.subscribers||[]).find(x=>String(x.email||'').toLowerCase()===email);if(item){item.name=name||item.name||'';item.status='Aktif';item.updatedAt=new Date().toISOString()}else{item={id:`subscribers-${Date.now()}-${randomBytes(3).toString('hex')}`,name,email,status:'Aktif',source:'Web sitesi',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};db.subscribers.unshift(item)}audit('E-bülten aboneliği','subscribers',item,email);await save(db);return json(res,201,{ok:true,message:'E-bülten aboneliğiniz oluşturuldu'});
  }
  if(url.pathname==='/api/public/survey'&&req.method==='GET'){
    const today=new Date().toISOString().slice(0,10),survey=(db.surveys||[]).filter(activeRecord).filter(x=>(!x.startDate||x.startDate<=today)&&(!x.endDate||x.endDate>=today)).sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0))[0];if(!survey)return json(res,200,{active:false});
    const options=Array.isArray(survey.options)?survey.options:String(survey.options||'').split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean),votes=survey.votes&&typeof survey.votes==='object'?survey.votes:{};return json(res,200,{active:true,id:survey.id,title:survey.title||'PEYZAJDER Anketi',question:survey.question||survey.description||'',options:options.map((label,index)=>({id:String(index),label,count:Number(votes[index])||0})),placement:survey.placement||'Ana sayfa açılır pencere'});
  }
  if(url.pathname==='/api/public/survey/vote'&&req.method==='POST'){
    const b=await body(req),survey=(db.surveys||[]).find(x=>x.id===b.surveyId&&activeRecord(x));if(!survey)return json(res,404,{error:'Anket bulunamadı'});const options=Array.isArray(survey.options)?survey.options:String(survey.options||'').split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean),index=Number(b.option);if(!Number.isInteger(index)||index<0||index>=options.length)return json(res,400,{error:'Geçerli bir seçenek seçin'});const cookieName=`peyzajder_survey_${survey.id}`,seen=cookies(req)[cookieName];if(seen)return json(res,409,{error:'Bu ankete daha önce katıldınız'});survey.votes=survey.votes&&typeof survey.votes==='object'?survey.votes:{};survey.votes[index]=(Number(survey.votes[index])||0)+1;survey.updatedAt=new Date().toISOString();await save(db);return json(res,200,{ok:true,votes:survey.votes},{'Set-Cookie':`${cookieName}=1; SameSite=Lax; Path=${COOKIE_PATH}; Max-Age=31536000`});
  }
  if(url.pathname==='/api/public/contact'&&req.method==='POST'){const b=await body(req),name=String(b.name||'').trim(),email=String(b.email||'').trim(),message=String(b.message||'').trim();if(!name||!email.includes('@')||!message)return json(res,400,{error:'Ad soyad, geçerli e-posta ve mesaj alanı gerekli'});const item={id:`contactMessages-${Date.now()}-${randomBytes(3).toString('hex')}`,name,email,phone:String(b.phone||'').trim(),subject:String(b.subject||'İletişim'),message,status:'Yeni',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),source:'İletişim sayfası'};db.contactMessages.unshift(item);audit('Yeni mesaj','contactMessages',item);await save(db);return json(res,201,{ok:true})}
  if(url.pathname==='/api/panel-notifications'){
    const summary=notificationSummary(req);if(!summary)return json(res,401,{error:'Oturum gerekli'});
    if(req.method==='GET')return json(res,200,{unreadMessages:summary.unreadMessages,unreadInvitations:summary.unreadInvitations,unreadNotifications:summary.unreadNotifications,notifications:summary.notifications,total:summary.total});
    if(req.method==='POST'){
      let read=(db.notificationReads||[]).find(x=>x.key===summary.key);
      if(!read){read={id:`notificationReads-${Date.now()}-${randomBytes(3).toString('hex')}`,key:summary.key,createdAt:new Date().toISOString()};db.notificationReads.push(read)}
      read.seenAt=new Date().toISOString();read.updatedAt=read.seenAt;await save(db);return json(res,200,{ok:true});
    }
    return json(res,405,{error:'Yöntem desteklenmiyor'});
  }
  if(url.pathname==='/api/register'&&req.method==='POST'){
    const b=await body(req);
    const name=String(b.name||'').trim().replace(/\s+/g,' ');
    const email=String(b.email||'').trim().toLowerCase();
    const phone=String(b.phone||'').trim();
    const phoneDigits=phone.replace(/\D/g,'');
    const password=String(b.password||'');
    const membershipType=String(b.membershipType||'Bireysel').trim();
    const allowedMemberTypes=(db.memberGroups||[]).filter(x=>!['pasif','taslak','arşiv','arsiv'].includes(normText(x.status||'Aktif'))&&!isManagementMemberValue(x.title||x.name)).map(x=>normText(x.title||x.name));
    if(name.split(' ').filter(Boolean).length<2)return json(res,400,{error:'Ad ve soyad alanı zorunludur'});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Geçerli bir e-posta adresi gereklidir'});
    if(!/^[0-9+()\s-]+$/.test(phone)||phoneDigits.length<10||phoneDigits.length>15)return json(res,400,{error:'Geçerli bir telefon numarası gereklidir'});
    if(password.length<8)return json(res,400,{error:'Şifre en az 8 karakter olmalıdır'});
    if(!allowedMemberTypes.includes(normText(membershipType)))return json(res,400,{error:'Geçerli bir üyelik türü seçin'});
    if(db.accounts.some(x=>x.email===email))return json(res,409,{error:'Bu e-posta ile daha önce hesap oluşturulmuş'});
    const salt=randomBytes(16).toString('hex');
    const account={id:`account-${Date.now()}`,name,email,phone,city:String(b.city||''),profession:String(b.profession||''),membershipType,group:membershipType,passwordHash:scryptSync(password,salt,32).toString('hex'),salt,role:'Site Üyesi',membershipStatus:'Başvuru yapılmadı',createdAt:new Date().toISOString()};
    db.accounts.push(account);
    db.members.unshift({id:`member-${account.id}`,accountId:account.id,name:account.name,email:account.email,phone:account.phone,city:account.city,profession:account.profession,membershipType,group:membershipType,status:'Site Üyesi',membershipStatus:account.membershipStatus,createdAt:account.createdAt});
    const token=randomBytes(32).toString('hex');
    sessions.set(token,{type:'member',accountId:account.id,user:account.email,created:Date.now()});
    await save(db);
    return json(res,201,{ok:true,membershipStatus:account.membershipStatus,redirect:'member-portal.html?created=1'},{'Set-Cookie':`peyzajder_member_session=${token}; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=28800`});
  }
  if(url.pathname==='/api/member/login'&&req.method==='POST'){const b=await body(req),email=String(b.email||'').trim().toLowerCase(),account=db.accounts.find(x=>x.email===email);if(!account)return json(res,401,{error:'E-posta veya şifre hatalı'});const candidate=scryptSync(String(b.password||''),account.salt,32),stored=Buffer.from(account.passwordHash,'hex');if(stored.length!==candidate.length||!timingSafeEqual(stored,candidate))return json(res,401,{error:'E-posta veya şifre hatalı'});const token=randomBytes(32).toString('hex');sessions.set(token,{type:'member',accountId:account.id,user:account.email,created:Date.now()});return json(res,200,{ok:true},{'Set-Cookie':`peyzajder_member_session=${token}; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=28800`})}
  if(url.pathname==='/api/member/forgot'&&req.method==='POST'){const b=await body(req),email=String(b.email||'').trim().toLowerCase(),account=db.accounts.find(x=>x.email===email);if(!account)return json(res,200,{ok:true,message:'Hesap mevcutsa sıfırlama bağlantısı oluşturuldu'});const token=randomBytes(32).toString('hex');resetTokens.set(token,{accountId:account.id,expires:Date.now()+30*60*1000});return json(res,200,{ok:true,message:'Şifre sıfırlama bağlantınız hazır',resetUrl:`reset-password.html?token=${token}`})}
  if(url.pathname==='/api/member/reset'&&req.method==='POST'){const b=await body(req),entry=resetTokens.get(String(b.token||'')),password=String(b.password||'');if(!entry||entry.expires<Date.now())return json(res,400,{error:'Bağlantı geçersiz veya süresi dolmuş'});if(password.length<8)return json(res,400,{error:'Şifre en az 8 karakter olmalıdır'});const account=db.accounts.find(x=>x.id===entry.accountId);if(!account)return json(res,400,{error:'Hesap bulunamadı'});const salt=randomBytes(16).toString('hex');account.salt=salt;account.passwordHash=scryptSync(password,salt,32).toString('hex');account.updatedAt=new Date().toISOString();resetTokens.delete(String(b.token));await save(db);return json(res,200,{ok:true})}
  if(url.pathname==='/api/member/logout'){const token=cookies(req).peyzajder_member_session;sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':[`peyzajder_member_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`,`peyzajder_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`]})}
  if(url.pathname==='/api/member/me'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});
    const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,401,{error:'Üye hesabı bulunamadı'});
    const application=db.applications.find(x=>x.accountId===a.id)||null,company=db.firms.find(x=>x.accountId===a.id)||null,memberRow=memberRecordFor(a),approved=membershipApproved(a,application,memberRow),corporate=approved&&isCorporateMember(a,application);
    const membershipType=a.membershipType||a.group||application?.membershipType||'';
    const audienceMatches=x=>{const targets=String(x.audience||x.target||'Tümü').split(',').map(normText);return targets.some(t=>t==='tümü'||t==='tum üyeler'||t==='tüm üyeler'||t===normText(membershipType)||(corporate&&t==='kurumsal')||(!corporate&&(t==='bireysel & öğrenci'||t==='bireysel/öğrenci')))};
    const invitations=approved?(db.invitations||[]).filter(x=>!['Pasif','Taslak'].includes(String(x.status||'Yayında'))&&audienceMatches(x)).sort((x,y)=>new Date(y.date||y.createdAt||0)-new Date(x.date||x.createdAt||0)):[];
    const today=new Date().toISOString().slice(0,10),notifications=approved?(db.notifications||[]).filter(x=>!['Pasif','Taslak'].includes(String(x.status||'Aktif'))&&(!x.startDate||x.startDate<=today)&&(!x.endDate||x.endDate>=today)&&audienceMatches(x)).sort((x,y)=>new Date(y.createdAt||0)-new Date(x.createdAt||0)):[];
    const messages=approved?(db.memberMessages||[]).filter(x=>x.accountId===a.id||String(x.email||'').toLowerCase()===a.email).sort((x,y)=>new Date(x.createdAt||0)-new Date(y.createdAt||0)):[];
    return json(res,200,{id:a.id,name:a.name,email:a.email,phone:a.phone,city:a.city,profession:a.profession,role:a.role,membershipType,membershipStatus:a.membershipStatus,membershipApproved:approved,panelType:approved?(corporate?'corporate':'member'):'application',isCorporate:corporate,finance:memberFinance(a,approved),application,company,invitations,messages,notifications});
  }
  if(url.pathname==='/api/member/payment-notification'&&req.method==='POST'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});
    const a=db.accounts.find(x=>x.id===s.accountId),application=db.applications.find(x=>x.accountId===a?.id)||null,member=memberRecordFor(a);if(!a||!membershipApproved(a,application,member))return json(res,403,{error:'Ödeme bildirimi yalnızca onaylı üyeler içindir'});
    const b=await body(req),amount=Number(String(b.amount||'').replace(',','.'))||0,paymentType=String(b.paymentType||'Aidat').trim(),paymentDate=String(b.paymentDate||new Date().toISOString().slice(0,10)),match=String(b.data||'').match(/^data:([^;]+);base64,(.+)$/),allowed={'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png'};if(amount<=0)return json(res,400,{error:'Geçerli bir ödeme tutarı girin'});if(!match||!allowed[match[1]])return json(res,400,{error:'Dekontu PDF, JPG veya PNG biçiminde yükleyin'});const buffer=Buffer.from(match[2],'base64');if(buffer.length>1024*1024)return json(res,400,{error:'Dekont 1 MB sınırını aşıyor'});const filename=`payment-receipt-${a.id}-${Date.now()}${allowed[match[1]]}`;await writeFile(join(uploadDir,filename),buffer);const item={id:`payments-${Date.now()}-${randomBytes(3).toString('hex')}`,member:member?.name||a.name,memberId:member?.id||'',accountId:a.id,email:a.email,amount,date:paymentDate,method:'Havale',paymentType,receiptUrl:`uploads/${filename}`,status:'Onay bekliyor',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};db.payments.unshift(item);audit('Üye ödeme bildirimi gönderdi','payments',item,a.email);await save(db);return json(res,201,{ok:true,status:item.status});
  }
  if(url.pathname==='/api/member/support'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,401,{error:'Üye hesabı bulunamadı'});
    if(req.method==='GET')return json(res,200,(db.supportTickets||[]).filter(x=>x.accountId===a.id||String(x.email||'').toLowerCase()===a.email).sort((x,y)=>new Date(y.createdAt||0)-new Date(x.createdAt||0)));
    if(req.method==='POST'){const b=await body(req),title=String(b.title||'').trim(),message=String(b.message||'').trim();if(!title||!message)return json(res,400,{error:'Konu ve açıklama gerekli'});const item={id:`supportTickets-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,name:a.name,email:a.email,title,category:String(b.category||'Teknik destek'),priority:String(b.priority||'Normal'),message,status:'Açık',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};db.supportTickets.unshift(item);audit('Üye destek talebi oluşturdu','supportTickets',item,a.email);await save(db);return json(res,201,item)}
    return json(res,405,{error:'Yöntem desteklenmiyor'});
  }
  if(url.pathname==='/api/member/messages'&&req.method==='POST'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});
    const a=db.accounts.find(x=>x.id===s.accountId),application=db.applications.find(x=>x.accountId===a?.id)||null;
    if(!a||!membershipApproved(a,application))return json(res,403,{error:'Mesajlaşma üyelik onayından sonra açılır'});
    const b=await body(req),message=String(b.message||'').trim();if(!message)return json(res,400,{error:'Mesaj alanı boş bırakılamaz'});
    const item={id:`memberMessages-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,name:a.name,email:a.email,direction:'Üyeden yönetime',message,status:'Yeni',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    db.memberMessages.push(item);audit('Üye mesajı gönderildi','memberMessages',item,a.email);await save(db);return json(res,201,{ok:true,item});
  }
  if(url.pathname==='/api/member/company'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});
    const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,401,{error:'Üye hesabı bulunamadı'});
    const application=db.applications.find(x=>x.accountId===a.id)||null;
    if(req.method==='GET')return json(res,200,db.firms.find(x=>x.accountId===a.id)||null);
    if(req.method==='PUT'||req.method==='POST'){
      if(!membershipApproved(a,application)||!isCorporateMember(a,application))return json(res,403,{error:'Firma kartı için onaylı kurumsal üyelik gereklidir'});
      const b=await body(req);
      const activities=[...new Set((Array.isArray(b.activities)?b.activities:String(b.activities||'').split(/[,;\n]/)).map(x=>String(x).trim()).filter(Boolean))];
      const name=String(b.name||'').trim().replace(/\s+/g,' ');
      const rawCity=String(b.city||'').trim().replace(/\s+/g,' ');
      const city=rawCity.toLocaleLowerCase('tr-TR').replace(/(^|[\s-])([\p{L}])/gu,(all,space,letter)=>space+letter.toLocaleUpperCase('tr-TR'));
      if(!name)return json(res,400,{error:'Firma adı gereklidir'});
      if(!city)return json(res,400,{error:'Şehir seçimi gereklidir'});
      if(!activities.length)return json(res,400,{error:'En az bir faaliyet alanı seçilmelidir'});
      let item=db.firms.find(x=>x.accountId===a.id);
      if(!item){item={id:`firms-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,createdAt:new Date().toISOString()};db.firms.unshift(item)}
      const logo=await saveWebpDataUrl(b.logo||b.image,`firm-logo-${a.id}`);
      Object.assign(item,{name,logo:logo||item.logo||'',image:logo||item.image||'',email:String(b.email||a.email||'').trim(),phone:String(b.phone||'').trim(),website:String(b.website||'').trim(),city,address:String(b.address||'').trim(),activities,specialty:activities.join(', '),description:String(b.description||'').trim(),status:'Aktif',updatedAt:new Date().toISOString()});
      audit('Firma kartı güncellendi ve firma bulucuda yayınlandı','firms',item);await save(db);return json(res,200,item);
    }
  }
  if(url.pathname==='/api/member/jobs'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});
    const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,401,{error:'Üye hesabı bulunamadı'});
    const application=db.applications.find(x=>x.accountId===a.id)||null;
    if(!membershipApproved(a,application)||!isCorporateMember(a,application))return json(res,403,{error:'İlan talebi için onaylı kurumsal üyelik gereklidir'});
    if(req.method==='GET')return json(res,200,(db.jobPosts||[]).filter(x=>x.accountId===a.id));
    if(req.method==='POST'){
      const b=await body(req),firm=db.firms.find(x=>x.accountId===a.id);
      const item={id:`jobPosts-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,company:String(b.company||firm?.name||'').trim(),title:String(b.title||'').trim(),type:String(b.type||'Eleman arama'),location:String(b.location||firm?.city||'').trim(),url:String(b.url||'').trim(),endDate:String(b.endDate||'').trim(),description:String(b.description||'').trim(),status:'Onay bekliyor',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      if(!item.title||!item.company)return json(res,400,{error:'İlan başlığı ve firma adı gerekli'});
      db.jobPosts.unshift(item);audit('Firma ilanı onaya gönderildi','jobPosts',item);await save(db);return json(res,201,item);
    }
  }
  if(url.pathname==='/api/member/profile'&&req.method==='PUT'){const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,404,{error:'Üye hesabı bulunamadı'});const app=db.applications.find(x=>x.accountId===a.id);if(!membershipApproved(a,app))return json(res,403,{error:'Kişisel bilgiler paneli üyelik onayından sonra açılır'});const b=await body(req);a.name=String(b.name||'').trim();a.phone=String(b.phone||'').trim();a.city=String(b.city||'').trim();a.profession=String(b.profession||'').trim();if(!a.name)return json(res,400,{error:'Ad soyad gerekli'});a.updatedAt=new Date().toISOString();const member=db.members.find(x=>x.accountId===a.id);if(member){member.name=a.name;member.phone=a.phone;member.city=a.city;member.profession=a.profession;member.updatedAt=a.updatedAt}if(app){app.name=a.name;app.phone=a.phone;app.city=a.city;app.profession=a.profession;app.updatedAt=a.updatedAt}await save(db);return json(res,200,{ok:true,name:a.name,phone:a.phone,city:a.city,profession:a.profession})}
  if(url.pathname==='/api/member/application'&&req.method==='POST'){const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});const a=db.accounts.find(x=>x.id===s.accountId);if(db.applications.some(x=>x.accountId===a.id))return json(res,409,{error:'Başvuru belgeniz daha önce gönderildi. İkinci belge yüklenemez'});const b=await body(req),m=String(b.data||'').match(/^data:([^;]+);base64,(.+)$/),allowed={'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png'};if(!m||!allowed[m[1]])return json(res,400,{error:'PDF, JPG veya PNG dosyası yükleyin'});const buf=Buffer.from(m[2],'base64');if(buf.length>1024*1024)return json(res,400,{error:'Dosya 1 MB sınırını aşıyor'});const filename=`signed-application-${a.id}-${Date.now()}${allowed[m[1]]}`;await writeFile(join(uploadDir,filename),buf);const application={id:`applications-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,name:a.name,email:a.email,phone:a.phone,profession:a.profession,city:a.city,createdAt:new Date().toISOString()};db.applications.unshift(application);application.membershipType=String(b.membershipType||'Bireysel');application.organization=String(b.organization||'');application.documentUrl=`uploads/${filename}`;application.documentName=String(b.name||filename);application.status='Onay bekliyor';application.updatedAt=new Date().toISOString();a.membershipStatus='Onay bekliyor';a.membershipType=application.membershipType;if(application.organization)a.organization=application.organization;const member=db.members.find(x=>x.accountId===a.id);if(member){member.membershipType=application.membershipType;member.group=application.membershipType;member.organization=application.organization;member.membershipStatus='Onay bekliyor';member.status='Onay bekliyor';member.applicationDocument=application.documentUrl;member.updatedAt=new Date().toISOString()}audit('İmzalı başvuru yüklendi','applications',application);await save(db);return json(res,201,{ok:true,status:a.membershipStatus,documentUrl:application.documentUrl})}
  if(url.pathname==='/api/login'&&req.method==='POST'){const b=await body(req),login=String(b.username||'').trim().toLowerCase();let user,role;if(login===USER&&secureEqual(b.password||'',PASSWORD)){user=USER;role='admin'}else{const staff=db.users.find(x=>String(x.email||x.username||'').toLowerCase()===login&&x.status!=='Pasif');if(staff?.passwordHash){const candidate=scryptSync(String(b.password||''),staff.salt,32),stored=Buffer.from(staff?.passwordHash,'hex');if(stored.length===candidate.length&&timingSafeEqual(stored,candidate)){user=staff.email||staff.username;role=staff.systemRole||normalizedRole(staff.role)}}}if(user){const token=randomBytes(32).toString('hex');sessions.set(token,{type:'admin',role,user,created:Date.now()});return json(res,200,{ok:true,user,role},{'Set-Cookie':`peyzajder_admin_session=${token}; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=28800`})}return json(res,401,{error:'Kullanıcı adı veya şifre hatalı'})}
  if(url.pathname==='/api/logout'){const token=cookies(req).peyzajder_admin_session;sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':[`peyzajder_admin_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`,`peyzajder_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`]})}
  if(url.pathname==='/api/author/me'){const s=adminSession(req);if(!s||s.role!=='author')return json(res,401,{error:'Köşe yazarı girişi gerekli'});const u=db.users.find(x=>String(x.email||x.username||'').toLowerCase()===String(s.user||'').toLowerCase());return json(res,200,{user:s.user,role:s.role,name:u?.name||s.user,email:u?.email||s.user})}
  if(url.pathname.startsWith('/api/author/articles')){const s=adminSession(req);if(!s||s.role!=='author')return json(res,401,{error:'Köşe yazarı girişi gerekli'});const u=db.users.find(x=>String(x.email||x.username||'').toLowerCase()===String(s.user||'').toLowerCase()),email=String(u?.email||s.user||'').toLowerCase(),name=u?.name||s.user,parts=url.pathname.split('/').filter(Boolean),id=parts[3],mine=x=>String(x.authorEmail||'').toLowerCase()===email||String(x.author||'')===name;if(req.method==='GET')return json(res,200,(db.articles||[]).filter(mine));if(req.method==='POST'&&!id){const b=await body(req);const item={id:`articles-${Date.now()}-${randomBytes(3).toString('hex')}`,title:String(b.title||'').trim(),summary:String(b.summary||'').trim(),body:String(b.body||'').trim(),image:String(b.image||'').trim(),author:name,authorEmail:email,date:new Date().toISOString().slice(0,10),status:'Beklemede',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!item.title||!item.body)return json(res,400,{error:'Başlık ve yazı metni gerekli'});db.articles.unshift(item);if(!db.authors.some(a=>String(a.email||'').toLowerCase()===email))db.authors.unshift({id:`authors-${Date.now()}-${randomBytes(3).toString('hex')}`,name,email,status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});audit('Yazar yazısı gönderdi','articles',item);await save(db);return json(res,201,item)}const index=(db.articles||[]).findIndex(x=>x.id===id);if(index<0||!mine(db.articles[index]))return json(res,404,{error:'Yazı bulunamadı'});if(req.method==='PUT'){const b=await body(req),item=db.articles[index];item.title=String(b.title||'').trim();item.summary=String(b.summary||'').trim();item.body=String(b.body||'').trim();item.image=String(b.image||'').trim();if(!item.title||!item.body)return json(res,400,{error:'Başlık ve yazı metni gerekli'});item.status='Beklemede';item.updatedAt=new Date().toISOString();audit('Yazar yazısını güncelledi','articles',item);await save(db);return json(res,200,item)}if(req.method==='DELETE'){const [removed]=db.articles.splice(index,1);audit('Yazar yazısını sildi','articles',removed);await save(db);return json(res,200,{ok:true})}return json(res,405,{error:'Yöntem desteklenmiyor'})}
  if(!adminSession(req))return json(res,401,{error:'Yönetici oturumu gerekli'});
  if(url.pathname==='/api/me'){const s=adminSession(req);return json(res,200,{user:s.user,role:s.role||'admin'})}
  if(url.pathname==='/api/communications/email/send'&&req.method==='POST'){
    const current=adminSession(req),role=current.role||'admin';if(role!=='admin')return json(res,403,{error:'E-posta kampanyası gönderimi yönetici yetkisi gerektirir'});const b=await body(req),campaign=(db.emailCampaigns||[]).find(x=>x.id===b.campaignId);if(!campaign)return json(res,404,{error:'E-posta kampanyası bulunamadı'});const webhookUrl=configuredValue('email.webhookUrl'),token=configuredValue('email.webhookToken'),from=configuredValue('email.from');if(!webhookUrl||!from)return json(res,409,{error:'E-posta servisi ayarlanmamış. İletişim yönetiminden webhook adresi ve gönderen e-postasını girin'});
    const audience=normText(campaign.audience||'E-bülten aboneleri'),recipients=audience.includes('üye')?(db.members||[]).filter(duesEligibleMember).map(x=>({email:x.email,name:x.name})).filter(x=>x.email):(db.subscribers||[]).filter(activeRecord).map(x=>({email:x.email,name:x.name})).filter(x=>x.email);let sent=0,failed=0,lastError='';for(const recipient of recipients){try{await postWebhook(webhookUrl,token,{channel:'email',from,to:recipient.email,name:recipient.name||'',subject:campaign.subject||campaign.title||'PEYZAJDER',html:campaign.body||campaign.message||''});sent++}catch(error){failed++;lastError=error.message}}campaign.sentCount=sent;campaign.failedCount=failed;campaign.lastError=lastError;campaign.status=failed?'Kısmi / Hatalı':'Gönderildi';campaign.sentAt=new Date().toISOString();campaign.updatedAt=campaign.sentAt;audit('E-posta kampanyası gönderildi','emailCampaigns',campaign);await save(db);return json(res,200,{ok:failed===0,sent,failed,lastError});
  }
  if(url.pathname==='/api/communications/sms/send'&&req.method==='POST'){
    const current=adminSession(req),role=current.role||'admin';if(role!=='admin')return json(res,403,{error:'SMS kampanyası gönderimi yönetici yetkisi gerektirir'});const b=await body(req),campaign=(db.smsCampaigns||[]).find(x=>x.id===b.campaignId);if(!campaign)return json(res,404,{error:'SMS kampanyası bulunamadı'});const webhookUrl=configuredValue('sms.webhookUrl'),token=configuredValue('sms.webhookToken'),sender=configuredValue('sms.sender','PEYZAJDER');if(!webhookUrl)return json(res,409,{error:'SMS servisi ayarlanmamış. İletişim yönetiminden SMS webhook adresini girin'});const recipients=(db.members||[]).filter(duesEligibleMember).map(x=>({phone:String(x.phone||'').replace(/\D/g,''),name:x.name})).filter(x=>x.phone.length>=10);let sent=0,failed=0,lastError='';for(const recipient of recipients){try{await postWebhook(webhookUrl,token,{channel:'sms',sender,to:recipient.phone,name:recipient.name||'',message:campaign.message||campaign.body||''});sent++}catch(error){failed++;lastError=error.message}}campaign.sentCount=sent;campaign.failedCount=failed;campaign.lastError=lastError;campaign.status=failed?'Kısmi / Hatalı':'Gönderildi';campaign.sentAt=new Date().toISOString();campaign.updatedAt=campaign.sentAt;audit('SMS kampanyası gönderildi','smsCampaigns',campaign);await save(db);return json(res,200,{ok:failed===0,sent,failed,lastError});
  }
  if(url.pathname==='/api/finance/dues/generate'&&req.method==='POST'){
    const current=adminSession(req),role=current.role||'admin';if(!['admin','sayman'].includes(role))return json(res,403,{error:'Bu işlem için mali işler yetkisi gerekli'});
    const b=await body(req),tariff=(db.duePeriods||[]).find(x=>String(x.id)===String(b.tariffId||''));if(!tariff)return json(res,404,{error:'Aidat tarifesi bulunamadı'});
    const members=(db.members||[]).filter(duesEligibleMember).filter(m=>!tariff.group||normText(tariff.group)==='tüm üyeler'||normText(tariff.group)==='tum uyeler'||normText(memberCategory(m))===normText(tariff.group));
    const periods=tariffPeriods(tariff),batchId=`dues-batch-${Date.now()}-${randomBytes(3).toString('hex')}`,createdAt=new Date().toISOString();let created=0,skipped=0;
    for(const member of members)for(const period of periods){const exists=(db.dues||[]).some(d=>d.kind!=='entryFee'&&String(d.memberId||'')===String(member.id)&&String(d.period||'')===period);if(exists){skipped++;continue}const [year,month]=period.split('-').map(Number),day=Math.min(Number(tariff.dueDay)||15,28),dueDate=month?new Date(year,month-1,day).toISOString().slice(0,10):`${period}-12-31`;db.dues.unshift({id:`dues-${Date.now()}-${randomBytes(3).toString('hex')}`,memberId:member.id,member:member.name||member.email||'Üye',memberEmail:member.email||'',category:memberCategory(member),period,tariffId:tariff.id,batchId,amount:Number(tariff.amount)||0,paid:0,dueDate,status:'Beklemede',createdAt,updatedAt:createdAt});created++}
    audit('Aidat borçlandırması oluşturuldu','dues',{title:`${tariff.title||'Tarife'} · ${created} kayıt`});await save(db);return json(res,201,{ok:true,batchId:created?batchId:'',created,skipped,memberCount:members.length});
  }
  if(url.pathname==='/api/finance/dues/rollback'&&req.method==='POST'){
    const current=adminSession(req),role=current.role||'admin';if(!['admin','sayman'].includes(role))return json(res,403,{error:'Bu işlem için mali işler yetkisi gerekli'});
    const b=await body(req);let batchId=String(b.batchId||'');if(!batchId){const batches=(db.dues||[]).filter(d=>d.batchId&&(!b.tariffId||String(d.tariffId)===String(b.tariffId))).sort((a,c)=>new Date(c.createdAt||0)-new Date(a.createdAt||0));batchId=batches[0]?.batchId||''}
    const rows=batchId?(db.dues||[]).filter(d=>d.batchId===batchId):(db.dues||[]).filter(d=>b.tariffId&&String(d.tariffId)===String(b.tariffId));if(!rows.length)return json(res,404,{error:'Geri alınabilecek bir borçlandırma işlemi bulunamadı'});if(rows.some(d=>(Number(d.paid)||0)>0))return json(res,409,{error:'Bu işlemde tahsilat bulunan kayıtlar var. Önce ilgili ödemeleri geri alın'});const ids=new Set(rows.map(d=>d.id));db.dues=db.dues.filter(d=>!ids.has(d.id));audit('Aidat borçlandırması geri alındı','dues',{title:`${rows.length} kayıt`});await save(db);return json(res,200,{ok:true,batchId,removed:rows.length});
  }
  if(url.pathname==='/api/finance/dues/deduplicate'&&req.method==='POST'){
    const current=adminSession(req),role=current.role||'admin';if(!['admin','sayman'].includes(role))return json(res,403,{error:'Bu işlem için mali işler yetkisi gerekli'});
    const groups=new Map();for(const due of db.dues||[]){if(due.kind==='entryFee')continue;const key=`${due.memberId||due.memberEmail||due.member}|${due.period||''}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(due)}let removed=0,protectedGroups=0;const deleteIds=new Set();
    for(const rows of groups.values()){if(rows.length<2)continue;if(rows.some(row=>(Number(row.paid)||0)>0)){protectedGroups++;continue}rows.sort((a,c)=>(String(c.batchId||'').startsWith('dues-batch-')?1:0)-(String(a.batchId||'').startsWith('dues-batch-')?1:0)||new Date(c.updatedAt||c.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));for(const duplicate of rows.slice(1)){deleteIds.add(duplicate.id);removed++}}
    db.dues=db.dues.filter(due=>!deleteIds.has(due.id));if(removed){audit('Mükerrer aidat kayıtları temizlendi','dues',{title:`${removed} kayıt`});await save(db)}return json(res,200,{ok:true,removed,protectedGroups});
  }
  if(url.pathname==='/api/dashboard')return json(res,200,{counts:Object.fromEntries(collections.map(c=>[c,db[c].length])),published:db.content.filter(x=>x.status==='Yayında').length,activity:db.activity.slice(0,8)});
  if(url.pathname==='/api/upload'&&req.method==='POST'){const b=await body(req),m=String(b.data||'').match(/^data:([^;]+);base64,(.+)$/);if(!m)return json(res,400,{error:'Geçersiz dosya'});if(String(m[1]||'').startsWith('image/')&&m[1]!=='image/webp')return json(res,400,{error:'Görseller WebP olarak yüklenmelidir'});const allowed={'image/webp':'.webp','application/pdf':'.pdf','text/csv':'.csv'};const ext=allowed[m[1]];if(!ext)return json(res,400,{error:'Dosya türü desteklenmiyor'});const buf=Buffer.from(m[2],'base64');if(buf.length>8*1024*1024)return json(res,400,{error:'Dosya 8 MB sınırını aşıyor'});const name=`${Date.now()}-${randomBytes(5).toString('hex')}${ext}`;await writeFile(join(uploadDir,name),buf);return json(res,201,{url:`uploads/${name}`})}
  const parts=url.pathname.split('/').filter(Boolean),name=parts[1],id=parts[2];if(parts[0]!=='api'||!collections.includes(name))return json(res,404,{error:'Bulunamadı'});const current=adminSession(req),role=current.role||'admin';auditUser=current.user||USER;if(!roleAccess[role]?.has(name))return json(res,403,{error:'Bu modül için yetkiniz yok'});const list=db[name],isAuthorUser=x=>(x.systemRole||normalizedRole(x.role))==='author',safe=x=>['accounts','users'].includes(name)?Object.fromEntries(Object.entries(x||{}).filter(([k])=>!['passwordHash','salt'].includes(k))):x;
  if(req.method==='GET'){const rows=name==='users'&&role==='moderator'?list.filter(isAuthorUser):list;return json(res,200,id?safe(list.find(x=>x.id===id)||{}):rows.map(safe))}
  if(req.method==='POST'){const b=await body(req);if(name==='users'&&role==='moderator')b.role='Köşe Yazarı';const item={...b,id:`${name}-${Date.now()}-${randomBytes(3).toString('hex')}`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(name==='users'){const plain=String(b.password||'').trim()||tempPassword(),salt=randomBytes(16).toString('hex');item.email=String(item.email||item.username||'').trim().toLowerCase();item.username=item.email;item.passwordHash=scryptSync(plain,salt,32).toString('hex');item.salt=salt;item.systemRole=normalizedRole(b.role);item.role=roleLabel(item.systemRole);item.initialPassword=plain;delete item.password;if(item.systemRole==='author'&&!db.authors.some(a=>String(a.email||'').toLowerCase()===item.email)){db.authors.unshift({id:`authors-${Date.now()}-${randomBytes(3).toString('hex')}`,name:item.name||item.email,email:item.email,status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}}list.unshift(item);audit('Eklendi',name,item);await save(db);return json(res,201,safe(item))}
  const index=list.findIndex(x=>x.id===id);if(index<0)return json(res,404,{error:'Kayıt bulunamadı'});
  if(req.method==='PUT'){const b=await body(req);if(name==='users'&&role==='moderator'&&!isAuthorUser(list[index]))return json(res,403,{error:'Moderatör yalnızca köşe yazarı hesaplarını yönetebilir'});if(name==='users'){if(role==='moderator')b.role='Köşe Yazarı';if(b.role){b.systemRole=normalizedRole(b.role);b.role=roleLabel(b.systemRole)}if(b.email||b.username){b.email=String(b.email||b.username||'').trim().toLowerCase();b.username=b.email}if(b.password||b.autoPassword){const plain=String(b.password||'').trim()||tempPassword(),salt=randomBytes(16).toString('hex');b.passwordHash=scryptSync(plain,salt,32).toString('hex');b.salt=salt;b.initialPassword=plain;delete b.password;delete b.autoPassword}}list[index]={...list[index],...b,id,updatedAt:new Date().toISOString()};if(name==='applications')syncApplicationApproval(list[index]);if(name==='users'&&list[index].systemRole==='author'&&!db.authors.some(a=>String(a.email||'').toLowerCase()===String(list[index].email||'').toLowerCase()))db.authors.unshift({id:`authors-${Date.now()}-${randomBytes(3).toString('hex')}`,name:list[index].name||list[index].email,email:list[index].email,status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});audit('Güncellendi',name,list[index]);await save(db);return json(res,200,safe(list[index]))}
  if(req.method==='DELETE'){if(name==='users'&&role==='moderator'&&!isAuthorUser(list[index]))return json(res,403,{error:'Moderatör yalnızca köşe yazarı hesaplarını silebilir'});const [removed]=list.splice(index,1);audit('Silindi',name,removed);await save(db);return json(res,200,{ok:true})}
  return json(res,405,{error:'Yöntem desteklenmiyor'});
}

const httpServer=createServer(async(req,res)=>{try{const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);if(BASE_PATH&&(url.pathname===BASE_PATH||url.pathname.startsWith(`${BASE_PATH}/`)))url.pathname=url.pathname.slice(BASE_PATH.length)||'/';if(url.pathname.startsWith('/api/'))return await api(req,res,url);let path=decodeURIComponent(url.pathname);if(path==='/')path='/index.html';const file=normalize(join(root,path));if(!file.startsWith(root))throw new Error();const info=await stat(file);if(!info.isFile())throw new Error();const ext=extname(file);res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN'});const raw=await readFile(file);if(ext==='.html'){const boot=`<script>window.PEYZAJDER_BASE_PATH=${JSON.stringify(BASE_PATH)};window.PEYZAJDER_API_BASE=${JSON.stringify(withBase('/api'))};window.peyzajderApiPath=function(path){return window.PEYZAJDER_API_BASE+String(path||'').replace(/^\\/api/,'');};</script><link rel="stylesheet" href="${withBase('/logo-override.css')}">`;const html=raw.toString('utf8').replace('</head>',`${boot}</head>`);return res.end(html)}res.end(raw)}catch(e){console.error('PEYZAJDER_LOCAL_SERVER_ERROR',req.method,req.url,e);res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Sayfa bulunamadı')}}).listen(PORT,HOST,()=>console.log(`PEYZAJDER CMS: http://${HOST}:${PORT}${BASE_PATH||''}`));


for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>httpServer.close(()=>process.exit(0)));
