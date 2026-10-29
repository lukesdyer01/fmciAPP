import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const compile=source=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true}).outputText).toString('base64')}`
const {readGroupNotificationUrl}=await import(compile(await readFile(new URL('../src/lib/messageNotification.ts',import.meta.url),'utf8')))
const id='11111111-2222-3333-4444-555555555555'
test('group push links identify exact conversations and messages on web and native',()=>{
 for(const base of ['https://fmci.network/','capacitor://localhost/'])assert.deepEqual(readGroupNotificationUrl(`/?groupConversation=${id}&message=123`,base),{id,messageId:'123'})
})
test('group push parser rejects foreign origins, malformed ids, paths and message ids',()=>{
 for(const value of [`https://foreign.invalid/?groupConversation=${id}`,`/admin?groupConversation=${id}`,`/?groupConversation=bad`,`/?groupConversation=${id}&message=abc`,`/?groupConversation=${id}&message=-1`])assert.equal(readGroupNotificationUrl(value,'https://fmci.network/'),null)
})
const safety=compile(await readFile(new URL('../supabase/functions/dynamic-endpoint/contentSafety.ts',import.meta.url),'utf8'))
const source=(await readFile(new URL('../supabase/functions/dynamic-endpoint/groupChats.ts',import.meta.url),'utf8')).replace("'./contentSafety.ts'",JSON.stringify(safety))
const {registerGroupChats}=await import(compile(source))
function setup(user={id:'caller'},response={data:{ok:true},error:null}){
 const handlers={},calls=[];const app=Object.fromEntries(['get','post'].map(method=>[method,(url,handler)=>{handlers[`${method} ${url}`]=handler}]))
 registerGroupChats(app,'/api',()=>({rpc:async(name,args)=>{calls.push(args);return response}}),async()=>user,{},()=>{},()=>false)
 const context=(body={},id='chat')=>({req:{header:()=>'',json:async()=>body,param:()=>id,query:()=>undefined},json:(body,status=200)=>({body,status})})
 return {handlers,calls,context}
}
test('group actions bind the caller server-side and reject unknown operations',async()=>{
 const s=setup();let result=await s.handlers['post /api/group-conversations/:id/actions'](s.context({action:'rename',name:'Test',p_user:'victim'}));assert.equal(result.status,200);assert.equal(s.calls[0].p_user,'caller');assert.equal(s.calls[0].p_action,'rename')
 result=await s.handlers['post /api/group-conversations/:id/actions'](s.context({action:'delete-everything'}));assert.equal(result.status,400);assert.equal(s.calls.length,1)
})
test('unsigned callers cannot reach group RPCs; RPC denials remain visible',async()=>{
 let s=setup(null);assert.equal((await s.handlers['get /api/group-conversations'](s.context())).status,401);assert.equal(s.calls.length,0)
 s=setup({id:'caller'},{error:{message:'Conversation unavailable'}});assert.equal((await s.handlers['get /api/group-conversations'](s.context())).body.error,'Conversation unavailable')
})
