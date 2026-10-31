import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const js=ts.transpileModule(await readFile(new URL('../supabase/functions/dynamic-endpoint/postReactions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {reactionSummary,applyPostReactions}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
test('preserves legacy totals without double counting the prayer emoji and restores own selection',()=>{
 const result=reactionSummary({id:'p1',reactions:{'🙏':3,'❤️':2}},{counts:{amen:1,pray:2,heart:0},my_reaction:'pray'})
 assert.deepEqual(result.reactions,{amen:4,pray:2,heart:2});assert.equal(result.myReaction,'pray')
 assert.equal(reactionSummary({reactions:{}},null).myReaction,null)
})
test('loads authoritative totals and selection per caller, including posts with no new reactions',async()=>{
 let args
 const posts=await applyPostReactions([{id:'one',reactions:{}},{id:'two',reactions:{amen:2}}],'user',()=>({rpc:async(name,params)=>{args=params;return {data:[{post_id:'one',counts:{amen:1},my_reaction:'amen'}]}}}))
 assert.deepEqual(args,{p_post_ids:['one','two'],p_user:'user'});assert.equal(posts[0].myReaction,'amen');assert.equal(posts[1].myReaction,null);assert.equal(posts[1].reactions.amen,2)
 await assert.rejects(()=>applyPostReactions([{id:'one'}],'user',()=>({rpc:async()=>({error:true})})),/Unable to load/)
})
