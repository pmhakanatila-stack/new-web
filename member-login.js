document.querySelector('#login').addEventListener('submit',async e=>{
  e.preventDefault();
  const error=document.querySelector('#error'),form=Object.fromEntries(new FormData(e.target));
  error.textContent='Giriş yapılıyor…';
  try{
    const apiPath=path=>window.peyzajderApiPath?window.peyzajderApiPath(path):path;
    const staff=await fetch(apiPath('/api/login'),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.email,password:form.password})});
    if(staff.ok){
      const result=await staff.json();
      const destination=result.role==='sayman'?'sayman.html':result.role==='moderator'?'moderator.html':result.role==='author'?'writer-panel.html':'admin.html';
      location.href=destination;
      return;
    }
    const member=await fetch(apiPath('/api/member/login'),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)}),result=await member.json();
    if(!member.ok)throw new Error(result.error||'E-posta veya şifre hatalı');
    location.href='member-portal.html';
  }catch(x){
    error.textContent=x.message;
  }
});
document.querySelector('#login button').insertAdjacentHTML('afterend','<a href="forgot-password.html" style="display:block;text-align:right;margin-top:12px;font-size:12px">Şifremi unuttum</a>');
