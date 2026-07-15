(()=>{
  const esc=value=>String(value||'').replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
  const asHtml=value=>/<\/?(?:p|h2|h3|strong|b|em|i|u|ul|ol|li|blockquote|a|br)\b/i.test(String(value||''))
    ?String(value||'')
    :String(value||'').split(/\n{2,}/).map(part=>`<p>${esc(part).replace(/\n/g,'<br>')}</p>`).join('');
  const buttons=[
    ['bold','B','Kalın'],['italic','I','İtalik'],['underline','U','Altı çizili'],
    ['formatBlock','H2','Başlık','h2'],['formatBlock','H3','Ara başlık','h3'],
    ['insertUnorderedList','• Liste','Madde listesi'],['insertOrderedList','1. Liste','Numaralı liste'],
    ['formatBlock','❝','Alıntı','blockquote'],['createLink','Bağlantı','Bağlantı ekle'],['removeFormat','Temizle','Biçimi temizle']
  ];
  function sync(textarea){const editor=textarea?._richEditor;if(editor)textarea.value=editor.innerHTML.trim()}
  function setValue(textarea,value){if(!textarea)return;textarea.value=value||'';if(textarea._richEditor)textarea._richEditor.innerHTML=asHtml(value)}
  function mount(textarea){
    if(!textarea||textarea.dataset.richMounted)return;
    textarea.dataset.richMounted='1';textarea.hidden=true;
    const shell=document.createElement('div');shell.className='rich-editor';
    const toolbar=document.createElement('div');toolbar.className='rich-toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Metin biçimlendirme');
    toolbar.innerHTML=buttons.map(([command,label,title,value])=>`<button type="button" data-command="${command}"${value?` data-value="${value}"`:''} title="${title}">${label}</button>`).join('');
    const editor=document.createElement('div');editor.className='rich-surface';editor.contentEditable='true';editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');editor.innerHTML=asHtml(textarea.value);textarea._richEditor=editor;
    toolbar.addEventListener('mousedown',event=>event.preventDefault());
    toolbar.addEventListener('click',event=>{
      const button=event.target.closest('[data-command]');if(!button)return;editor.focus();
      const command=button.dataset.command;
      if(command==='createLink'){
        const url=prompt('Bağlantı adresi (https://...)');
        if(url&&/^(https?:\/\/|mailto:|\/|#)/i.test(url))document.execCommand('createLink',false,url);
      }else document.execCommand(command,false,button.dataset.value||null);
      sync(textarea);
    });
    editor.addEventListener('input',()=>sync(textarea));
    shell.append(toolbar,editor);textarea.insertAdjacentElement('afterend',shell);sync(textarea);
  }
  function mountAll(root=document){root.querySelectorAll('textarea[data-rich-editor]').forEach(mount)}
  new MutationObserver(()=>mountAll()).observe(document.documentElement,{childList:true,subtree:true});
  window.PeyzajRichEditor={mount,mountAll,sync,setValue};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountAll());else mountAll();
})();
