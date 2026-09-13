import fs from 'node:fs/promises';
import path from 'node:path';
import { Vibrant } from 'node-vibrant/node';

const token=process.env.GITHUB_TOKEN, issueNumber=process.env.ISSUE_NUMBER, repository=process.env.REPOSITORY;
const api='https://api.github.com/repos/'+repository;
const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ui-reference-library-ingest'};
const field=(body,name)=>{const m=body.match(new RegExp('### '+name+'\\s*\\n([\\s\\S]*?)(?=\\n### |$)','i'));return m&&m[1].trim()||''};
const cleanTags=v=>[...new Set(v.split(',').map(x=>x.trim().toLowerCase().replace(/^#/,'')).filter(Boolean))].slice(0,20);
async function json(url,options={}){const r=await fetch(url,{...options,headers:{...headers,...(options.headers||{})}});if(!r.ok)throw Error(r.status+' '+r.statusText);return r.json()}
async function closeIssue(body){await json(api+'/issues/'+issueNumber+'/comments',{method:'POST',body:JSON.stringify({body})});await json(api+'/issues/'+issueNumber,{method:'PATCH',body:JSON.stringify({state:'closed'})})}
async function download(url,file){const r=await fetch(url,{headers:{'User-Agent':headers['User-Agent']}});if(!r.ok)throw Error('media download failed');await fs.writeFile(file,Buffer.from(await r.arrayBuffer()))}
function meta(html,name){const m=html.match(new RegExp('<meta[^>]+(?:property|name)=["'']'+name.replace(':','\\:')+'["''][^>]+content=["'']([^"'']+)["''][^>]*>','i'));return m&&m[1]||null}

const issue=await json(api+'/issues/'+issueNumber);
const source_url=field(issue.body||'','pin_url'), note=field(issue.body||'','note'), itemTags=cleanTags(field(issue.body||'','tags'));
const existing=JSON.parse(await fs.readFile(path.resolve('data/library.json'),'utf8'));
if(existing.some(x=>x.source_url===source_url)){await closeIssue('This Pinterest pin is already saved in the library.');process.exit(0)}
if(!source_url){await closeIssue('No pin_url was found.');process.exit(1)}
const o=await json('https://www.pinterest.com/oembed.json?url='+encodeURIComponent(source_url));
const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8), video=String(o.type).toLowerCase()==='video';
let thumb=o.thumbnail_url||null;
try{const u=new URL(thumb);u.pathname=u.pathname.replace(/\/(?:60x60|75x|136x136|236x|474x|736x)\//,'/originals/');u.searchParams.set('width','1600');thumb=u.toString()}catch{}
await fs.mkdir('media',{recursive:true});
let mediaPath=null,incomplete=false,direct=null;
if(thumb){mediaPath='media/'+id+'.jpg';try{await download(thumb,path.resolve(mediaPath))}catch{mediaPath=null;incomplete=true}}
if(video){try{const r=await fetch(source_url,{headers:{'User-Agent':headers['User-Agent']}});if(r.ok){const h=await r.text();direct=meta(h,'og:video:secure_url')||meta(h,'og:video')||meta(h,'twitter:player:stream')}}catch{}if(direct){try{mediaPath='media/'+id+'.mp4';await download(new URL(direct,source_url),path.resolve(mediaPath))}catch{incomplete=true}}else incomplete=true}
let palette=[];
if(mediaPath&&!video)try{const p=await Vibrant.from(path.resolve(mediaPath)).getPalette();palette=Object.values(p).filter(Boolean).map(x=>x.hex).slice(0,5)}catch{}
const record={id,source_url,media:{type:video?'video':'image',path:mediaPath,...(direct?{source_url:direct}:{}),...(!direct&&video?{embed_html:o.html||null}:{})},tags:itemTags,palette,note,added:new Date().toISOString(),...(incomplete?{media_incomplete:true}:{}),...(o.title?{title:o.title}:{})};
const file=path.resolve('data/library.json'),library=JSON.parse(await fs.readFile(file,'utf8'));library.push(record);await fs.writeFile(file,JSON.stringify(library,null,2)+'\n');
await closeIssue((incomplete?'Saved with incomplete media capture.':'Saved reference and media successfully.')+'\n\nRecord ID: '+id+'\nTags: '+(itemTags.join(', ')||'none'));