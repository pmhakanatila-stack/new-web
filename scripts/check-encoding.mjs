import {readdir,readFile} from 'node:fs/promises';
import {extname,join,relative} from 'node:path';

const root=process.cwd();
const textExtensions=new Set(['.html','.css','.js','.mjs','.json','.md','.yaml','.yml','.htaccess']);
const ignored=new Set(['.git','data','uploads','node_modules','work']);
const mojibake=new RegExp(`[${String.fromCodePoint(0x00c3,0x00c4,0x00c5,0xfffd)}]`,'u');
const brokenPieces=['.js'+'v=','.css'+'v=','.html'+'cat=','.html'+'type=','css2'+'family='];
const failures=[];

async function walk(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    if(ignored.has(entry.name))continue;
    const path=join(directory,entry.name);
    if(entry.isDirectory()){await walk(path);continue}
    const extension=entry.name==='.htaccess'?'.htaccess':extname(entry.name).toLowerCase();
    if(!textExtensions.has(extension))continue;
    const buffer=await readFile(path);
    const text=buffer.toString('utf8');
    if(text.includes(String.fromCodePoint(0xfffd)))failures.push(`${relative(root,path)}: invalid UTF-8 replacement character`);
    if(mojibake.test(text))failures.push(`${relative(root,path)}: mojibake sequence`);
    if(brokenPieces.some(piece=>text.includes(piece)))failures.push(`${relative(root,path)}: malformed URL pattern`);
  }
}

await walk(root);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('UTF-8 and URL audit passed.');
