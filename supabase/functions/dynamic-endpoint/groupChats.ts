import { contentSafetyIssue } from './contentSafety.ts';
export function registerGroupChats(app: any, base: string, client: any, caller: any, kv: any, push: any, blocked: any) {
    const execute = async (c: any, action: string, id: string | null, body: any = {}) => {
        const user = await caller(c.req.header('Authorization'));
        if (!user)
            return c.json({ error: 'Sign in to continue' }, 401);
        if (contentSafetyIssue(body))
            return c.json({ error: 'This text may violate the community rules' }, 422);
        const { data, error } = await client().rpc('group_chat', { p_user: user.id, p_action: action, p_id: id, p_body: body });
        if (error)
            return c.json({ error: error.message }, 400);
        if (action === 'send') {
            void (async () => {
                if (await kv.get('group_messages_enabled') !== 1)
                    return;
                const { data: members } = await client().from('network_group_members').select('user_id,muted').eq('conversation_id', id);
                for (const member of members ?? []) {
                    if (member.user_id === user.id || member.muted || await blocked(user.id, member.user_id))
                        continue;
                    const { data: prefs, error } = await client().from('network_member_preferences').select('group_messages').eq('user_id', member.user_id).maybeSingle();
                    if (error || prefs?.group_messages === false)
                        continue;
                    if (await kv.get('group_messages_enabled') !== 1)
                        return;
                    await push(member.user_id, { title: 'New group message', body: 'Open FMCI Network to read it.', url: `/?groupConversation=${id}&message=${data.id}`, tag: `group-${id}` });
                }
            })().catch(() => { });
        }
        return c.json(data);
    };
    app.get(`${base}/group-conversations`, (c: any) => execute(c, 'list', null));
    app.post(`${base}/group-conversations`, async (c: any) => execute(c, 'create', null, await c.req.json()));
    app.get(`${base}/group-conversations/:id/messages`, (c: any) => execute(c, 'messages', c.req.param('id'), { before: c.req.query('before') }));
    app.post(`${base}/group-conversations/:id/actions`, async (c: any) => { const body = await c.req.json(); if (!['send', 'settings', 'leave', 'remove', 'rename', 'transfer', 'add'].includes(body.action))
        return c.json({ error: 'Invalid action' }, 400); return execute(c, body.action, c.req.param('id'), body); });
}
