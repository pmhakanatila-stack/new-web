(function(){
  function openAdminView(view){
    if(!view)return;
    const button=document.querySelector(`#nav [data-view="${CSS.escape(view)}"]`);
    document.querySelector('#nav .active').classList.remove('active');
    button.classList.add('active');
    const titleMap={
      dashboard:'Genel bakış',content:'İçerikler',events:'Etkinlikler',publications:'Yayınlar',webinars:'Webinarlar',
      galleries:'Foto galeriler',videos:'Videolar',articles:'Köşe yazıları',authors:'Köşe yazarları',members:'Tüm üyeler',
      memberGroups:'Üye grupları',applications:'Üyelik başvuruları',boards:'Kurullar ve üyeleri',firms:'Firma rehberi',
      dues:'Aidat kayıtları',duePeriods:'Aidat tanımları',payments:'Ödemeler',businessLedger:'İşletme hesabı',
      decisions:'Karar defteri',subscribers:'E-bülten aboneleri',emailCampaigns:'E-posta yönetimi',smsCampaigns:'SMS yönetimi',
      notifications:'Bildirim yönetimi',contactMessages:'Gelen mesajlar',supportTickets:'Destek talepleri',surveys:'Anketler',
      menus:'Menü yönetimi',sliders:'Slaytlar',popups:'Açılır pencereler',socialLinks:'Sosyal medya',sponsors:'Sponsor / reklam alanları',jobPosts:'İş ilanları',
      bankAccounts:'Hesap numaraları',settings:'Site ayarları',users:'Yetkililer',modules:'Modüller'
    };
    const title=document.querySelector('#viewTitle');
    if(title)title.textContent=titleMap[view]||button.innerText||'Bölüm';
    const add=document.querySelector('#addButton');
    if(add)add.hidden=view==='dashboard';
    if(view==='dashboard'){
      location.reload();
      return;
    }
    fetch((window.peyzajderApiPathwindow.peyzajderApiPath(`/api/${view}`):`/api/${view}`),{credentials:'same-origin'})
      .then(r=>r.okr.json():Promise.reject(new Error('Bu bölüm yüklenemedi')))
      .then(items=>renderBridgeTable(view,items,titleMap[view]||'Kayıt'))
      .catch(err=>{
        const workspace=document.querySelector('#workspace');
        if(workspace)workspace.innerHTML=`<p class="empty">${err.message}</p>`;
      });
  }

  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function renderBridgeTable(view,items,label){
    const workspace=document.querySelector('#workspace');
    if(!workspace)return;
    workspace.innerHTML=`<div class="data-toolbar"><input id="tableSearch" placeholder="${esc(label)} içinde ara…"><select id="statusFilter"><option value="">Tüm durumlar</option><option>Yayında</option><option>Taslak</option><option>Aktif</option><option>Beklemede</option><option>Tamamlandı</option></select></div><div class="table-wrap"><table><thead><tr><th>BAŞLIK / AD</th><th>DETAY</th><th>DURUM</th><th>GÜNCELLEME</th><th>İŞLEM</th></tr></thead><tbody id="rows"></tbody></table></div>`;
    const draw=()=>{
      const q=(document.querySelector('#tableSearch').value||'').toLocaleLowerCase('tr');
      const s=document.querySelector('#statusFilter').value||'';
      const list=items.filter(x=>JSON.stringify(x).toLocaleLowerCase('tr').includes(q)&&(!s||x.status===s));
      document.querySelector('#rows').innerHTML=list.lengthlist.map(x=>`<tr><td><b>${esc(x.title||x.name||x.member||x.bank||x.email||'Kayıt')}</b><small>${esc(x.summary||x.description||x.subject||x.role||x.email||'')}</small></td><td>${esc(x.category||x.city||x.date||x.period||x.amount||x.key||'—')}</td><td><span class="status">${esc(x.status||'Kayıtlı')}</span></td><td>${new Date(x.updatedAt||x.createdAt||Date.now()).toLocaleDateString('tr-TR')}</td><td><div class="row-actions"><button type="button" disabled>Düzenle</button><button type="button" disabled>Sil</button></div></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Henüz kayıt yok. “Yeni kayıt” ile ekleyebilirsiniz.</td></tr>`;
    };
    draw();
    document.querySelector('#tableSearch').oninput=draw;
    document.querySelector('#statusFilter').onchange=draw;
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest.('#nav [data-view]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    openAdminView(button.dataset.view);
  },true);
})();
