import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/postImage.ts', import.meta.url), 'utf8')
const { optimizePostImage } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`)
async function browser({width=4000,height=3000,failDecode=false,sizes=[400000],context=true}={},run){
 const original={Image:globalThis.Image,document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL}
 const calls=[],revoked=[];let encoded=0
 URL.createObjectURL=()=> 'blob:fixture';URL.revokeObjectURL=url=>revoked.push(url)
 globalThis.Image=class {naturalWidth=width;naturalHeight=height;async decode(){if(failDecode)throw Error('bad image')}}
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');const canvas={width:0,height:0,getContext:()=>context?{fillStyle:'',fillRect(){},drawImage(){}}:null,toBlob(callback,type,quality){calls.push({width:canvas.width,height:canvas.height,type,quality});callback(new Blob([new Uint8Array(sizes[Math.min(encoded++,sizes.length-1)])],{type}))}};return canvas}}
 try{await run({calls,revoked})}finally{globalThis.Image=original.Image;globalThis.document=original.document;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke}
}
const photo=()=>new Blob(['photo fixture'],{type:'image/jpeg'})
test('resizes large photos, outputs a JPEG under 500 KB, and releases the object URL',()=>browser({},async({calls,revoked})=>{
 const output=await optimizePostImage(photo());assert.equal(output.extension,'jpg');assert.equal(output.blob.type,'image/jpeg');assert.ok(output.blob.size<=500000);assert.equal(calls[0].width,1920);assert.equal(calls[0].height,1440);assert.deepEqual(revoked,['blob:fixture'])
}))
test('reduces quality then dimensions when needed without upscaling',()=>browser({width:800,height:600,sizes:[600000,600000,600000,400000]},async({calls})=>{
 await optimizePostImage(photo());assert.deepEqual(calls.map(c=>c.quality),[.85,.72,.6,.85]);assert.equal(calls[0].width,800);assert.equal(calls[3].width,640)
}))
test('decode failures and exhausted compression release resources and reject upload',async()=>{
 await browser({failDecode:true},async({revoked})=>{await assert.rejects(()=>optimizePostImage(photo()),/Unable to read/);assert.deepEqual(revoked,['blob:fixture'])})
 await browser({sizes:[600000]},async({revoked})=>{await assert.rejects(()=>optimizePostImage(photo()),/Unable to compress/);assert.equal(revoked.length,1)})
})
test('preserves small animations and corrects their MIME type; rejects oversized animations',async()=>{
 const output=await optimizePostImage(new Blob(['GIF89a','animation'],{type:'application/octet-stream'}));assert.equal(output.extension,'gif');assert.equal(output.blob.type,'image/gif');assert.equal(await output.blob.text(),'GIF89aanimation')
 await assert.rejects(()=>optimizePostImage(new Blob(['GIF89a',new Uint8Array(1000000)])),/animation under 1 MB/)
})
test('rejects empty, oversized, invalid dimensions, and unavailable canvas inputs',async()=>{
 await assert.rejects(()=>optimizePostImage(new Blob([])),/under 20 MB/)
 await assert.rejects(()=>optimizePostImage(new Blob([new Uint8Array(21*1024*1024)])),/under 20 MB/)
 await browser({width:10000,height:10000},async()=>assert.rejects(()=>optimizePostImage(photo()),/too large/))
 await browser({context:false},async()=>assert.rejects(()=>optimizePostImage(photo()),/Unable to prepare/))
})
