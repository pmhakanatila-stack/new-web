const form=document.querySelector('#contactForm');
const message=document.querySelector('#contactMessage');
form.addEventListener('submit',async e=>{
  e.preventDefault();
  message.textContent='Mesajınız gönderiliyor…';
  try{
    const payload=Object.fromEntries(new FormData(form));
    const res=await fetch((window.peyzajderApiPath?window.peyzajderApiPath('/api/public/contact'):'/api/public/contact'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Mesaj gönderilemedi');
    form.reset();
    message.textContent='Mesajınız yönetime iletildi. En kısa sürede değerlendirilecek.';
  }catch(err){
    message.textContent=err.message;
  }
});
