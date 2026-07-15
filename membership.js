const form=document.querySelector('#memberForm');
const message=document.querySelector('#message');
const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
const nameInput=form.elements.name;
const emailInput=form.elements.email;
const phoneInput=form.elements.phone;
const passwordInput=form.elements.password;

function validateRegistration(){
  const fullName=nameInput.value.trim().replace(/\s+/g,' ');
  const phone=phoneInput.value.trim();
  const phoneDigits=phone.replace(/\D/g,'');
  nameInput.setCustomValidity(fullName.split(' ').filter(Boolean).length<2?'Lütfen adınızı ve soyadınızı birlikte yazın.':'');
  emailInput.setCustomValidity(emailInput.validity.typeMismatch?'Geçerli bir e-posta adresi yazın.':'');
  phoneInput.setCustomValidity(!/^[0-9+()\s-]+$/.test(phone)||phoneDigits.length<10||phoneDigits.length>15?'Geçerli bir telefon numarası yazın.':'');
  passwordInput.setCustomValidity(passwordInput.value.length<8?'Şifre en az 8 karakter olmalıdır.':'');
  return form.checkValidity();
}

phoneInput.addEventListener('input',()=>{
  phoneInput.value=phoneInput.value.replace(/[^0-9+()\s-]/g,'');
  validateRegistration();
});
[nameInput,emailInput,passwordInput].forEach(input=>input.addEventListener('input',validateRegistration));

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
  if(!validateRegistration()){
    form.reportValidity();
    message.textContent='Lütfen zorunlu alanları doğru biçimde doldurun.';
    return;
  }
  message.textContent='Hesabınız oluşturuluyor…';
  const data=Object.fromEntries(new FormData(form));
  try{
    const r=await fetch(apiPath('/api/register'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});
    const result=await r.json();
    if(!r.ok)throw new Error(result.error||'Hesap oluşturulamadı');
    message.textContent='Hesabınız oluşturuldu. Üye paneline yönlendiriliyorsunuz…';
    setTimeout(()=>location.href=result.redirect||'member-portal.html?created=1',650);
  }catch(err){message.textContent=err.message;}
});
