import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const root=process.cwd();
const legacy=/^https?:\/\/(?:www\.)?peyzajder\.org(?:[/?#]|$)/i;
const targets=[
  {file:'seed-cms.json',sourceKeys:new Set(['sourceUrl'])},
  {file:'content-data.json',sourceKeys:new Set(['url','original','source'])},
  {file:join('api','public','home'),sourceKeys:new Set(['url']),internal:true},
  {file:join('data','cms.json'),sourceKeys:new Set(['sourceUrl']),optional:true},
  {file:join('data','cms.backup.json'),sourceKeys:new Set(['sourceUrl']),optional:true}
];

function clean(value,config){
  let changed=0;
  if(Array.isArray(value)){for(const item of value)changed+=clean(item,config);return changed}
  if(!value||typeof value!=='object')return changed;
  for(const [key,current] of Object.entries(value)){
    if(legacy.test(String(key||'').trim())){delete value[key];changed++;continue}
    if(config.sourceKeys.has(key)&&legacy.test(String(current||'').trim())){
      if(config.internal&&value.id)value[key]=`content-detail.html?id=${encodeURIComponent(value.id)}`;
      else delete value[key];
      changed++;
      continue;
    }
    changed+=clean(current,config);
  }
  return changed;
}

let total=0;
for(const target of targets){
  const path=join(root,target.file);
  let raw='';
  try{raw=await readFile(path,'utf8')}catch(error){if(target.optional)continue;throw error}
  const value=JSON.parse(raw.replace(/^\uFEFF/,''));
  const changed=clean(value,target);
  if(changed)await writeFile(path,`${JSON.stringify(value,null,2)}\n`,'utf8');
  total+=changed;
  console.log(`${target.file}: ${changed} eski kaynak bağlantısı temizlendi`);
}
console.log(`Toplam: ${total}`);
