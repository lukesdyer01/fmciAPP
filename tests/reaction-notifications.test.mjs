import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const js=ts.transpileModule(await readFile(new URL('../supabase/functions/dynamic-endpoint/reactionNotifications.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {visibleReactionNotifications}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const post={id:'post',body:'Post text',commentsList:[{id:'comment',text:'Comment text'}]}
const row={id:'notice',actor_id:'actor',post_id:'post',comment_id:null,reaction:'amen',read_at:null,created_at:'2026-10-31T00:00:00Z'}
test('reaction notifications retain reaction, unread state, author and exact target',()=>{
 const results=visibleReactionNotifications([row,{...row,id:'comment-notice',comment_id:'comment',reaction:'praise'}],[post],new Set(),[{id:'actor',user_metadata:{full_name:'Member'}}])
 assert.equal(results[0].actorName,'Member');assert.equal(results[0].preview,'Post text');assert.equal(results[0].readAt,null)
 assert.equal(results[1].commentId,'comment');assert.equal(results[1].preview,'Comment text');assert.equal(results[1].reaction,'praise')
})
test('hidden/deleted posts, hidden/deleted comments and blocked actors produce no notification',()=>{
 assert.deepEqual(visibleReactionNotifications([row],[],new Set(),[]),[])
 assert.deepEqual(visibleReactionNotifications([{...row,comment_id:'missing'}],[post],new Set(),[]),[])
 assert.deepEqual(visibleReactionNotifications([row],[post],new Set(['actor']),[]),[])
})
