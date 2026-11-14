import { beforeAll, describe, expect, it } from 'vitest';
import { createScheduler, type Scheduler } from '../scheduler/fsrs.ts';
import { replay } from '../scheduler/replay.ts';
import { rev } from '../scheduler/testkit.ts';
import { DEFAULT_SETTINGS } from '../scheduler/types.ts';
import { PULL_PAGE, PUSH_BATCH, syncOnce } from './engine.ts';
import { MemoryLocal, MemoryRemote } from './memory.ts';

let s: Scheduler;
beforeAll(async () => {
  s = await createScheduler();
});

const dues = (l: MemoryLocal) =>
  [...replay(l.all(), s).cards].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, m]) => [id, m.fsrs.dueAt.toISOString(), m.fsrs.stability]);

describe('syncOnce', () => {
  it('spec scenario: 10 reviews offline on the iPhone, 10 on the Mac, then both sync: same due dates', async () => {
    const server = new MemoryRemote();
    const phone = new MemoryLocal();
    const mac = new MemoryLocal();
    for (let i = 0; i < 10; i++) phone.add(rev(`c${i % 4}`, i % 3 === 0 ? 1 : 3, new Date(2026, 10, 15, 8, i * 6)));
    for (let i = 0; i < 10; i++) mac.add(rev(`c${(i % 5) + 2}`, i % 4 === 0 ? 1 : 4, new Date(2026, 10, 15, 20, i * 6)));
    phone.cancel([...phone.reviews.keys()][3] as string);

    await syncOnce(phone, server);
    await syncOnce(mac, server);
    await syncOnce(phone, server);

    expect(phone.all().length).toBe(20);
    expect(mac.all().length).toBe(20);
    expect(dues(phone)).toEqual(dues(mac));
    expect(await phone.unsynced(100)).toEqual([]);
    expect(await mac.unsynced(100)).toEqual([]);
  });

  it('a second sync with nothing new transfers nothing new', async () => {
    const server = new MemoryRemote();
    const a = new MemoryLocal();
    a.add(rev('c1', 3, '2026-11-15T08:00:00Z'));
    await syncOnce(a, server);
    const again = await syncOnce(a, server);
    expect(again.pushed).toBe(0);
    expect(again.added).toBe(0);
  });

  it('carries a cancellation to the other device, and the server never un-cancels', async () => {
    const server = new MemoryRemote();
    const a = new MemoryLocal();
    const b = new MemoryLocal();
    const r = rev('c1', 1, '2026-11-15T08:00:00Z');
    a.add(r);
    await syncOnce(a, server);
    await syncOnce(b, server);
    a.cancel(r.id);
    await syncOnce(a, server);
    const report = await syncOnce(b, server);
    expect(report.cancelled).toBe(1);
    expect(b.reviews.get(r.id)?.annulee).toBe(true);
    await server.upsertReviews([{ ...r, annulee: false }]);
    expect(server.rows.get(r.id)?.annulee).toBe(true);
  });

  it('does not mark as sent a review cancelled while it was being pushed', async () => {
    const server = new MemoryRemote();
    const a = new MemoryLocal();
    const r = rev('c1', 1, '2026-11-15T08:00:00Z');
    a.add(r);
    const sent = await a.unsynced(10);
    a.cancel(r.id);
    await a.markSynced(sent);
    expect((await a.unsynced(10)).map((x) => x.annulee)).toEqual([true]);
    await syncOnce(a, server);
    expect(server.rows.get(r.id)?.annulee).toBe(true);
  });

  it('pages through large journals, even when many rows share one server timestamp', async () => {
    const server = new MemoryRemote();
    const a = new MemoryLocal();
    const n = PUSH_BATCH * 2 + PULL_PAGE + 7;
    for (let i = 0; i < n; i++) a.add(rev(`c${i}`, 3, new Date(Date.UTC(2026, 10, 15, 8, 0, i))));
    const pushed = await syncOnce(a, server);
    expect(pushed.pushed).toBe(n);
    const b = new MemoryLocal();
    const pulled = await syncOnce(b, server);
    expect(pulled.added).toBe(n);
  });

  it('catches rows written just before the cursor (pull overlap)', async () => {
    const server = new MemoryRemote();
    const a = new MemoryLocal();
    const b = new MemoryLocal();
    a.add(rev('c1', 3, '2026-11-15T08:00:00Z'));
    await syncOnce(a, server);
    await syncOnce(b, server);
    // A row committed late with a server time earlier than b's cursor.
    const late = rev('c2', 3, '2026-11-15T08:01:00Z');
    const cursor = (await b.getCursor())!;
    server.rows.set(late.id, { ...late, updated_at: new Date(Date.parse(cursor.updated_at) - 30_000).toISOString() });
    await syncOnce(b, server);
    expect(b.reviews.has(late.id)).toBe(true);
  });

  it('keeps the most recent settings on both sides', async () => {
    const server = new MemoryRemote();
    const a = new MemoryLocal();
    const b = new MemoryLocal();
    a.settings = { data: { ...DEFAULT_SETTINGS, newPerDay: 20 }, updated_at: '2026-11-15T08:00:00Z' };
    b.settings = { data: { ...DEFAULT_SETTINGS, newPerDay: 10 }, updated_at: '2026-11-14T08:00:00Z' };
    expect((await syncOnce(a, server)).settings).toBe('pushed');
    expect((await syncOnce(b, server)).settings).toBe('pulled');
    expect(b.settings?.data.newPerDay).toBe(20);
    expect((await syncOnce(b, server)).settings).toBe('same');
  });
});
