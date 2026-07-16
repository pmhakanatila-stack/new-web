const form=document.querySelector('#contactForm');
const message=document.querySelector('#contactMessage');
form?.addEventListener('submit',async event=>{
  event.preventDefault();
  message.textContent='Mesajınız gönderiliyor…';
  try{
    const payload=Object.fromEntries(new FormData(form));
    const endpoint=window.peyzajderApiPath?window.peyzajderApiPath('/api/public/contact'):'/api/public/contact';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Mesaj gönderilemedi');
    form.reset();
    message.textContent='Mesajınız yönetime iletildi. En kısa sürede değerlendirilecek.';
  }catch(error){
    message.textContent=error.message;
  }
});
