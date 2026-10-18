import { contentSafetyIssue } from './contentSafety.ts';
import { jpegDimensions, stripJpegMetadata, STORY_MAX_BYTES } from './storyValidation.ts';

const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function registerStories(app: any, base: string, db: () => any, getUser: any, kv: any, role: any) {
  async function eligible(authorIds: string[]) {
    if (!authorIds.length) return new Map();
    const {data,error} = await db().rpc('story_member_summaries',{p_ids:[...new Set(authorIds)]});
    if (error) throw error;
    return new Map(data.map((u: any) => [u.id,u]));
  }
  async function hidden(caller: string) {
    const blocks = await kv.get('user_blocks') ?? {};
    const ids = new Set<string>(blocks[caller] ?? []);
    for (const [id, list] of Object.entries(blocks)) if (Array.isArray(list) && list.includes(caller)) ids.add(id);
    const reports = await kv.get('content_reports') ?? [];
    return { ids, reports: new Set(reports.filter((r: any) => r.reporterId === caller && r.targetType === 'story').map((r: any) => r.targetId)) };
  }
  async function storyFor(c: any, allowAdmin = false) {
    const caller = await getUser(c.req.header('Authorization'));
    const id = c.req.param('id');
    if (!uuid(id)) return { caller, story: null };
    const { data: story, error } = await db().from('photo_stories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!story) return { caller, story: null };
    if (allowAdmin && ['admin','moderator','superadmin'].includes(role(caller))) return { caller, story };
    const hide = await hidden(caller.id);
    const authors = await eligible([story.author_id]);
    if (!authors.has(story.author_id) || hide.ids.has(story.author_id) || hide.reports.has(id) || story.state !== 'published' || Date.parse(story.expires_at) <= Date.now()) return { caller, story: null };
    return { caller, story };
  }
  async function signed(story: any) {
    const ttl = Math.min(60, Math.floor((Date.parse(story.expires_at) - Date.now()) / 1000));
    if (ttl < 1) return null;
    const { data, error } = await db().storage.from('stories').createSignedUrl(story.object_path, ttl);
    if (error) throw error;
    return data.signedUrl;
  }
  app.get(`${base}/stories`, async (c: any) => {
    const caller = await getUser(c.req.header('Authorization'));
    const { data: rows, error } = await db().from('photo_stories').select('*').eq('state','published').gt('expires_at',new Date().toISOString()).order('published_at',{ascending:false});
    if (error) throw error;
    const hide = await hidden(caller.id);
    const visible = rows.filter((s: any) => !hide.ids.has(s.author_id) && !hide.reports.has(s.id));
    const authors = await eligible(visible.map((s: any) => s.author_id));
    const { data: views, error: viewError } = await db().from('story_views').select('story_id,reaction').eq('viewer_id',caller.id);
    if (viewError) throw viewError;
    const seen = new Map(views.map((v: any) => [v.story_id,v]));
    return c.json(visible.filter((s: any) => authors.has(s.author_id)).map((s: any) => {
      const m: any = (authors.get(s.author_id) as any).user_metadata ?? {};
      return { id:s.id,authorId:s.author_id,authorName:m.full_name || 'FMCI member',authorAvatar:m.avatar_url || m.avatarUrl || '',caption:s.caption,createdAt:s.published_at,expiresAt:s.expires_at,seen:seen.has(s.id),reaction:(seen.get(s.id) as any)?.reaction ?? null };
    }));
  });
  app.post(`${base}/stories/uploads`, async (c: any) => {
    const caller = await getUser(c.req.header('Authorization'));
    const body = await c.req.json();
    if (!uuid(body.id ?? '')) return c.json({error:'Invalid upload identifier'},400);
    const { data, error } = await db().rpc('reserve_photo_story',{p_id:body.id,p_author:caller.id});
    if (error) return c.json({error:error.message},429);
    return c.json({id:data.id,state:data.state});
  });
  app.put(`${base}/stories/:id/photo`, async (c: any) => {
    const caller = await getUser(c.req.header('Authorization'));
    const id = c.req.param('id');
    if (!uuid(id)) return c.json({error:'Invalid Story'},400);
    const { data: story, error } = await db().from('photo_stories').select('*').eq('id',id).eq('author_id',caller.id).maybeSingle();
    if (error) throw error;
    if (!story) return c.json({error:'Upload unavailable'},404);
    if (story.state === 'published') return c.json({id});
    if (story.state !== 'pending' || Date.parse(story.reserved_at) < Date.now()-600000) return c.json({error:'Upload expired. Choose the photo again.'},409);
    // Stream into a bounded buffer; never load an arbitrary multipart body.
    const reader = c.req.raw.body?.getReader();
    if (!reader) return c.json({error:'Choose a photo'},400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const {value,done} = await reader.read(); if (done) break;
      size += value.length;
      if (size > STORY_MAX_BYTES) { await reader.cancel(); return c.json({error:'Photo must be 500 KB or smaller'},413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset=0;
    for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.length; }
    const dimensions = jpegDimensions(bytes);
    if (!dimensions) return c.json({error:'Use a static JPEG photo, at most 1920 pixels per side and 500 KB'},415);
    let normalized: Uint8Array;
    try {
      const jpeg = await import('npm:jpeg-js@0.4.4');
      const image = jpeg.decode(bytes,{useTArray:true,formatAsRGBA:false,maxResolutionInMP:4,maxMemoryUsageInMB:64,tolerantDecoding:false});
      if (image.width !== dimensions.width || image.height !== dimensions.height) throw new Error();
      normalized = stripJpegMetadata(bytes);
    }
    catch { return c.json({error:'This photo could not be read. Choose another photo.'},415); }
    let caption: string;
    try { caption = decodeURIComponent(c.req.header('X-Story-Caption') ?? ''); } catch { return c.json({error:'Invalid caption'},400); }
    if ([...caption].length > 300 || contentSafetyIssue({text:caption})) return c.json({error:'Edit your caption to follow the community rules (300 characters maximum).'},422);
    const { error: uploadError } = await db().storage.from('stories').upload(story.object_path,normalized,{contentType:'image/jpeg',cacheControl:'0',upsert:false});
    if (uploadError) {
      // A retry after a lost response may find the first request's bytes.
      const { data: existing, error: readError } = await db().storage.from('stories').download(story.object_path);
      if (readError || !existing) throw uploadError;
      const old = new Uint8Array(await existing.arrayBuffer());
      if (old.length !== normalized.length || old.some((v: number,i: number) => v !== normalized[i])) return c.json({error:'Choose the photo again to start a new upload.'},409);
    }
    const result = await db().rpc('publish_photo_story',{p_id:id,p_author:caller.id,p_caption:caption});
    if (result.error) return c.json({error:result.error.message},409);
    return c.json({id});
  });
  app.get(`${base}/stories/:id/media`, async (c: any) => {
    const {story} = await storyFor(c);
    if (!story) return c.json({error:'This Story has expired or is unavailable.'},404);
    const url = await signed(story);
    if (!url) return c.json({error:'This Story has expired.'},404);
    c.header('Cache-Control','no-store'); return c.json({url});
  });
  app.post(`${base}/stories/:id/view`, async (c: any) => {
    const {caller,story} = await storyFor(c);
    if (!story) return c.json({error:'Story unavailable'},404);
    if (caller.id !== story.author_id) {
      const {error} = await db().from('story_views').upsert({story_id:story.id,viewer_id:caller.id},{onConflict:'story_id,viewer_id',ignoreDuplicates:true});
      if (error) throw error;
    }
    return c.json({ok:true});
  });
  app.put(`${base}/stories/:id/reaction`, async (c: any) => {
    const {caller,story} = await storyFor(c);
    if (!story) return c.json({error:'Story unavailable'},404);
    const {reaction} = await c.req.json();
    if (caller.id === story.author_id || ![null,'heart','amen','pray'].includes(reaction)) return c.json({error:'Invalid reaction'},400);
    const {error} = await db().from('story_views').upsert({story_id:story.id,viewer_id:caller.id,reaction},{onConflict:'story_id,viewer_id'});
    if (error) throw error;
    return c.json({ok:true});
  });
  app.get(`${base}/stories/:id/viewers`, async (c: any) => {
    const {caller,story} = await storyFor(c);
    if (!story || story.author_id !== caller.id) return c.json({error:'Story unavailable'},404);
    const hide = await hidden(caller.id);
    const {data, error} = await db().from('story_views').select('*').eq('story_id',story.id).order('viewed_at',{ascending:false});
    if (error) throw error;
    const viewers = await eligible(data.filter((v: any) => !hide.ids.has(v.viewer_id)).map((v: any) => v.viewer_id));
    return c.json(data.filter((v: any) => viewers.has(v.viewer_id)).map((v: any) => ({id:v.viewer_id,name:(viewers.get(v.viewer_id) as any).user_metadata?.full_name || 'FMCI member',reaction:v.reaction})));
  });
  app.delete(`${base}/stories/:id`, async (c: any) => {
    const {caller,story} = await storyFor(c,true);
    if (!story || (story.author_id !== caller.id && !['admin','moderator','superadmin'].includes(role(caller)))) return c.json({error:'Story unavailable'},404);
    const {error} = await db().from('photo_stories').update({state:'deleted'}).eq('id',story.id);
    if (error) throw error;
    // Keep the quota ledger until 24 hours have passed; cleanup retries bytes.
    const removed = await db().storage.from('stories').remove([story.object_path]);
    if (removed.error) console.error('Story deletion queued for retry',story.id);
    await db().from('story_views').delete().eq('story_id',story.id);
    return c.json({ok:true});
  });
}
