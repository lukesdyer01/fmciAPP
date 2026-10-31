export function reactionSummary(post:any, totals:any) {
 const legacy=post.reactions??{},counts=totals?.counts??{}
 const count=(value:any)=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0
 return {...post,reactions:{amen:count(legacy.amen??legacy['🙏'])+count(counts.amen),pray:count(legacy.pray)+count(counts.pray),heart:count(legacy.heart??legacy['❤️'])+count(counts.heart)},myReaction:totals?.my_reaction??null}
}
export async function applyPostReactions(posts:any[],userId:string|null,client:any){
 if(!posts.length)return posts
 const {data,error}=await client().rpc('post_reaction_totals',{p_post_ids:posts.map(p=>String(p.id)),p_user:userId})
 if(error)throw new Error('Unable to load post reactions')
 const byId=new Map((data??[]).map((r:any)=>[r.post_id,r]))
 return posts.map(p=>reactionSummary(p,byId.get(String(p.id))))
}
