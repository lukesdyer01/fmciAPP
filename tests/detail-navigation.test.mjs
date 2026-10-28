import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
const require=createRequire(import.meta.url)
const zustand=pathToFileURL(require.resolve('zustand')).href
async function store(path='/'){
 globalThis.window={location:{pathname:path},scrollY:100,history:{pushState(_s,_t,p){window.location.pathname=p}}}
 const source=(await readFile(new URL('../src/store/ui.ts',import.meta.url),'utf8')).replace("from 'zustand'",`from '${zustand}'`)
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 return (await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}#${Math.random()}`)).useUIStore
}
test('group and resource selections survive URL restoration and clear when changing sections',async()=>{
 const s=await store();s.getState().viewGroup('group one');assert.equal(window.location.pathname,'/groups/group%20one');assert.equal(s.getState().viewingGroupId,'group one')
 s.getState().viewResource('r-1');assert.equal(s.getState().viewingGroupId,null);assert.equal(s.getState().viewingResourceId,'r-1')
 window.location.pathname='/groups/group%20two';s.getState().syncFromUrl();assert.equal(s.getState().viewingGroupId,'group two');assert.equal(s.getState().viewingResourceId,null)
 s.getState().setActiveView('saved');assert.equal(window.location.pathname,'/saved');assert.equal(s.getState().viewingGroupId,null)
})
test('direct resource URLs initialize selected resource and close to the library',async()=>{
 const s=await store('/resources/resource-1');assert.equal(s.getState().viewingResourceId,'resource-1');s.getState().closeResourceView();assert.equal(window.location.pathname,'/resources');assert.equal(s.getState().viewingResourceId,null)
})
