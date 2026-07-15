(function(){
  const first=location.pathname.split('/').filter(Boolean)[0]||'';
  const base=first==='new_web'?`/${first}`:'';
  window.PEYZAJDER_BASE_PATH=base;
  window.PEYZAJDER_API_BASE=`${base}/api`;
  window.peyzajderApiPath=function(path){
    const clean=String(path||'').replace(/^\/api(?=\/|$)/,'');
    return `${window.PEYZAJDER_API_BASE}${clean.startsWith('/')?clean:`/${clean}`}`;
  };
})();
