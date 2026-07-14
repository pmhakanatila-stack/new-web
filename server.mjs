import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';

const root=process.cwd(), dataDir=join(root,'data'), uploadDir=join(root,'uploads'), dbFile=join(dataDir,'cms.json');
const normalizedBase=String(process.env.PEYZAJDER_BASE_PATH||'').trim().replace(/^\/(.+)\/$/,'/$1');
const BASE_PATH=normalizedBase==='/'?'':normalizedBase;
const COOKIE_PATH=BASE_PATH||'/';
const PORT=Number(process.env.PORT||4173), HOST=process.env.HOST||'0.0.0.0', USER=process.env.PEYZAJDER_ADMIN_USER||'admin', PASSWORD=process.env.PEYZAJDER_ADMIN_PASSWORD||'Peyzajder!2026';
const sessions=new Map(),resetTokens=new Map();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const collections=['content','events','boards','members','firms','accounts','memberGroups','applications','dues','duePeriods','payments','businessLedger','decisions','subscribers','emailCampaigns','smsCampaigns','notifications','surveys','galleries','videos','articles','authors','publications','webinars','menus','sliders','popups','promoPanels','socialLinks','sponsors','sponsorCategories','jobPosts','bankAccounts','contactMessages','supportTickets','settings','users','modules'];
await mkdir(dataDir,{recursive:true});await mkdir(uploadDir,{recursive:true});

async function initialDb(){
  try{return JSON.parse((await readFile(dbFile,'utf8')).replace(/^\uFEFF/,''))}catch{}
  let migrated=[];try{const source=JSON.parse((await readFile(join(root,'content-data.json'),'utf8')).replace(/^\uFEFF/,''));migrated=source.pages.filter(x=>x.title&&!x.error).map((x,i)=>({id:`content-${i+1}`,title:x.title,category:x.category,status:'Yayında',summary:x.paragraphs?.[0]||'',body:(x.paragraphs||[]).join('\n\n'),image:x.images?.[0]?.src||'',sourceUrl:x.url,createdAt:new Date().toISOString()}))}catch{}
  const db={content:migrated,events:migrated.filter(x=>x.category==='etkinlikler').map(x=>({...x,id:`event-${x.id}`})),boards:[{id:'board-1',title:'Yönetim Kurulu',name:'Fulya AKFİDAN SEVİM',role:'Başkan',status:'Aktif',createdAt:new Date().toISOString()}],members:[],firms:[],activity:[]};for(const c of collections)db[c]=[];await save(db);return db;
}
async function save(db){await writeFile(dbFile,JSON.stringify(db,null,2),'utf8')}
let db=await initialDb();for(const c of collections)db[c]=[];db.activity=[];db.accounts=[];
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
if(!db.content.length){try{const source=JSON.parse((await readFile(join(root,'content-data.json'),'utf8')).replace(/^\uFEFF/,''));db.content=source.pages.filter(x=>x.title&&!x.error).map((x,i)=>({id:`content-${i+1}`,title:x.title,category:x.category,status:'Yayında',summary:x.paragraphs?.[0]||'',body:(x.paragraphs||[]).join('\n\n'),image:x.images?.[0]?.src||'',sourceUrl:x.url,createdAt:new Date().toISOString()}));db.events=db.content.filter(x=>x.category==='etkinlikler').map(x=>({...x,id:`event-${x.id}`}));await save(db)}catch{}}
const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(data))};
const withBase=p=>`${BASE_PATH}${p.startsWith('/')?p:`/${p}`}`;
const body=async req=>{const parts=[];for await(const c of req)parts.push(c);if(!parts.length)return{};return JSON.parse(Buffer.concat(parts).toString('utf8'))};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const session=req=>sessions.get(cookies(req).peyzajder_session);
const adminSession=req=>sessions.get(cookies(req).peyzajder_admin_session)||((sessions.get(cookies(req).peyzajder_session)?.type==='admin')?sessions.get(cookies(req).peyzajder_session):null);
const memberSession=req=>sessions.get(cookies(req).peyzajder_member_session)||((sessions.get(cookies(req).peyzajder_session)?.type==='member')?sessions.get(cookies(req).peyzajder_session):null);
const secureEqual=(a,b)=>{const ah=scryptSync(a,'peyzajder-local',32),bh=scryptSync(b,'peyzajder-local',32);return timingSafeEqual(ah,bh)};
let auditUser=USER;
const audit=(action,collection,item,user=auditUser)=>db.activity.unshift({id:randomBytes(6).toString('hex'),action,collection,item:item?.title||item?.name||item?.email||'',at:new Date().toISOString(),user});
const roleAccess={admin:new Set(collections),sayman:new Set(['dues','duePeriods','payments','businessLedger','bankAccounts','members','memberGroups','settings']),moderator:new Set(['content','events','publications','webinars','galleries','videos','articles','authors','sliders','jobPosts','firms','users']),author:new Set([])};
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
const settingValue=(keys,fallback='')=>{const wanted=keys.map(normText);const item=(db.settings||[]).find(x=>wanted.includes(normText(x.key||x.title)));return item?String(item.value??item.amount??''):fallback};
const memberCategory=m=>m.group||m.memberGroup||m.membershipType||m.memberType||m.category||'Genel';
const isCorporateMember=(account,application)=>normText(account.memberType||account.membershipType||account.group||application?.membershipType||'').includes('kurumsal')||!!(application.organization);
async function saveWebpDataUrl(data,prefix){
  const m=String(data||'').match(/^data:image\/webp;base64,(.+)$/);
  if(!m)return String(data||'');
  const buf=Buffer.from(m[1],'base64');
  if(buf.length>4*1024*1024)throw new Error('Görsel 4 MB sınırını aşıyor');
  const filename=`${prefix}-${Date.now()}-${randomBytes(3).toString('hex')}.webp`;
  await writeFile(join(uploadDir,filename),buf);
  return `uploads/${filename}`;
}
function memberFinance(account){
  const member=(db.members||[]).find(x=>x.accountId===account.id)||account;
  const category=memberCategory(member);
  const nowYear=new Date().getFullYear();
  const active=x=>!['pasif','taslak','arşiv','arsiv'].includes(normText(x.status||'Aktif'));
  const tariffs=(db.duePeriods||[]).filter(active).filter(t=>!t.group||normText(t.group)==='tüm üyeler'||normText(t.group)===normText(category)).sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0)||new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));
  const currentTariff=tariffs.find(t=>(Number(t.year)||nowYear)===nowYear)||tariffs[0]||null;
  const group=(db.memberGroups||[]).find(g=>normText(g.title||g.name)===normText(category));
  const fallbackEntryFee=Number(String(settingValue(['membershipEntryFee','uyelikGirisBedeli','üyelik giriş bedeli','girisBedeli'],'0')).replace(',','.'))||0;
  const entryFee=Number(String(group?.entryFee??group?.fee??fallbackEntryFee).replace(',','.'))||0;
  return{category,entryFee,currentTariff:currentTariff?{title:currentTariff.title||'',group:currentTariff.group||'',frequency:currentTariff.frequency||'',year:currentTariff.year||'',amount:Number(currentTariff.amount)||0}:null};
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
  const clean=v=>String(v||'').replace(/var\s+approachingEvent;/gi,'').replace(/var\s+content_slider;/gi,'').replace(/google-site-verification=[^\s]+/gi,'').replace(/\s+/g,' ').trim();
  const body=clean(x.body||x.description||'');
  return{id:x.id,title:clean(x.title||x.name||''),category:x.category||'',type,summary:clean(x.summary||x.description||body.slice(0,220)),body,image:x.image||x.cover||'',date:x.date||x.createdAt||'',author:x.author||'',sourceUrl:x.sourceUrl||''};
}

async function api(req,res,url){
  if(url.pathname==='/api/public/home'&&req.method==='GET'){
    const cleanText=v=>String(v||'').replace(/var\s+approachingEvent;/gi,'').replace(/var\s+content_slider;/gi,'').replace(/google-site-verification=[^\s]+/gi,'').replace(/Çağrı Merkezi\s*\d[\d\s]+/gi,'').replace(/Çağrı Merkezi\s*\d[\d\s]+/gi,'').replace(/YÖNETİM Başkanın Mesajları/gi,'').replace(/YÖNETİM Başkanın Mesajları/gi,'').replace(/DERNEK ve ÜYELER Hakkımızda Banka Hesap Numaralarımız/gi,'').replace(/DERNEK ve ÜYELER HakkımÄÂ±zda Banka Hesap NumaralarımÄÂ±z/gi,'').replace(/DERNEK[\s\S]{0,120}Banka Hesap Numaralar[ıiı]*m[ıiı]*z/gi,'').replace(/Adres\s*:\s*Alaaddinbey Mah\.[\s\S]*Bursa/gi,'').replace(/E-Posta\s*:\s*bilgi@peyzajder\.org/gi,'').replace(/Güncel haberler, duyurular ve ihalelerden anında haberdar ol/gi,'').replace(/Bu internet sitesinde sizlere daha iyi hizmet sunulabilmesi için çerezler kullanılmaktadır\./gi,'').replace(/\s+/g,' ').trim();
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
      ...[...(db.events||[]),...content.filter(x=>x.category==='etkinlikler')].filter(visible).map(x=>({...publicItem(x),type:'Etkinlik'}))
    ].filter(x=>x.title&&!excludedSliderIds.has(String(x.id))).sort(byDate);
    const sliderItems=sliderPool.slice(0,5);
    const settings=Object.fromEntries((db.settings||[]).filter(visible).map(x=>[String(x.key||x.title||''),String(x.value||'')]).filter(([k,v])=>k&&v));
    return json(res,200,{
      settings,
      sliders:sliderItems,
      haberler:content.filter(x=>x.category==='haberler').sort(byDate).slice(0,4).map(publicItem),
      etkinlikler:[...(db.events||[]),...content.filter(x=>x.category==='etkinlikler')].filter(visible).sort(byDate).slice(0,4).map(publicItem),
      duyurular:content.filter(x=>x.category==='duyurular').sort(byDate).slice(0,4).map(publicItem),
      articles:editorial,
      editorial
    })
  }
  if(url.pathname==='/api/public/boards'&&req.method==='GET'){const publicBoards=db.boards.filter(x=>x.status!=='Pasif').sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)).map(({id,title,name,role,term,photo,bio,status})=>({id,title,name,role,term,photo,bio,status}));return json(res,200,publicBoards)}
  if(url.pathname==='/api/public/item'&&req.method==='GET'){
    const id=String(url.searchParams.get('id')||'');
    const visible=x=>!['Pasif','Taslak','Arşiv','Arsiv'].includes(String(x.status||'Yayında'));
    const sources=[
      ...(db.content||[]).map(x=>({...x,type:x.category==='duyurular'?'Duyuru':x.category==='etkinlikler'?'Etkinlik':'Haber'})),
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
    const hidden=new Set(['admin','yönetici','yonetici','moderator','moderatör','sayman','muhasebe','editör','editor','yazar']);
    return json(res,200,(db.memberGroups||[]).filter(active).filter(x=>!hidden.has(normText(x.title||x.name))).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)||String(a.title||a.name||'').localeCompare(String(b.title||b.name||''),'tr')).map(x=>({id:x.id,title:x.title||x.name||'',entryFee:Number(x.entryFee)||0,description:x.description||''})));
  }
  if(url.pathname==='/api/public/firms'&&req.method==='GET'){
    const active=x=>['aktif','yayında','yayinda'].includes(normText(x.status||'Aktif'));
    return json(res,200,(db.firms||[]).filter(active).map(x=>({
      id:x.id,name:x.name||'',logo:x.logo||x.image||'',city:x.city||'',address:x.address||'',phone:x.phone||'',email:x.email||'',website:x.website||'',activities:Array.isArray(x.activities)?x.activities:String(x.activities||x.specialty||'').split(/[,;\n]/).map(y=>y.trim()).filter(Boolean),description:x.description||''
    })));
  }
  if(url.pathname==='/api/public/editorials'&&req.method==='GET'){const safe=x=>['aktif','yayında','yayinda'].includes(String(x.status||'Yayında').toLocaleLowerCase('tr'));const byDate=(a,b)=>new Date(b.date||b.updatedAt||b.createdAt||0)-new Date(a.date||a.updatedAt||a.createdAt||0);const authors=db.authors||[];return json(res,200,(db.articles||[]).filter(safe).sort(byDate).map(x=>{const a=authors.find(y=>String(y.email||'').toLowerCase()===String(x.authorEmail||'').toLowerCase()||String(y.name||'')===String(x.author||''));return{id:x.id,title:x.title||'',summary:x.summary||String(x.body||'').slice(0,180),body:x.body||'',image:x.image||'',date:x.date||x.createdAt||'',author:x.author||a.name||'PEYZAJDER yazarı',authorEmail:x.authorEmail||a.email||'',authorPhoto:a.photo||'',authorBio:a.description||'',status:x.status||''}}))}
  if(url.pathname==='/api/public/competitions'&&req.method==='GET'){try{const r=await fetch('https://peyzajder.com/api/v1/public/competitions',{headers:{'Accept':'application/json'}}),d=await r.json();return json(res,r.ok?200:r.status,d)}catch(e){return json(res,200,{success:false,error:'Yarışma platformuna şu anda ulaşılamadı',data:{active_competitions:[],result_competitions:[],completed_competitions:[]}})}}
  if(url.pathname==='/api/public/contact'&&req.method==='POST'){const b=await body(req),name=String(b.name||'').trim(),email=String(b.email||'').trim(),message=String(b.message||'').trim();if(!name||!email.includes('@')||!message)return json(res,400,{error:'Ad soyad, geçerli e-posta ve mesaj alanı gerekli'});const item={id:`contactMessages-${Date.now()}-${randomBytes(3).toString('hex')}`,name,email,phone:String(b.phone||'').trim(),subject:String(b.subject||'İletişim'),message,status:'Yeni',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),source:'İletişim sayfası'};db.contactMessages.unshift(item);audit('Yeni mesaj','contactMessages',item);await save(db);return json(res,201,{ok:true})}
  if(url.pathname==='/api/register'&&req.method==='POST'){const b=await body(req),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||''),membershipType=String(b.membershipType||'Bireysel').trim();if(!email.includes('@')||password.length<8)return json(res,400,{error:'Geçerli e-posta ve en az 8 karakterli şifre gerekli'});if(db.accounts.some(x=>x.email===email))return json(res,409,{error:'Bu e-posta ile daha önce hesap oluşturulmuş'});const salt=randomBytes(16).toString('hex'),account={id:`account-${Date.now()}`,name:String(b.name||'').trim(),email,phone:String(b.phone||''),city:String(b.city||''),profession:String(b.profession||''),membershipType,group:membershipType,passwordHash:scryptSync(password,salt,32).toString('hex'),salt,role:'Site Üyesi',membershipStatus:'Başvuru yapılmadı',createdAt:new Date().toISOString()};db.accounts.push(account);db.members.unshift({id:`member-${account.id}`,accountId:account.id,name:account.name,email:account.email,phone:account.phone,city:account.city,profession:account.profession,membershipType,group:membershipType,status:'Site Üyesi',membershipStatus:account.membershipStatus,createdAt:account.createdAt});const token=randomBytes(32).toString('hex');sessions.set(token,{type:'member',accountId:account.id,user:account.email,created:Date.now()});await save(db);return json(res,201,{ok:true,membershipStatus:account.membershipStatus,redirect:'member-portal.html?created=1'},{'Set-Cookie':`peyzajder_member_session=${token}; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=28800`})}
  if(url.pathname==='/api/member/login'&&req.method==='POST'){const b=await body(req),email=String(b.email||'').trim().toLowerCase(),account=db.accounts.find(x=>x.email===email);if(!account)return json(res,401,{error:'E-posta veya şifre hatalı'});const candidate=scryptSync(String(b.password||''),account.salt,32),stored=Buffer.from(account.passwordHash,'hex');if(stored.length!==candidate.length||!timingSafeEqual(stored,candidate))return json(res,401,{error:'E-posta veya şifre hatalı'});const token=randomBytes(32).toString('hex');sessions.set(token,{type:'member',accountId:account.id,user:account.email,created:Date.now()});return json(res,200,{ok:true},{'Set-Cookie':`peyzajder_member_session=${token}; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=28800`})}
  if(url.pathname==='/api/member/forgot'&&req.method==='POST'){const b=await body(req),email=String(b.email||'').trim().toLowerCase(),account=db.accounts.find(x=>x.email===email);if(!account)return json(res,200,{ok:true,message:'Hesap mevcutsa sıfırlama bağlantısı oluşturuldu'});const token=randomBytes(32).toString('hex');resetTokens.set(token,{accountId:account.id,expires:Date.now()+30*60*1000});return json(res,200,{ok:true,message:'Şifre sıfırlama bağlantınız hazır',resetUrl:`reset-password.html?token=${token}`})}
  if(url.pathname==='/api/member/reset'&&req.method==='POST'){const b=await body(req),entry=resetTokens.get(String(b.token||'')),password=String(b.password||'');if(!entry||entry.expires<Date.now())return json(res,400,{error:'Bağlantı geçersiz veya süresi dolmuş'});if(password.length<8)return json(res,400,{error:'Şifre en az 8 karakter olmalıdır'});const account=db.accounts.find(x=>x.id===entry.accountId);if(!account)return json(res,400,{error:'Hesap bulunamadı'});const salt=randomBytes(16).toString('hex');account.salt=salt;account.passwordHash=scryptSync(password,salt,32).toString('hex');account.updatedAt=new Date().toISOString();resetTokens.delete(String(b.token));await save(db);return json(res,200,{ok:true})}
  if(url.pathname==='/api/member/logout'){const token=cookies(req).peyzajder_member_session;sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':[`peyzajder_member_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`,`peyzajder_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`]})}
  if(url.pathname==='/api/member/me'){const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,401,{error:'Üye hesabı bulunamadı'});const application=db.applications.find(x=>x.accountId===a.id)||null,company=db.firms.find(x=>x.accountId===a.id)||null;return json(res,200,{id:a.id,name:a.name,email:a.email,phone:a.phone,city:a.city,profession:a.profession,role:a.role,membershipType:a.membershipType||a.group||application?.membershipType||'',membershipStatus:a.membershipStatus,isCorporate:isCorporateMember(a,application),finance:memberFinance(a),application,company})}
  if(url.pathname==='/api/member/company'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});
    const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,401,{error:'Üye hesabı bulunamadı'});
    const application=db.applications.find(x=>x.accountId===a.id)||null;
    if(req.method==='GET')return json(res,200,db.firms.find(x=>x.accountId===a.id)||null);
    if(req.method==='PUT'||req.method==='POST'){
      if(!isCorporateMember(a,application))return json(res,403,{error:'Firma kartı için kurumsal üyelik başvurusu gereklidir'});
      const b=await body(req);
      const activities=Array.isArray(b.activities)?b.activities.map(x=>String(x).trim()).filter(Boolean):String(b.activities||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
      let item=db.firms.find(x=>x.accountId===a.id);
      if(!item){item={id:`firms-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,createdAt:new Date().toISOString()};db.firms.unshift(item)}
      const logo=await saveWebpDataUrl(b.logo||b.image,`firm-logo-${a.id}`);
      Object.assign(item,{name:String(b.name||'').trim(),logo:logo||item.logo||'',image:logo||item.image||'',email:String(b.email||a.email||'').trim(),phone:String(b.phone||'').trim(),website:String(b.website||'').trim(),city:String(b.city||'').trim(),address:String(b.address||'').trim(),activities,specialty:activities.join(', '),description:String(b.description||'').trim(),status:'Onay bekliyor',updatedAt:new Date().toISOString()});
      if(!item.name)return json(res,400,{error:'Firma adı gerekli'});
      audit('Firma kartı onaya gönderildi','firms',item);await save(db);return json(res,200,item);
    }
  }
  if(url.pathname==='/api/member/jobs'){
    const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});
    const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,401,{error:'Üye hesabı bulunamadı'});
    const application=db.applications.find(x=>x.accountId===a.id)||null;
    if(!isCorporateMember(a,application))return json(res,403,{error:'İlan talebi için kurumsal üyelik başvurusu gereklidir'});
    if(req.method==='GET')return json(res,200,(db.jobPosts||[]).filter(x=>x.accountId===a.id));
    if(req.method==='POST'){
      const b=await body(req),firm=db.firms.find(x=>x.accountId===a.id);
      const item={id:`jobPosts-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,company:String(b.company||firm?.name||'').trim(),title:String(b.title||'').trim(),type:String(b.type||'Eleman arama'),location:String(b.location||firm?.city||'').trim(),url:String(b.url||'').trim(),endDate:String(b.endDate||'').trim(),description:String(b.description||'').trim(),status:'Onay bekliyor',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      if(!item.title||!item.company)return json(res,400,{error:'İlan başlığı ve firma adı gerekli'});
      db.jobPosts.unshift(item);audit('Firma ilanı onaya gönderildi','jobPosts',item);await save(db);return json(res,201,item);
    }
  }
  if(url.pathname==='/api/member/profile'&&req.method==='PUT'){const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});const a=db.accounts.find(x=>x.id===s.accountId);if(!a)return json(res,404,{error:'Üye hesabı bulunamadı'});const b=await body(req);a.name=String(b.name||'').trim();a.phone=String(b.phone||'').trim();a.city=String(b.city||'').trim();a.profession=String(b.profession||'').trim();if(!a.name)return json(res,400,{error:'Ad soyad gerekli'});a.updatedAt=new Date().toISOString();const member=db.members.find(x=>x.accountId===a.id);if(member){member.name=a.name;member.phone=a.phone;member.city=a.city;member.profession=a.profession;member.updatedAt=a.updatedAt}const app=db.applications.find(x=>x.accountId===a.id);if(app){app.name=a.name;app.phone=a.phone;app.city=a.city;app.profession=a.profession;app.updatedAt=a.updatedAt}await save(db);return json(res,200,{ok:true,name:a.name,phone:a.phone,city:a.city,profession:a.profession})}
  if(url.pathname==='/api/member/application'&&req.method==='POST'){const s=memberSession(req);if(!s)return json(res,401,{error:'Üye girişi gerekli'});const a=db.accounts.find(x=>x.id===s.accountId),b=await body(req),m=String(b.data||'').match(/^data:([^;]+);base64,(.+)$/),allowed={'application/pdf':'.pdf','image/jpeg':'.jpg','image/png':'.png'};if(!m||!allowed[m[1]])return json(res,400,{error:'PDF, JPG veya PNG dosyası yükleyin'});const buf=Buffer.from(m[2],'base64');if(buf.length>10*1024*1024)return json(res,400,{error:'Dosya 10 MB sınırını aşıyor'});const filename=`signed-application-${a.id}-${Date.now()}${allowed[m[1]]}`;await writeFile(join(uploadDir,filename),buf);let application=db.applications.find(x=>x.accountId===a.id);if(!application){application={id:`applications-${Date.now()}-${randomBytes(3).toString('hex')}`,accountId:a.id,name:a.name,email:a.email,phone:a.phone,profession:a.profession,city:a.city,createdAt:new Date().toISOString()};db.applications.unshift(application)}application.membershipType=String(b.membershipType||application.membershipType||'Bireysel');application.organization=String(b.organization||application.organization||'');application.documentUrl=`uploads/${filename}`;application.documentName=String(b.name||filename);application.status='İmzalı form yüklendi';application.updatedAt=new Date().toISOString();a.membershipStatus='İncelemede';a.membershipType=application.membershipType;if(application.organization)a.organization=application.organization;const member=db.members.find(x=>x.accountId===a.id);if(member){member.membershipType=application.membershipType;member.organization=application.organization;member.membershipStatus='İncelemede';member.status='Site Üyesi Â· Dernek başvurusu incelemede';member.applicationDocument=application.documentUrl;member.updatedAt=new Date().toISOString()}audit('İmzalı başvuru yüklendi','applications',application);await save(db);return json(res,201,{ok:true,status:a.membershipStatus,documentUrl:application.documentUrl})}
  if(url.pathname==='/api/login'&&req.method==='POST'){const b=await body(req),login=String(b.username||'').trim().toLowerCase();let user,role;if(login===USER&&secureEqual(b.password||'',PASSWORD)){user=USER;role='admin'}else{const staff=db.users.find(x=>String(x.email||x.username||'').toLowerCase()===login&&x.status!=='Pasif');if(staff?.passwordHash){const candidate=scryptSync(String(b.password||''),staff.salt,32),stored=Buffer.from(staff?.passwordHash,'hex');if(stored.length===candidate.length&&timingSafeEqual(stored,candidate)){user=staff.email||staff.username;role=staff.systemRole||normalizedRole(staff.role)}}}if(user){const token=randomBytes(32).toString('hex');sessions.set(token,{type:'admin',role,user,created:Date.now()});return json(res,200,{ok:true,user,role},{'Set-Cookie':`peyzajder_admin_session=${token}; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=28800`})}return json(res,401,{error:'Kullanıcı adı veya şifre hatalı'})}
  if(url.pathname==='/api/logout'){const token=cookies(req).peyzajder_admin_session;sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':[`peyzajder_admin_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`,`peyzajder_session=; HttpOnly; SameSite=Strict; Path=${COOKIE_PATH}; Max-Age=0`]})}
  if(url.pathname==='/api/author/me'){const s=adminSession(req);if(!s||s.role!=='author')return json(res,401,{error:'Köşe yazarı girişi gerekli'});const u=db.users.find(x=>String(x.email||x.username||'').toLowerCase()===String(s.user||'').toLowerCase());return json(res,200,{user:s.user,role:s.role,name:u?.name||s.user,email:u?.email||s.user})}
  if(url.pathname.startsWith('/api/author/articles')){const s=adminSession(req);if(!s||s.role!=='author')return json(res,401,{error:'Köşe yazarı girişi gerekli'});const u=db.users.find(x=>String(x.email||x.username||'').toLowerCase()===String(s.user||'').toLowerCase()),email=String(u?.email||s.user||'').toLowerCase(),name=u?.name||s.user,parts=url.pathname.split('/').filter(Boolean),id=parts[3],mine=x=>String(x.authorEmail||'').toLowerCase()===email||String(x.author||'')===name;if(req.method==='GET')return json(res,200,(db.articles||[]).filter(mine));if(req.method==='POST'&&!id){const b=await body(req);const item={id:`articles-${Date.now()}-${randomBytes(3).toString('hex')}`,title:String(b.title||'').trim(),summary:String(b.summary||'').trim(),body:String(b.body||'').trim(),image:String(b.image||'').trim(),author:name,authorEmail:email,date:new Date().toISOString().slice(0,10),status:'Beklemede',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!item.title||!item.body)return json(res,400,{error:'Başlık ve yazı metni gerekli'});db.articles.unshift(item);if(!db.authors.some(a=>String(a.email||'').toLowerCase()===email))db.authors.unshift({id:`authors-${Date.now()}-${randomBytes(3).toString('hex')}`,name,email,status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});audit('Yazar yazısı gönderdi','articles',item);await save(db);return json(res,201,item)}const index=(db.articles||[]).findIndex(x=>x.id===id);if(index<0||!mine(db.articles[index]))return json(res,404,{error:'Yazı bulunamadı'});if(req.method==='PUT'){const b=await body(req),item=db.articles[index];item.title=String(b.title||'').trim();item.summary=String(b.summary||'').trim();item.body=String(b.body||'').trim();item.image=String(b.image||'').trim();if(!item.title||!item.body)return json(res,400,{error:'Başlık ve yazı metni gerekli'});item.status='Beklemede';item.updatedAt=new Date().toISOString();audit('Yazar yazısını güncelledi','articles',item);await save(db);return json(res,200,item)}if(req.method==='DELETE'){const [removed]=db.articles.splice(index,1);audit('Yazar yazısını sildi','articles',removed);await save(db);return json(res,200,{ok:true})}return json(res,405,{error:'Yöntem desteklenmiyor'})}
  if(!adminSession(req))return json(res,401,{error:'Yönetici oturumu gerekli'});
  if(url.pathname==='/api/me'){const s=adminSession(req);return json(res,200,{user:s.user,role:s.role||'admin'})}
  if(url.pathname==='/api/dashboard')return json(res,200,{counts:Object.fromEntries(collections.map(c=>[c,db[c].length])),published:db.content.filter(x=>x.status==='Yayında').length,activity:db.activity.slice(0,8)});
  if(url.pathname==='/api/upload'&&req.method==='POST'){const b=await body(req),m=String(b.data||'').match(/^data:([^;]+);base64,(.+)$/);if(!m)return json(res,400,{error:'Geçersiz dosya'});if(String(m[1]||'').startsWith('image/')&&m[1]!=='image/webp')return json(res,400,{error:'Görseller WebP olarak yüklenmelidir'});const allowed={'image/webp':'.webp','application/pdf':'.pdf','text/csv':'.csv'};const ext=allowed[m[1]];if(!ext)return json(res,400,{error:'Dosya türü desteklenmiyor'});const buf=Buffer.from(m[2],'base64');if(buf.length>8*1024*1024)return json(res,400,{error:'Dosya 8 MB sınırını aşıyor'});const name=`${Date.now()}-${randomBytes(5).toString('hex')}${ext}`;await writeFile(join(uploadDir,name),buf);return json(res,201,{url:`uploads/${name}`})}
  const parts=url.pathname.split('/').filter(Boolean),name=parts[1],id=parts[2];if(parts[0]!=='api'||!collections.includes(name))return json(res,404,{error:'Bulunamadı'});const current=adminSession(req),role=current.role||'admin';auditUser=current.user||USER;if(!roleAccess[role]?.has(name))return json(res,403,{error:'Bu modül için yetkiniz yok'});const list=db[name],isAuthorUser=x=>(x.systemRole||normalizedRole(x.role))==='author',safe=x=>['accounts','users'].includes(name)?Object.fromEntries(Object.entries(x||{}).filter(([k])=>!['passwordHash','salt'].includes(k))):x;
  if(req.method==='GET'){const rows=name==='users'&&role==='moderator'?list.filter(isAuthorUser):list;return json(res,200,id?safe(list.find(x=>x.id===id)||{}):rows.map(safe))}
  if(req.method==='POST'){const b=await body(req);if(name==='users'&&role==='moderator')b.role='Köşe Yazarı';const item={...b,id:`${name}-${Date.now()}-${randomBytes(3).toString('hex')}`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(name==='users'){const plain=String(b.password||'').trim()||tempPassword(),salt=randomBytes(16).toString('hex');item.email=String(item.email||item.username||'').trim().toLowerCase();item.username=item.email;item.passwordHash=scryptSync(plain,salt,32).toString('hex');item.salt=salt;item.systemRole=normalizedRole(b.role);item.role=roleLabel(item.systemRole);item.initialPassword=plain;delete item.password;if(item.systemRole==='author'&&!db.authors.some(a=>String(a.email||'').toLowerCase()===item.email)){db.authors.unshift({id:`authors-${Date.now()}-${randomBytes(3).toString('hex')}`,name:item.name||item.email,email:item.email,status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}}list.unshift(item);audit('Eklendi',name,item);await save(db);return json(res,201,safe(item))}
  const index=list.findIndex(x=>x.id===id);if(index<0)return json(res,404,{error:'Kayıt bulunamadı'});
  if(req.method==='PUT'){const b=await body(req);if(name==='users'&&role==='moderator'&&!isAuthorUser(list[index]))return json(res,403,{error:'Moderatör yalnızca köşe yazarı hesaplarını yönetebilir'});if(name==='users'){if(role==='moderator')b.role='Köşe Yazarı';if(b.role){b.systemRole=normalizedRole(b.role);b.role=roleLabel(b.systemRole)}if(b.email||b.username){b.email=String(b.email||b.username||'').trim().toLowerCase();b.username=b.email}if(b.password||b.autoPassword){const plain=String(b.password||'').trim()||tempPassword(),salt=randomBytes(16).toString('hex');b.passwordHash=scryptSync(plain,salt,32).toString('hex');b.salt=salt;b.initialPassword=plain;delete b.password;delete b.autoPassword}}list[index]={...list[index],...b,id,updatedAt:new Date().toISOString()};if(name==='users'&&list[index].systemRole==='author'&&!db.authors.some(a=>String(a.email||'').toLowerCase()===String(list[index].email||'').toLowerCase()))db.authors.unshift({id:`authors-${Date.now()}-${randomBytes(3).toString('hex')}`,name:list[index].name||list[index].email,email:list[index].email,status:'Aktif',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});audit('Güncellendi',name,list[index]);await save(db);return json(res,200,safe(list[index]))}
  if(req.method==='DELETE'){if(name==='users'&&role==='moderator'&&!isAuthorUser(list[index]))return json(res,403,{error:'Moderatör yalnızca köşe yazarı hesaplarını silebilir'});const [removed]=list.splice(index,1);audit('Silindi',name,removed);await save(db);return json(res,200,{ok:true})}
  return json(res,405,{error:'Yöntem desteklenmiyor'});
}

createServer(async(req,res)=>{try{const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);if(BASE_PATH&&(url.pathname===BASE_PATH||url.pathname.startsWith(`${BASE_PATH}/`)))url.pathname=url.pathname.slice(BASE_PATH.length)||'/';if(url.pathname.startsWith('/api/'))return await api(req,res,url);let path=decodeURIComponent(url.pathname);if(path==='/')path='/index.html';const file=normalize(join(root,path));if(!file.startsWith(root))throw new Error();const info=await stat(file);if(!info.isFile())throw new Error();const ext=extname(file);res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN'});const raw=await readFile(file);if(ext==='.html'){const boot=`<script>window.PEYZAJDER_BASE_PATH=${JSON.stringify(BASE_PATH)};window.PEYZAJDER_API_BASE=${JSON.stringify(withBase('/api'))};window.peyzajderApiPath=function(path){return window.PEYZAJDER_API_BASE+String(path||'').replace(/^\\/api/,'');};</script><link rel="stylesheet" href="${withBase('/logo-override.css')}">`;const html=raw.toString('utf8').replace('</head>',`${boot}</head>`);return res.end(html)}res.end(raw)}catch(e){console.error('PEYZAJDER_LOCAL_SERVER_ERROR',req.method,req.url,e);res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Sayfa bulunamadı')}}).listen(PORT,HOST,()=>console.log(`PEYZAJDER CMS: http://${HOST}:${PORT}${BASE_PATH||''}`));

