#!/usr/bin/env python3
"""Validator for the Good Hands retest 2 source packet. Run with: python3 -I validate-quotes.py [--print-only]
Reads only files inside this packet directory (plus, for a source-hash cross-check, the original absolute paths in source-map.json when they still exist).
Writes primary-quote-validation.json next to itself unless --print-only. Exit 1 on any failed check."""
import json, hashlib, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PRINT_ONLY = '--print-only' in sys.argv
PIN = 'd9dd8e0f27f8efee2abeda2fc32e9b8bdd7c0884'
ORDER = ['jonas', 'aisha', 'diego', 'rosa', 'elena']
NAMES = {'jonas': 'Jonas Berg', 'aisha': 'Aisha Rahman', 'diego': 'Diego Silva', 'rosa': 'Rosa Alvarez', 'elena': 'Elena Dimitrova'}
HIST = {'jonas': 1062, 'aisha': 980, 'diego': 1237, 'rosa': 2122, 'elena': 5}
CC = {'jonas': (72, 71, 0, 0), 'aisha': (81, 79, 1, 1), 'diego': (85, 80, 1, 4), 'rosa': (74, 71, 1, 2), 'elena': (101, 99, 0, 2)}
T10 = {2621, 2623, 2624, 2628}
C14 = {2621}
HF = 'docs/lab/reviews/light-2026-10-30/goodhands-retest2'

sha = lambda b: hashlib.sha256(b).hexdigest()
rd = lambda p: open(os.path.join(HERE, p), 'rb').read()
rj = lambda p: json.loads(rd(p).decode('utf-8'))
checks = []
def chk(name, ok, detail=''):
    checks.append({'check': name, 'ok': bool(ok), 'detail': str(detail)[:300] if not ok else ''})

# --- A. source hashes and forbidden content
sm = rj('source-map.json')
for f in sm['files']:
    b = rd(f['packet'])
    chk(f'packet copy hash {f["packet"]}', sha(b) == f['sha256'] and len(b) == f['bytes'])
    if os.path.exists(f['source']):
        chk(f'original source hash {f["packet"]}', sha(open(f['source'], 'rb').read()) == f['sha256'])
    else:
        chk(f'original source present {f["packet"]}', False, f['source'])
chk('source-map lists no generated or index file', not any(re.search(r'^(manifest|sha256|primary-quote-validation|source-map)\.json$', f['packet']) for f in sm['files']))
chk('input-preflight absent at source and not invented', sm['absentAtSource'][0]['existsAtSource'] is False and not os.path.exists(os.path.join(HERE, 'inputs/goodhands-retest2-input-preflight.json')))
chk('command-scope-audit not copied', not any('command-scope' in f['packet'] or 'command-scope' in f['source'] for f in sm['files']) and not os.path.exists(os.path.join(HERE, 'inputs/goodhands-retest2-command-scope-audit.json')))
allfiles = [os.path.relpath(os.path.join(d, n), HERE) for d, _, ns in os.walk(HERE) for n in ns]
chk('no transcript, processes, stderr, png or envelope in ready', not [f for f in allfiles if re.search(r'(transcript|processes|stderr|envelope|\.png$)', f)])
for t in ORDER:
    chk(f'{t} report.md byte-identical to report.original.md.txt', rd(f'{t}/report.md') == rd(f'{t}/report.original.md.txt'))

# --- B. locators with mutation canary
reports = {t: rd(f'{t}/report.md').decode('utf-8') for t in ORDER}
rlines = {t: reports[t].split('\n') for t in ORDER}
ex = rj('exact-quote-extraction.json')['testers']
def locator_ok(t, L):
    line = rlines[t][L['line'] - 1]
    sp = L['span']
    return line[L['charStart']:L['charStart'] + len(sp)] == sp and '|' not in sp and '\n' not in sp and len(sp) > 0 and (L.get('prefix') is None or line.startswith(L['prefix']))
def all_locs(t):
    e = ex[t]
    out = [('opening', e['primaryReturnLocator']), ('later', e['laterFullReturnLocator'])]
    out += [(x['label'], x) for x in e['laterExtraReturnSpans']]
    out += [(f'ranked {i + 1}', x) for i, x in enumerate(e['rankedAskLocators'])]
    out += [(f'sec8 {i + 1}', x) for i, x in enumerate(e['sectionEightAsks'])]
    for j, lst in e['laterAskSpans'].items():
        out += [(f'ask {j} {x["label"]}', x) for x in lst]
    for u in e['unrankedLeads']:
        out += [(f'unranked {u["key"]} {x["label"]}', x) for x in u['spans']]
    return out
nloc = 0
canary = 0
for t in ORDER:
    for name, L in all_locs(t):
        nloc += 1
        chk(f'{t} locator {name} line {L["line"]}', locator_ok(t, L))
        m = dict(L); m['charStart'] = L['charStart'] + 1
        if locator_ok(t, m) and len(set(L['span'])) > 1 and L['span'][0] != L['span'][-1]:
            chk(f'{t} canary accepted a shifted locator {name}', False)
        canary += 1
    e = ex[t]
    chk(f'{t} opening on report line 1', e['primaryReturnLocator']['line'] == 1)
    chk(f'{t} ranked asks are report lines 4 to 6 numbered 1 2 3', [x['line'] for x in e['rankedAskLocators']] == [4, 5, 6] and [x['prefix'] for x in e['rankedAskLocators']] == ['1. ', '2. ', '3. '])
    s8 = [i + 1 for i, l in enumerate(rlines[t]) if l.startswith('## 8.')]
    chk(f'{t} section 8 asks sit after the section 8 heading', all(x['line'] > s8[0] for x in e['sectionEightAsks']) if e['sectionEightAsks'] else t == 'elena')
    chk(f'{t} opening==later flag matches the text', e['openingEqualsLater'] == (e['primaryReturnLocator']['span'] == e['laterFullReturnLocator']['span']))
chk('Aisha and Diego opening and later are identical (recorded, not asserted different)', ex['aisha']['openingEqualsLater'] and ex['diego']['openingEqualsLater'])
chk('Jonas, Rosa and Elena opening and later differ', not any(ex[t]['openingEqualsLater'] for t in ('jonas', 'rosa', 'elena')))
chk('Elena has no section 8 asks and the report says see the ranked asks', ex['elena']['sectionEightAsks'] == [] and rlines['elena'][84].startswith('See the ranked asks'))

# --- C. rows regenerated from the extraction, independently of build.py
def words_return(e):
    w = f'Opening return: "{e["primaryReturnLocator"]["span"]}" Separate later return: "{e["laterFullReturnLocator"]["span"]}"'
    for x in e['laterExtraReturnSpans']:
        w += f' {x["label"]}: "{x["span"]}"'
    for u in e['unrankedLeads']:
        w += f' Folded unranked lead {u["key"]} (classification {u["classification"]}, target {u["target"]}):'
        for x in u['spans']:
            w += f' {x["label"]}: "{x["span"]}"'
    return w
def words_ask(e, j):
    w = f'"{e["rankedAskLocators"][j]["span"]}"'
    for x in e['laterAskSpans'][str(j + 1)]:
        w += f' {x["label"]}: "{x["span"]}"'
    return w
rows = rj('ledger-rows.json')
text = rd('ledger-additions.md').decode('utf-8')
tl = [l for l in text.split('\n') if re.match(r'^\| F-\d', l)]
chk('exactly 20 table rows', len(tl) == 20 and len(rows) == 20)
chk('ids F-2611 to F-2630 in order, F-2631 to F-2640 unused', [r['id'] for r in rows] == [f'F-{n}' for n in range(2611, 2631)] and not re.search(r'F-26(3[1-9]|40)\b', ''.join(tl)))
for i, r in enumerate(rows):
    num = int(r['id'][2:]); t = r['tester']; e = ex[t]
    chk(f'{r["id"]} tester order', t == ORDER[(num - 2611) if num <= 2615 else (num - 2616) // 3])
    exp = words_return(e) if num <= 2615 else words_ask(e, (num - 2616) % 3)
    chk(f'{r["id"]} words regenerate exactly from the extraction', r['words'] == exp)
    cells = tl[i].split(' | ')
    chk(f'{r["id"]} rendered row matches json and table', r['rendered'] == tl[i] and tl[i].startswith(f'| {r["id"]} | 2026-10-31 | goodhands | playtester | Fictional LIGHT panel: {NAMES[t]} | '))
    route = r['route']
    tgt = '2026-11-10' if num in T10 else '2026-11-03'
    chk(f'{r["id"]} route vocabulary', route.startswith('fix:goodhands ') and route.count('fix:') == 1 and 'blocker:' not in route and '|' not in route
        and route.count(';') == (1 if num in C14 else 0) and route.count('calibration:') == (1 if num in C14 else 0)
        and route.endswith(f', target{tgt} (open)' + ('; calibration:C14' if num in C14 else '')) and (not num in C14 or route.endswith('; calibration:C14')))
    chk(f'{r["id"]} row ends with the source path column', tl[i].endswith(f'| {HF}/{t}/report.md |') and '| mixed | ' in tl[i])
    every = [L for _, L in ([('o', e['primaryReturnLocator']), ('l', e['laterFullReturnLocator'])] + [(0, x) for x in e['laterExtraReturnSpans']] + [(0, x) for u in e['unrankedLeads'] for x in u['spans']])] if num <= 2615 else [e['rankedAskLocators'][(num - 2616) % 3]] + e['laterAskSpans'][str((num - 2616) % 3 + 1)]
    chk(f'{r["id"]} every extracted span appears in the row inside double quotes', all(f'"{L["span"]}"' in r['words'] for L in every))
    chk(f'{r["id"]} no truncation marker added by the preparer', '[...]' not in r['words'] and '(...)' not in r['words'])
chk('only F-2621 carries calibration:C14', [r['id'] for r in rows if 'calibration:' in r['route']] == ['F-2621'])
chk('Nov 10 targets are exactly F-2621 F-2623 F-2624 F-2628', [r['id'] for r in rows if 'target2026-11-10' in r['route']] == [f'F-{n}' for n in sorted(T10)])
byid = {r['id']: r for r in rows}
need = {  # editorial and source facts the brief requires on specific rows
    'F-2611': ['9700', 'not left running', 'process miss'], 'F-2612': ['AND', 'no sending step', 'identical'], 'F-2613': ['identical', 'not reached'],
    'F-2614': ['only if the weighing paragraph is shortened', 'would still come back', 'both are kept'], 'F-2615': ['not leave it running in the background', 'b-003 was saved but not viewed', 'BOTH owner-required labels'],
    'F-2616': ['no invented limit', 'no unlimited-fee claim'], 'F-2617': ['no numerical weighting-regression claim'], 'F-2621': ['not authorization to violate slowdown policy', 'no C14 layout or wording or recovery gate'],
    'F-2620': ['no blanket owner-permission gate', 'no invented personal facts'], 'F-2628': ['not proof that all state is equal', 'no blanket owner-permission gate'], 'F-2630': ['not a proven leak or money error'],
    'F-2619': ['no sending step', 'nothing is claimed delivered or repaired'], 'F-2629': ['nothing was delivered or repaired'], 'F-2622': ['contrary evidence'], 'F-2623': ['no causal money defect'],
}
for k, subs in need.items():
    chk(f'{k} route states {subs}', all(s in byid[k]['route'] for s in subs), byid[k]['route'][:200])
chk('F-2611 route does not claim a trial consequence', 'no trial consequence is established' in byid['F-2611']['route'])
chk('F-2612 and F-2613 openings: Aisha two conditions in the quoted text', ' and ' in ex['aisha']['primaryReturnLocator']['span'] and 'only if' in ex['aisha']['primaryReturnLocator']['span'])
chk('Rosa opening quote has only if and later quote has would still', 'only if' in ex['rosa']['primaryReturnLocator']['span'] and 'would' in ex['rosa']['laterFullReturnLocator']['span'])
chk('Elena later quote states the condition and the extra quotes cover no background running', 'condition' in ex['elena']['laterFullReturnLocator']['span'] and 'background' in ' '.join(x['span'] for x in ex['elena']['laterExtraReturnSpans']) + ex['elena']['laterFullReturnLocator']['span'] + ex['elena']['primaryReturnLocator']['span'], 'check wording at seal')
un = {t: {u['key']: u for u in ex[t]['unrankedLeads']} for t in ORDER}
chk('unranked leads present with class and date', [(t, k, u['classification'], u['target']) for t in ORDER for k, u in un[t].items()] == [
    ('jonas', 'salary-header-before-question', 'producer-new-blocker', '2026-11-03'), ('diego', 'fast-pace-not-sticking-and-missing-skip', 'source-annoyance', '2026-11-03'),
    ('rosa', 'bench-marks-meaning', 'source-observation', '2026-11-03'), ('elena', 'disabled-style-menu-arrival-clock', 'source-observation', '2026-11-03'), ('elena', 'feedback-stop-labels-clarity', 'clarity-preference', '2026-11-10')])
chk('Elena feedback-stop-label span contains both stop labels', all(s in ' '.join(x['span'] for x in un['elena']['feedback-stop-labels-clarity']['spans']) for s in ("I'd stop here", "I'm stopping")))
chk('no ledger text claims the letter was delivered or repaired', not re.search(r'(letter (was|is) (delivered|repaired|sent))', text))

# --- D. raw wall-clock: reactions, stops, early flags, counts
rx = rj('all-driver-reactions.json')['sessions']
cf = rj('checkpoint-facts.json')
audit = rj('inputs/goodhands-retest2-final-driver-audit.json')
plan = {p['first']: p for p in rj('inputs/goodhands-retest2-plan.json')}
cl = rj('inputs/goodhands-retest2-cleanup.json')
tot_react = 0
for s in rx:
    t, d = s['testerKey'], s['device']
    raw = rd(f'{t}/{d}/wall-clock.jsonl')
    rs = [json.loads(x) for x in raw.decode('utf-8').split('\n') if x.strip()]
    gen = [{'rowIndex': i, 'elapsed_s': r['elapsed_s'], 'kind': r['kind'], 'op': r['op'], 'reaction': r['reaction'], 'containsBackslash': '\\' in r['reaction'], 'notLiterallyInReport': r['reaction'] not in reports[t]} for i, r in enumerate(rs) if r.get('reaction')]
    chk(f'{t} {d} reactions regenerate from raw rows', gen == s['reactions'] and s['rawSha256'] == sha(raw) and s['rows'] == len(rs))
    tot_react += len(gen)
    stops = [r for r in rs if r['kind'] == 'stop']
    chk(f'{t} {d} exactly one stop row, equal to the audit stop', len(stops) == 1 and stops[0]['elapsed_s'] == audit[t]['sessions'][d]['stop']['elapsed_s'], [x['elapsed_s'] for x in stops])
    fm = [r for r in rs if r['kind'] == 'first_minute' and r['op'] == 'log']
    pu = [r for r in rs if r['kind'] == 'pulse']
    f = cf['testers'][t]['sessions'][d]
    chk(f'{t} {d} early flags recomputed from raw elapsed', f['pulseEarlyBelow180'] == [r['elapsed_s'] for r in pu if r['elapsed_s'] < 180] and [x['earlyBelow60'] for x in f['firstMinuteRows']] == [r['elapsed_s'] < 60 for r in rs if r['kind'] == 'first_minute'])
    rel = rj(f'{t}/{d}/release-start.json')
    chk(f'{t} {d} release pin', rel['commit'] == PIN and rel['framework'] == '4.8.1' and rel['app'] == '0.1.0' and rel['dirty'] is False)
    first = json.loads(rd(f'{t}/{d}/driver.out').decode('utf-8').split('\n')[0])
    chk(f'{t} {d} driver.out port equals plan port', first['port'] == plan[t]['ports'][d] and first['driver'] == 'native-tap-v2' and first['driver_check'] == 'fork-unverified')
    sh_ = [r['input'].get('file') for r in rs if r['op'] == 'shot' and r['input'].get('file')]
    chk(f'{t} {d} audit imageReads are shots the tester made', set(f['auditImageReadFiles']) <= set(sh_) | {'first-minute.png'})
chk('reaction totals present', tot_react > 0, tot_react)
chk('Jonas phone stop is before 60 s', cf['testers']['jonas']['sessions']['phone']['stopElapsedS'][0] < 60)
chk('Aisha desktop first-minute raw 58.112 is early', 58.112 in [x['elapsed_s'] for x in cf['testers']['aisha']['sessions']['desktop']['firstMinuteRows']])
chk('Elena phone pulse 170.902 is early and desktop has no pulse', cf['testers']['elena']['sessions']['phone']['pulseEarlyBelow180'] == [170.902] and cf['testers']['elena']['sessions']['desktop']['pulseElapsedS'] == [])
stops = {t: {d: cf['testers'][t]['sessions'][d]['stopElapsedS'][0] for d in plan[t]['order']} for t in ORDER}
chk('stops match the brief', stops['jonas'] == {'desktop': 240.77, 'phone': 39.685} and stops['aisha'] == {'desktop': 202.653, 'phone': 94.493} and stops['diego'] == {'desktop': 198.671, 'phone': 195.112}
    and stops['rosa']['phone'] == 205.24 and stops['rosa']['desktop'] == 86.771 and stops['elena'] == {'phone': 230.675, 'desktop': 138.331}, stops)
cc = rj('inputs/goodhands-retest2-command-counts.json')
chk('command counts reconcile', sum(v[0] for v in CC.values()) == 413 and sum(v[1] for v in CC.values()) == 400 and sum(v[2] for v in CC.values()) == 3 and sum(v[3] for v in CC.values()) == 9
    and all(cc['testers'][t]['bash'] == CC[t][0] and cc['testers'][t]['strictAssignedCurls'] == CC[t][1] for t in ORDER) and sum(v['nonStrictExtra'] for v in cc['testers'].values()) == 1 and cc['testers']['jonas']['nonStrictExtra'] == 1)
for t in ORDER:
    q = json.dumps(rj(f'{t}/director-method-qualification.json'), ensure_ascii=False)
    if t == 'jonas':
        chk('jonas qualification names 71 other strict commands and one disclosed extra fee-tap curl (72 total comes from the brief safe counts)', '71' in q and 'hid an extra fee-tap' in q)
    else:
        chk(f'{t} qualification text mentions its Bash and strict curl counts', f'{CC[t][0]}' in q and f'{CC[t][1]}' in q)

# --- E. identity, history, cleanup
idx = rj('identity-index.json')['testers']
pre = {p['tester']: p for p in rj('inputs/goodhands-retest2-predispatch.json')['players']}
for t, i in zip(ORDER, idx):
    d = rj(f'{t}/dispatch.json')
    chk(f'{t} identity lines, brief hash and history hash', i['historyLines'] == HIST[t] and pre[NAMES[t]]['lines'] == HIST[t] and sha(rd(f'{t}/brief.original.md.txt')) == d['briefSha256'] == i['briefSha256'] and sha(rd(f'{t}/own-history.original.md.txt')) == d['ownHistorySha256'] == i['historySha256'])
    chk(f'{t} dispatch pin and driver hashes', d['commit'] == PIN and d['driverInstrument']['hashes'] == cf['driver']['hashes'])
    ha = [h for h in rj('inputs/goodhands-retest2-history-read-audit.json') if h['tester'] == t][0]
    chk(f'{t} history read audit all lines read', ha['allActualLinesRead'] and ha['actualHistoryLines'] == HIST[t] and ha['unreadLines'] == [])
chk('cleanup: 15 PIDs absent, ports 22800 to 22809 closed', len(cl['recordedPIDs']) == 15 and cl['all15RecordedPIDsAbsent'] and [p['port'] for p in cl['ports'] if p['closed']] == list(range(22800, 22810)))
rsx = rj('inputs/goodhands-retest2-round-state.json')
chk('round state: closed, 5 reports, 10 stops, game not finished', rsx['closed'] and rsx['reports'] == 5 and rsx['stops'] == 10 and rsx['gameFinished'] is False and rsx['lastActualReturn'] == '2026-10-31T11:01:06.244095+00:00' and rsx['nextRoundNotBefore'] == '2026-10-31T11:16:06.244095+00:00')
chk('final release pin', rj('inputs/goodhands-retest2-final-release-after-round.json')['release'] == {'app': '0.1.0', 'framework': '4.8.1', 'commit': PIN, 'dirty': False})

# --- F. screenshots
shots = rj('screenshots-manifest.json')
chk('34 screenshot hashes', len(shots) == 34)
for s in shots:
    if os.path.exists(s['privatePath']):
        chk(f'png hash {s["testerKey"]} {s["device"]} {os.path.basename(s["privatePath"])}', sha(open(s['privatePath'], 'rb').read()) == s['sha256'] and os.path.getsize(s['privatePath']) == s['bytes'])
    else:
        chk(f'png present {s["privatePath"]}', False)
e3 = [s for s in shots if s['testerKey'] == 'elena' and s['device'] == 'desktop' and s['privatePath'].endswith('b-003.png')]
chk('Elena desktop b-003 saved but not viewed', len(e3) == 1 and e3[0]['testerImageReadReceipt'] is False)
chk('image-read receipts equal the audit', all(s['testerImageReadReceipt'] == (os.path.basename(s['privatePath']) in cf['testers'][s['testerKey']]['sessions'][s['device']]['auditImageReadFiles']) for s in shots if s['testerImageReadReceipt'] is not None))
chk('first-minute captures flagged as automatic', all(s['testerImageReadReceipt'] is None and 'automatic' in s['capture'] for s in shots if s['privatePath'].endswith('first-minute.png')))

# --- G. indexes (noncircular) when they exist
for name in ('manifest.json', 'sha256.json'):
    if os.path.exists(os.path.join(HERE, name)):
        pass
if os.path.exists(os.path.join(HERE, 'manifest.json')):
    man = rj('manifest.json')['files']
    mp = {m['path'] for m in man}
    chk('manifest excludes itself and sha256.json and the validator result', not (mp & {'manifest.json', 'sha256.json', 'primary-quote-validation.json'}))
    chk('manifest hashes match', all(sha(rd(m['path'])) == m['sha256'] and len(rd(m['path'])) == m['bytes'] for m in man))
    chk('manifest covers every payload file except the three index outputs', mp == set(allfiles) - {'manifest.json', 'sha256.json', 'primary-quote-validation.json'})
if os.path.exists(os.path.join(HERE, 'sha256.json')):
    sj = rj('sha256.json')['files']
    chk('sha256.json excludes itself and hashes match', 'sha256.json' not in sj and all(sha(rd(p)) == h for p, h in sj.items()))
    chk('sha256.json covers every file except itself', set(sj) == set(allfiles) - {'sha256.json'}, sorted(set(allfiles) - {'sha256.json'} - set(sj))[:5])
    pq = os.path.exists(os.path.join(HERE, 'primary-quote-validation.json'))
    chk('validator result exists before the indexes were built', pq)

res = {'validator': 'validate-quotes.py', 'locatorsChecked': nloc, 'mutationCanariesRun': canary, 'checks': len(checks), 'failed': [c for c in checks if not c['ok']], 'passed': sum(c['ok'] for c in checks),
       'note': 'Checks listed by name are in the checks array. Recomputed from the copied sources inside this packet. Parent seal pending. Not a canonical, game-fix or acceptance claim.', 'all': checks}
if not PRINT_ONLY:
    open(os.path.join(HERE, 'primary-quote-validation.json'), 'w', encoding='utf-8').write(json.dumps(res, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({k: res[k] for k in ('locatorsChecked', 'mutationCanariesRun', 'checks', 'passed')}), 'FAILED:', [c['check'] for c in res['failed']][:15])
sys.exit(1 if res['failed'] else 0)
