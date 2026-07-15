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
function stop(){return new Promise(resolve=>{if(!server||server.exitCode!==null)return resolve();server.once('exit',resolve);server.kill();setTimeout(resolve,1500).unref()})}

try{
  start();await ready();
  const home=await request('/api/public/home');if(!Array.isArray(home.data.haberler)||home.data.haberler.length<1)throw new Error('Başlangıç içerikleri yüklenmedi');
  const login=await request('/api/login',{method:'POST',body:{username:'smoke-admin',password:'Smoke!2026'}}),adminCookie=login.cookie;
  for(const collection of ['content','events','boards','members','firms','applications','dues','articles','sponsors','users','invitations','memberMessages']){const result=await request(`/api/${collection}`,{cookie:adminCookie});if(!Array.isArray(result.data))throw new Error(`${collection} liste değil`)}
  const title='UTF-8 doğrulama: Çığ, ıhlamur, öğrenci ve şüphe';
  const created=await request('/api/content',{method:'POST',cookie:adminCookie,body:{title,category:'haberler',summary:'Türkçe içerik',body:'İçerik metni',status:'Yayında'}});
  const item=await request(`/api/content/${created.data.id}`,{cookie:adminCookie});if(item.data.title!==title)throw new Error('Türkçe içerik korunmadı');
  const email=`smoke-${Date.now()}@example.test`;
  const registration=await request('/api/register',{method:'POST',body:{name:'Öykü Çağlar',email,password:'Deneme!2026',membershipType:'Kurumsal'}}),memberCookie=registration.cookie;
  const pending=await request('/api/member/me',{cookie:memberCookie});if(pending.data.membershipApproved||pending.data.panelType!=='application')throw new Error('Onaysız üye yanlış panele yönlendirildi');
  await request('/api/member/application',{method:'POST',cookie:memberCookie,body:{membershipType:'Kurumsal',organization:'Çınar Peyzaj',name:'form.png',data:'data:image/png;base64,iVBORw0KGgo='}});
  const applications=await request('/api/applications',{cookie:adminCookie}),application=applications.data.find(x=>x.email===email);if(!application)throw new Error('Üyelik başvurusu admin paneline düşmedi');
  await request(`/api/applications/${application.id}`,{method:'PUT',cookie:adminCookie,body:{status:'Onaylandı'}});
  const approved=await request('/api/member/me',{cookie:memberCookie});if(!approved.data.membershipApproved||approved.data.panelType!=='corporate')throw new Error('Kurumsal onay panel yönlendirmesi hatalı');
  await request('/api/invitations',{method:'POST',cookie:adminCookie,body:{title:'Kurumsal Üye Buluşması',audience:'Kurumsal',message:'Davet metni',status:'Yayında',date:'2026-09-01'}});
  const invited=await request('/api/member/me',{cookie:memberCookie});if(!invited.data.invitations?.some(x=>x.title==='Kurumsal Üye Buluşması'))throw new Error('Kurumsal davetiye üyeye ulaşmadı');
  await request('/api/member/messages',{method:'POST',cookie:memberCookie,body:{message:'Yönetim için deneme mesajı'}});
  const memberMessages=await request('/api/memberMessages',{cookie:adminCookie});if(!memberMessages.data.some(x=>x.email===email&&x.message.includes('deneme mesajı')))throw new Error('Üye mesajı yönetime ulaşmadı');
  const individualEmail=`individual-${Date.now()}@example.test`;
  const individualRegistration=await request('/api/register',{method:'POST',body:{name:'İpek Öğrenci',email:individualEmail,password:'Deneme!2026',membershipType:'Öğrenci'}}),individualCookie=individualRegistration.cookie;
  await request('/api/member/application',{method:'POST',cookie:individualCookie,body:{membershipType:'Öğrenci',name:'form.png',data:'data:image/png;base64,iVBORw0KGgo='}});
  const individualApplications=await request('/api/applications',{cookie:adminCookie}),individualApplication=individualApplications.data.find(x=>x.email===individualEmail);
  await request(`/api/applications/${individualApplication.id}`,{method:'PUT',cookie:adminCookie,body:{status:'Onaylandı'}});
  const individualApproved=await request('/api/member/me',{cookie:individualCookie});if(!individualApproved.data.membershipApproved||individualApproved.data.panelType!=='member'||individualApproved.data.isCorporate)throw new Error('Bireysel/öğrenci panel yönlendirmesi hatalı');
  await stop();start(port+1);await ready();
  const persisted=JSON.parse(await readFile(join(temp,'cms.json'),'utf8'));if(!persisted.content.some(x=>x.title===title))throw new Error('Sunucu yeniden başlayınca veri kayboldu');
  console.log('API, üyelik onayı, bireysel/kurumsal panel ayrımı, davetiye, mesajlaşma, Türkçe veri ve yeniden başlatma testi başarılı.');
}finally{await stop();await rm(temp,{recursive:true,force:true})}
