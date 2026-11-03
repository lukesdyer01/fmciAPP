import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8')
function setup(cache){
 const handlers={};let requests=0
 runInNewContext(source,{URL,caches:{open:async()=>cache},fetch:async()=>{requests++;return {ok:true,clone(){return this}}},self:{location:{origin:'https://fmci.network'},addEventListener:(name,fn)=>handlers[name]=fn}})
 return {handlers,requests:()=>requests}
}
test('private APIs, media, HTML and mutations bypass asset caching',()=>{
 const {handlers}=setup({})
 for(const [url,method] of [['/','GET'],['/assets/file-abcdefgh.js','POST'],['https://other.test/assets/file-abcdefgh.js','GET'],['/api/members','GET'],['/avatars/photo.jpg','GET']]){
  handlers.fetch({request:{url:new URL(url,'https://fmci.network').href,method},respondWith(){assert.fail('must bypass cache')}})
 }
})
test('hashed assets reuse cache instead of requesting the network',async()=>{
 const {handlers,requests}=setup({match:async()=>({cached:true})})
 let result
 handlers.fetch({request:{url:'https://fmci.network/assets/index-abcdefgh.js',method:'GET'},respondWith(p){result=p}})
 assert.equal((await result).cached,true)
 assert.equal(requests(),0)
})
test('cache storage failure falls back to network',async()=>{
 const {handlers,requests}=setup({match:async()=>{throw Error('unavailable')}})
 let result
 handlers.fetch({request:{url:'https://fmci.network/assets/index-abcdefgh.js',method:'GET'},respondWith(p){result=p}})
 assert.equal((await result).ok,true)
 assert.equal(requests(),1)
})
