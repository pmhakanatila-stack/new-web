const form=document.querySelector('#memberForm');
const message=document.querySelector('#message');
const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;

async function loadMemberTypes(){
  const select=document.querySelector('#membershipType');
  const fee=document.querySelector('#memberTypeFee');
  if(!select)return;
  try{
    const types=await fetch(apiPath('/api/public/member-types'),{cache:'no-store'}).then(r=>r.json());
    if(Array.isArray(types)&&types.length){
      select.innerHTML=types.map(t=>`<option value="${String(t.title||'').replace(/"/g,'&quot;')}">${t.title}</option>`).join('');
      const renderFee=()=>{
        const current=types.find(t=>t.title===select.value);
        if(fee)fee.textContent=`Tek seferlik giriş bedeli: ${(Number(current.entryFee)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} ₺`;
      };
      select.addEventListener('change',renderFee);
      renderFee();
    }
  }catch{if(fee)fee.textContent='Giriş bedeli üye panelinde gösterilecektir.'}
}
loadMemberTypes();

form.addEventListener('submit',async e=>{
  e.preventDefault();
  message.textContent='Hesabınız oluşturuluyor…';
  const data=Object.fromEntries(new FormData(form));
  try{
    const r=await fetch(apiPath('/api/register'),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'same-origin',
      body:JSON.stringify(data)
    });
    const result=await r.json();
    if(!r.ok)throw new Error(result.error||'Hesap oluşturulamadı');
    message.textContent='Hesabınız oluşturuldu. Üye paneline yönlendiriliyorsunuz…';
    setTimeout(()=>location.href=result.redirect||'member-portal.html?created=1',650);
  }catch(err){
    message.textContent=err.message;
  }
});
