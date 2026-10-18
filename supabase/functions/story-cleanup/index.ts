import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
Deno.serve(async req => {
  const secret = Deno.env.get('STORY_CLEANUP_SECRET');
  if (req.method !== 'POST' || !secret || req.headers.get('x-story-cleanup-secret') !== secret) return new Response('Unauthorized',{status:401});
  const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    let removed = 0;
    for (let batch=0;batch<20;batch++) {
      const {data,error} = await db.rpc('story_cleanup_objects'); if (error) throw error;
      if (!data.length) break;
      const result = await db.storage.from('stories').remove(data.map((o: any) => o.name));
      if (result.error) throw result.error;
      removed+=data.length;
    }
    // Retain published/deleted ledger rows for the full quota window. The
    // orphan sweep still discovers bytes if a slow upload raced a cleanup.
    const now = new Date().toISOString();
    for (const query of [db.from('photo_stories').delete().lte('expires_at',now), db.from('photo_stories').delete().eq('state','pending').lt('reserved_at',new Date(Date.now()-900000).toISOString())]) {
      const {error} = await query; if (error) throw error;
    }
    console.log('Story cleanup completed',{removed});
    return Response.json({ok:true,removed});
  } catch (error) { console.error('Story cleanup failed',error); return Response.json({error:'Cleanup failed; will retry next run'},{status:500}); }
});
