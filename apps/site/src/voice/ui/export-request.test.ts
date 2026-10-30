import { expect, it } from 'vitest';
import { ExportRequest } from './export-request.ts';

it('allows a new export after restart and rejects the old worker reply', () => {
  const request = new ExportRequest();
  expect(request.begin(1, true)).toBe(true);
  request.reset();
  expect(request.current(1)).toBe(false);
  expect(request.begin(2, false)).toBe(true);
  expect(request.current(1)).toBe(false);
  expect(request.current(2)).toBe(true);
  expect(request.destination(2)).toBe(false);
});

it('rejects a stale build completion without clearing a newer export', () => {
  const request = new ExportRequest();
  request.begin(1, true);
  const oldTicket = request.ticket(1);
  request.reset();
  request.begin(1, false);
  expect(request.finish(1, oldTicket ?? -1)).toBe(false);
  expect(request.current(1)).toBe(true);
  expect(request.finish(1)).toBe(true);
  expect(request.current(1)).toBe(false);
});

it('does not let an autosave or earlier export reply satisfy the current public full download', () => {
  const request = new ExportRequest();
  request.begin(3, false);
  const first = request.ticket(3);
  expect(request.replyTicket(3, undefined)).toBeNull();
  expect(request.replyTicket(3, first)).toBe(first);
  request.reset();
  request.begin(3, false);
  expect(request.replyTicket(3, first)).toBeNull();
  expect(request.replyTicket(2, request.ticket(3))).toBeNull();
});
