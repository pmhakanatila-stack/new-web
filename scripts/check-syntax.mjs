import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {extname,join,relative} from 'node:path';
import vm from 'node:vm';

const root=process.cwd(),ignored=new Set(['.git','data','uploads','node_modules','work']),files=[],htmlFiles=[];
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){if(ignored.has(entry.name))continue;const path=join(directory,entry.name);if(entry.isDirectory())await walk(path);else if(['.js','.mjs'].includes(extname(entry.name)))files.push(path);else if(extname(entry.name)==='.html')htmlFiles.push(path)}}
await walk(root);
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0){console.error(`${relative(root,file)}\n${result.stderr}`);process.exit(1)}}
let inlineCount=0;
for(const file of htmlFiles){const html=await readFile(file,'utf8');const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];for(const match of scripts){const source=match[1].trim();if(!source)continue;try{new vm.Script(source,{filename:`${relative(root,file)}#inline-${inlineCount+1}`});inlineCount++}catch(error){console.error(error.stack);process.exit(1)}}}
console.log(`${files.length} JavaScript dosyası ve ${inlineCount} satır içi betiğin söz dizimi geçerli.`);
