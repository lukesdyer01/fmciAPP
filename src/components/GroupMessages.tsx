import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client/server';
import { useAuth } from '../providers/AuthProvider';
import { useBlockedMembers } from '../api-client/moderation';
import ReportModal from './ReportModal';
type Group = {
    id: string;
    name: string;
    ownerId: string;
    participantCount: number;
    unreadCount: number;
    updatedAt: string;
    archived: boolean;
    muted: boolean;
    lastMessage: {
        text: string;
    } | null;
};
type Person = {
    id: string;
    name: string;
    church?: string;
};
type ChatMessage = {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl?: string;
    text: string;
    createdAt: string;
};
type Page = {
    visibleSenderIds: string[];
    messages: ChatMessage[];
    members: Person[];
    name: string;
    ownerId: string;
    muted: boolean;
};
const field = { padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-1)', fontSize: 16, minWidth: 0 };
export default function GroupMessages({ onBack, initialId, initialMessage }: {
    onBack: () => void;
    initialId?: string;
    initialMessage?: string;
}) {
    const { currentUser } = useAuth(), qc = useQueryClient();
    const [active, setActive] = useState(initialId ?? ''), [creating, setCreating] = useState(false), [search, setSearch] = useState(''), [name, setName] = useState(''), [selected, setSelected] = useState<string[]>([]), [text, setText] = useState(''), [manage, setManage] = useState(false), [archived, setArchived] = useState(false), [older, setOlder] = useState<ChatMessage[]>([]), [reported, setReported] = useState<ChatMessage | null>(null), [olderError, setOlderError] = useState(false), [loadingOlder, setLoadingOlder] = useState(false);
    useEffect(() => { if (initialId) {
        setOlder([]);
        setActive(initialId);
    } }, [initialId]);
    const bottom = useRef<HTMLDivElement>(null), target = useRef<HTMLDivElement>(null);
    const attemptedTarget = useRef('');
    const groups = useQuery({ queryKey: ['group-chats', currentUser?.id], queryFn: () => api<Group[]>('/group-conversations'), refetchInterval: 15000 });
    const people = useQuery({ queryKey: ['group-chat-members', currentUser?.id], queryFn: () => api<Person[]>('/members'), enabled: creating || manage });
    const blocked = useBlockedMembers();
    const page = useQuery({ queryKey: ['group-chat', active], queryFn: () => api<Page>(`/group-conversations/${active}/messages`), enabled: !!active, refetchInterval: 5000 });
    const action = useMutation({ retry: 0, mutationFn: ({ id, body }: {
            id: string;
            body: Record<string, unknown>;
        }) => api<{
            id?: string;
        }>(id ? `/group-conversations/${id}/actions` : '/group-conversations', { method: 'POST', body: JSON.stringify(body) }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['group-chats'] }); void qc.invalidateQueries({ queryKey: ['group-chat'] }); } });
    useEffect(() => { attemptedTarget.current=''; setOlder([]); setText(''); setManage(false); }, [active]);
    useEffect(() => { if (initialMessage && target.current)
        target.current.scrollIntoView({ block: 'center' });
    else
        bottom.current?.scrollIntoView({ block: 'end' }); }, [active, page.data?.messages.at(-1)?.id, initialMessage]);
    useEffect(() => { if (page.data)
        setOlder(prev => [...prev, ...page.data!.messages].filter((m, i, all) => all.findIndex(x => x.id === m.id) === i && page.data!.visibleSenderIds.includes(m.senderId)).sort((a, b) => Number(a.id) - Number(b.id))); }, [page.data]);
    const doAction = (body: Record<string, unknown>, done?: () => void) => action.mutate({ id: active, body }, { onSuccess: () => done?.() });
    const blockedIds = new Set((blocked.data ?? []).map(p => p.id));
    const matches = (people.data ?? []).filter(p => p.id !== currentUser?.id && !blockedIds.has(p.id) && [p.name, p.church].some(v => v?.toLowerCase().includes(search.toLowerCase())));
    const owner = page.data?.ownerId === currentUser?.id;
    const group = groups.data?.find(g => g.id === active);
    const messages = [...older, ...page.data?.messages ?? []].filter((m, i, all) => all.findIndex(x => x.id === m.id) === i && page.data?.visibleSenderIds.includes(m.senderId));
    useEffect(() => {
      if (!page.data || !initialMessage || active !== initialId || messages.some(m => m.id === initialMessage) || attemptedTarget.current === `${active}:${initialMessage}`) return;
      attemptedTarget.current = `${active}:${initialMessage}`;
      let alive = true;
      void api<Page>(`/group-conversations/${active}/messages?before=${BigInt(initialMessage) + BigInt(1)}`).then(data => { if (alive) setOlder(old => [...data.messages, ...old]); }).catch(() => {});
      return () => { alive = false; };
    }, [active, initialId, initialMessage, page.data]);
    useEffect(() => { if (initialMessage && target.current) target.current.scrollIntoView({ block: 'center' }); }, [older, initialMessage]);
    const close = () => { setOlder([]); setActive(''); setCreating(false); setManage(false); action.reset(); };
    async function more() { if (!messages.length)
        return; setLoadingOlder(true); setOlderError(false); try {
        const data = await api<Page>(`/group-conversations/${active}/messages?before=${messages[0].id}`);
        setOlder(old => [...data.messages, ...old]);
        if (!data.messages.length)
            setOlderError(true);
    }
    catch {
        setOlderError(true);
    }
    finally {
        setLoadingOlder(false);
    } }
    return <section className="group-messages" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, color: 'var(--color-text-1)' }}>
 <header style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}><button onClick={active || creating ? close : onBack} style={field}>← {active || creating ? 'Group chats' : 'Messages'}</button><strong style={{ flex: 1 }}>{creating ? 'New group conversation' : page.data?.name && active ? page.data.name : 'Group conversations'}</strong>{!active && !creating && <button style={field} onClick={() => { setCreating(true); setSelected([]); setName(''); setSearch(''); action.reset(); }}>New group</button>}{active && page.data && <button style={field} onClick={() => { setManage(v => !v); setSearch(''); setName(page.data!.name); }}>Participants ({page.data.members.length})</button>}</header>
 {action.isError && <p role="alert" style={{ padding: '0 14px' }}>{action.error.message}</p>}
 <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 14 }}>
 {!active && !creating && <><label><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)}/> Archived groups</label>{groups.isPending && <p>Loading group chats…</p>}{groups.isError && <p role="alert">Unable to load groups. <button onClick={() => groups.refetch()}>Retry</button></p>}{groups.data?.filter(g => g.archived === archived).map(g => <button key={g.id} style={{ ...field, display: 'block', width: '100%', textAlign: 'left', marginTop: 12 }} onClick={() => { setOlder([]); setActive(g.id); }}><strong>{g.name}</strong> · {g.participantCount} people {g.unreadCount > 0 && `(${g.unreadCount} unread)`}<span style={{ display: 'block', marginTop: 6 }}>{g.lastMessage?.text ?? 'No messages yet'}</span></button>)}{groups.data && !groups.data.some(g => g.archived === archived) && <p>No group conversations here yet.</p>}</>}
 {creating && <><label>Group name<input style={{ ...field, display: 'block', width: '100%', boxSizing: 'border-box', margin: '8px 0 16px' }} maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label><p>Choose 2–24 other members. {selected.length} selected.</p><p>Added participants will only see messages sent after they join.</p></>}
 {(creating || (manage && owner)) && <><label>Find members<input type="search" style={{ ...field, display: 'block', width: '100%', boxSizing: 'border-box', margin: '8px 0' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or church"/></label>{(people.isPending || blocked.isPending) && <p>Loading members…</p>}{(people.isError || blocked.isError) && <p role="alert">Unable to load members. <button onClick={() => { people.refetch(); blocked.refetch(); }}>Retry</button></p>}{!people.isError && !blocked.isError && !blocked.isPending && matches.filter(p => creating || !page.data?.members.some(m => m.id === p.id)).slice(0, 30).map(p => <label key={p.id} style={{ display: 'flex', padding: 12, gap: 10, borderBottom: '1px solid var(--color-border)' }}>{creating ? <input type="checkbox" checked={selected.includes(p.id)} disabled={action.isPending || (!selected.includes(p.id) && selected.length >= 24)} onChange={() => setSelected(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])}/> : <button disabled={action.isPending} onClick={() => doAction({ action: 'add', userId: p.id })}>Add</button>}<span>{p.name}{p.church && <small style={{ display: 'block' }}>{p.church}</small>}</span></label>)}</>}
 {active && page.isPending && <p>Loading conversation…</p>}{active && page.isError && <p role="alert">This conversation is unavailable or could not load. <button onClick={() => page.refetch()}>Retry</button></p>}
 {active && page.data && !page.isError && manage && <><h3>Participants</h3>{page.data.members.map(p => <div key={p.id} style={{ padding: '12px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}><span style={{ flex: 1 }}>{p.name}{p.id === page.data.ownerId ? ' (creator)' : ''}</span>{owner && p.id !== currentUser?.id && <><button disabled={action.isPending} onClick={() => doAction({ action: 'remove', userId: p.id })}>Remove</button><button disabled={action.isPending} onClick={() => { if (window.confirm(`Transfer ownership to ${p.name}?`))
        doAction({ action: 'transfer', userId: p.id }); }}>Make creator</button></>}</div>)}{owner && <label>Group name<input style={field} maxLength={80} value={name} onChange={e => setName(e.target.value)}/><button disabled={action.isPending || !name.trim()} onClick={() => doAction({ action: 'rename', name })}>Rename</button></label>}<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}><button disabled={action.isPending} onClick={() => doAction({ action: 'settings', muted: !page.data!.muted })}>{page.data.muted ? 'Unmute' : 'Mute'}</button><button disabled={action.isPending} onClick={() => doAction({ action: 'settings', archived: !group?.archived }, close)}>{group?.archived ? 'Unarchive' : 'Archive'}</button><button disabled={action.isPending} onClick={() => doAction({ action: 'settings', hide: true }, close)}>Delete from inbox</button><button disabled={action.isPending} onClick={() => { if (window.confirm('Leave this group? You will lose access.'))
        doAction({ action: 'leave' }, close); }}>Leave group</button></div>{owner && page.data.members.length > 1 && <p>Transfer ownership before leaving.</p>}</>}
 {active && page.data && !manage && <><button style={field} disabled={!messages.length || loadingOlder} onClick={more}>{loadingOlder ? 'Loading…' : 'Load older messages'}</button>{olderError && <p role="status">No older messages loaded. You can retry.</p>}{messages.map(m => <article key={m.id} ref={m.id === initialMessage ? target : undefined} style={{ padding: 12, margin: '12px 0', borderRadius: 10, background: 'var(--color-surface)', border: m.id === initialMessage ? '2px solid var(--color-gold)' : '1px solid var(--color-border)' }}><strong>{m.senderAvatarUrl && <img src={m.senderAvatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: 8, verticalAlign: "middle", marginRight: 8 }}/>}{m.senderName}</strong><small style={{ marginLeft: 10 }}>{new Date(m.createdAt).toLocaleString()}</small><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</p>{m.senderId !== currentUser?.id && <button onClick={() => setReported(m)}>Report message</button>}</article>)}{!messages.length && <p>No messages yet. Say hello to the group.</p>}<div ref={bottom}/></>}
 </div>
 {creating && <footer style={{ padding: 14, borderTop: '1px solid var(--color-border)' }}><button style={field} disabled={action.isPending || !name.trim() || selected.length < 2 || blocked.isError || people.isError} onClick={() => action.mutate({ id: '', body: { name, memberIds: selected } }, { onSuccess: data => { setCreating(false); setOlder([]); setActive(data.id!); setSearch(''); } })}>{action.isPending ? 'Creating…' : 'Create group conversation'}</button></footer>}
 {active && page.data && !page.isError && !manage && <form style={{ display: 'flex', gap: 10, padding: 14, borderTop: '1px solid var(--color-border)', flexShrink: 0 }} onSubmit={e => { e.preventDefault(); if (text.trim())
        doAction({ action: 'send', text }, () => setText('')); }}><input style={{ ...field, flex: 1 }} aria-label="Group message" placeholder="Write a message…" maxLength={4000} value={text} onChange={e => setText(e.target.value)}/><button style={field} disabled={action.isPending || !text.trim()}>Send</button></form>}
 {reported && <ReportModal targetType="message" targetId={`group:${active}:message:${reported.id}`} targetAuthorId={reported.senderId} targetLabel="this group message" onClose={() => setReported(null)}/>}
 </section>;
}
