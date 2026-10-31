#!/usr/bin/env python3
"""Validate the rope-retest1 packet. Run in this directory: python3 -I -B validate-quotes.py
Every check is computed from packet files. A one-character-changed canary proves span checks can fail.
It proves source identity and internal consistency only; it does not test game behaviour, population, or acceptance."""
from pathlib import Path
import hashlib, json, re, sys

H = Path(__file__).resolve().parent
TESTERS = ['pavel', 'tessa', 'nia', 'rosa', 'farah']
NAMES = {'pavel': 'Pavel Novak', 'tessa': 'Tessa Williams', 'nia': 'Nia Okafor', 'rosa': 'Rosa Alvarez', 'farah': 'Farah Bensaid'}
DEV = ('phone', 'desktop')
PIN = '99a42270b014a54f490dc4b20b2c5f77b88b5dfb'
# Parent target table, typed from the preparation brief (the copied inputs carry no per-row target table).
T10 = {2587, 2590, 2594}
C14 = {2587, 2594}
HIST_LINES = {'pavel': 806, 'tessa': 756, 'nia': 1097, 'rosa': 1921, 'farah': 5}
STOP = {('pavel', 'desktop'): (271.27, 'BORED'), ('pavel', 'phone'): (230.551, 'TASTE'), ('tessa', 'phone'): (190.697, 'BORED'), ('tessa', 'desktop'): (190.582, 'TASTE'),
        ('nia', 'phone'): (199.556, 'BORED'), ('nia', 'desktop'): (253.14, 'BORED'), ('rosa', 'phone'): (195.581, 'BORED'), ('rosa', 'desktop'): (194.079, 'BORED'),
        ('farah', 'phone'): (345.735, 'CONFUSED'), ('farah', 'desktop'): (324.278, 'CONFUSED')}

# producer labelled new blockers per the parent brief: Nia section 9 three, Rosa section 9 two chosen. Everything else unranked is a source observation.
PNB = {'nia': {'wants-to-wait-before-waiting', 'going-down-speech-versus-actual-climb', 'cannot-hear-greyed-buttons'},
       'rosa': {'reading-note-and-first-lead-on-uncertainty', 'auto-filled-feedback-note'}}
OBS = {'rosa': {'desktop-path-under-right-panel'}, 'farah': {'collapsed-weather-heading', 'wren-wants-to-wait-while-climbing', 'people-shown-walking-up-before-asked'}}

res = []


def chk(name, ok, detail=''):
    res.append({'check': name, 'ok': bool(ok), 'detail': str(detail)[:300]})


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def J(rel):
    return json.loads((H / rel).read_text(encoding='utf-8'))


def rows(t, d):
    return [json.loads(l) for l in (H / t / d / 'wall-clock.jsonl').read_text(encoding='utf-8').splitlines()]


rep = {t: (H / t / 'report.md').read_text(encoding='utf-8') for t in TESTERS}
lines = {t: rep[t].split('\n') for t in TESTERS}


def loc_ok(t, loc, span=None):
    span = loc['span'] if span is None else span
    if '|' in span or '\n' in span or not span:
        return False
    ln = loc['line']
    if ln < 1 or ln > len(lines[t]):
        return False
    line = lines[t][ln - 1]
    if loc['mode'] == 'after-label':
        return line == loc.get('prefix', '') + span
    if loc['mode'] == 'inline':
        return span in line
    return False


def canary(span):
    return span[:-1] + ('x' if span[-1] != 'x' else 'y')


n_span = 0
n_canary_fail = 0


def check_loc(label, t, loc):
    global n_span, n_canary_fail
    n_span += 1
    ok = loc_ok(t, loc)
    chk(f'span {label}', ok, f"{t} line {loc['line']}")
    if loc['mode'] == 'inline':
        bad = not loc_ok(t, loc, canary(loc['span']))
    else:
        bad = not loc_ok(t, loc, canary(loc['span']))
    n_canary_fail += 1 if bad else 0
    chk(f'canary fails {label}', bad)


# 0. identical bytes
for t in TESTERS:
    chk(f'{t} report == report.original.md.txt', (H / t / 'report.md').read_bytes() == (H / t / 'report.original.md.txt').read_bytes())

# 1. extraction spans
ex = J('exact-quote-extraction.json')
chk('extraction has five testers', sorted(ex['testers']) == sorted(TESTERS))
for t in TESTERS:
    e = ex['testers'][t]
    check_loc(f'{t} opening', t, e['primaryReturnLocator'])
    chk(f'{t} primaryReturn equals locator span', e['primaryReturn'] == e['primaryReturnLocator']['span'])
    if t in ('nia', 'farah'):
        lit = e['primaryReturnAfterLabelLiteral']
        chk(f'{t} literal wraps inner in quotes', lit == '"' + e['primaryReturn'] + '"')
        l1 = lines[t][e['primaryReturnLocator']['line'] - 1]
        chk(f'{t} literal present on the opening line', lit in l1)
    check_loc(f'{t} later return', t, e['laterFullReturnLocator'])
    chk(f'{t} laterFullReturn equals locator span', e['laterFullReturn'] == e['laterFullReturnLocator']['span'])
    chk(f'{t} opening and later return are different texts', e['primaryReturn'] != e['laterFullReturn'])
    for k, sp in enumerate(e['laterExtraReturnSpans']):
        check_loc(f'{t} later extra {k}', t, sp)
    # ranked asks are exactly the top three numbered lines before the Session heading
    end = next(i for i, l in enumerate(lines[t]) if re.match(r'^#+ 1\. ', l))
    top = [re.sub(r'^\d+\. ', '', l) for l in lines[t][:end] if re.match(r'^\d+\. ', l)]
    got = {b['key']: b['classification'] for b in e['unrankedBlockingClauses']}
    want = {**{k: 'producer-new-blocker' for k in PNB.get(t, ())}, **{k: 'source-observation' for k in OBS.get(t, ())}}
    chk(f'{t} unranked clause keys and classification match the brief', got == want, got)
    chk(f'{t} three ranked asks from the report', top == e['rankedAsks'] and len(top) == 3)
    for j, loc in enumerate(e['rankedAskLocators'], 1):
        check_loc(f'{t} ask {j}', t, loc)
        chk(f'{t} ask {j} prefix', loc.get('prefix') == f'{j}. ')
    for k, sp in enumerate(e['sectionEightAsks']):
        check_loc(f'{t} section 8 ask {k + 1}', t, sp)
        chk(f'{t} section 8 ask {k + 1} sameAsRankedAsk flag', sp['sameAsRankedAsk'] == (sp['span'] == e['rankedAsks'][k]))
    for j in '123':
        for k, sp in enumerate(e['laterAskSpans'][j]):
            check_loc(f'{t} ask {j} later {k}', t, sp)
            chk(f'{t} ask {j} later {k} labelled', bool(sp['label']))
    for b in e['unrankedBlockingClauses']:
        chk(f'{t} unranked {b["key"]} has spans', len(b['spans']) >= 1)
        chk(f'{t} unranked {b["key"]} has non-null target and route metadata', bool(b['target']) and b['routeDescriptionMetadata'].startswith('fix:rope ') and bool(b['rowRouteClause']))
        chk(f'{t} unranked {b["key"]} target matches brief', b['target'] == ('2026-11-10' if b['key'] == 'auto-filled-feedback-note' else '2026-11-03'))
        chk(f'{t} unranked {b["key"]} no semicolon or pipe', ';' not in b['routeDescriptionMetadata'] + b['rowRouteClause'] and '|' not in b['rowRouteClause'])
        for k, sp in enumerate(b['spans']):
            check_loc(f'{t} unranked {b["key"]} {k}', t, sp)
for k, s in enumerate(ex['supportingSpans']):
    f = s['file']
    if s['mode'] == 'raw-reaction':
        t, d = f.split('/')[0], f.split('/')[1]
        r = [x for x in rows(t, d) if x['elapsed_s'] == s['elapsed_s'] and s['span'] in (x.get('reaction') or '')]
        chk(f'supporting raw {k} {s["label"]}', len(r) == 1)
        chk(f'canary raw {k}', not [x for x in rows(t, d) if x['elapsed_s'] == s['elapsed_s'] and canary(s['span']) in (x.get('reaction') or '')])
        n_span += 1
        n_canary_fail += 1
    else:
        check_loc(f'supporting {k} {s["label"]}', f.split('/')[0], s)

# 2. ledger regenerated independently from the extraction
q = lambda s: '"' + s + '"'


def ret_words(t):
    e = ex['testers'][t]
    w = f'Opening return: {q(e["primaryReturn"])} Separate later return: {q(e["laterFullReturn"])}'
    for sp in e['laterExtraReturnSpans']:
        w += f' {sp["label"]}: {q(sp["span"])}'
    for b in e['unrankedBlockingClauses']:
        tag = 'Producer labelled new blocking clause' if b['classification'] == 'producer-new-blocker' else 'Source observation, not a producer labelled new blocker'
        for sp in b['spans']:
            w += f' {tag} ({b["key"]}) {sp["label"]}: {q(sp["span"])}'
    return w


def ask_words(t, j):
    e = ex['testers'][t]
    w = q(e['rankedAsks'][j - 1])
    for sp in e['laterAskSpans'][str(j)]:
        w += f' {sp["label"]}: {q(sp["span"])}'
    return w


text = (H / 'ledger-additions.md').read_text(encoding='utf-8')
trs = [l for l in text.split('\n') if l.startswith('| F-')]
chk('20 ledger rows', len(trs) == 20, len(trs))
ids = []
fix_count = 0
for k, l in enumerate(trs):
    c = [x.strip() for x in l.strip().strip('|').split(' | ')]
    chk(f'row {k} has 9 cells', len(c) == 9, len(c))
    if len(c) != 9:
        continue
    n = int(c[0][2:])
    ids.append(n)
    ti = (k if k < 5 else (k - 5) // 3)
    t = TESTERS[ti]
    chk(f'{c[0]} id order', n == (2581 + k))
    chk(f'{c[0]} columns', c[1:5] == ['2026-10-31', 'rope', 'playtester', f'Fictional LIGHT panel: {NAMES[t]}'] and c[6] == 'mixed')
    want = ret_words(t) if k < 5 else ask_words(t, (k - 5) % 3 + 1)
    chk(f'{c[0]} words regenerated from extraction', c[5] == want)
    chk(f'{c[0]} source', c[8] == f'docs/lab/reviews/light-2026-10-30/rope-retest1/{t}/report.md')
    route = c[7]
    parts = [p.strip() for p in route.split(';')]
    tgt = '2026-11-10' if n in T10 else '2026-11-03'
    chk(f'{c[0]} exactly one fix:rope', route.count('fix:rope') == 1 and parts[0].startswith('fix:rope '))
    chk(f'{c[0]} first part target {tgt} open', parts[0].endswith(f'target{tgt} (open)'))
    fix_count += route.count('fix:rope')
    if n in C14:
        chk(f'{c[0]} C14 only on 2587/2594', parts[1:] == ['calibration:C14'])
    else:
        chk(f'{c[0]} no C14 token', 'calibration:C14' not in route)
    chk(f'{c[0]} no blocker route type and no semicolon inside the fix part', 'blocker:' not in route and ';' not in parts[0])
    chk(f'{c[0]} every route part is an allowed vocabulary item', all(re.match(r'^(fix:[a-z][a-z0-9-]* .+|calibration:C14)$', p) for p in parts))
    if k < 5:
        chk(f'{c[0]} fix part contains each unranked clause in order', all(b['rowRouteClause'] in parts[0] for b in ex['testers'][t]['unrankedBlockingClauses']) and parts[0].count(', also an unranked ') == len(ex['testers'][t]['unrankedBlockingClauses']))
        chk(f'{c[0]} row-date tail kept', parts[0].endswith(f'target{tgt} (open)') and 'calibration:C14' not in route)
    elif n not in C14:
        chk(f'{c[0]} ask row has only the fix part', len(parts) == 1)
chk('ids 2581..2600 contiguous', ids == list(range(2581, 2601)))
chk('no row F-2601..F-2610', not re.search(r'\| F-26(0[1-9]|10) \|', text))
chk('20 fix:rope tokens total', fix_count == 20)
chk('no fourth ranked ask text', all(len(ex['testers'][t]['rankedAsks']) == 3 for t in TESTERS))
# F-2588 must carry its conditional C14 clause but not a calibration part
r2588 = [l for l in trs if l.startswith('| F-2588 ')][0]
chk('F-2588 conditional C14 clause present, no calibration part', 'C14 only if' in r2588 and 'calibration:C14' not in r2588)

# 3. ask-ledger md/json
al = J('ask-ledger.json')
chk('ask-ledger.json 15 rows', len(al['rows']) == 15)
amd = [l for l in (H / 'ask-ledger.md').read_text(encoding='utf-8').split('\n') if l.startswith('| F-')]
chk('ask-ledger.md equals ledger rows 6..20', amd == trs[5:])
for k, r in enumerate(al['rows']):
    t = TESTERS[k // 3]
    j = k % 3 + 1
    chk(f'{r["id"]} json words', r['words'] == ask_words(t, j) and r['rankedAsk'] == ex['testers'][t]['rankedAsks'][j - 1])
    chk(f'{r["id"]} json in md row', f'| {r["id"]} | 2026-10-31 | rope | playtester | Fictional LIGHT panel: {NAMES[t]} | {r["words"]} | mixed | {r["route"]} | {r["source"]} |' in amd)
    chk(f'{r["id"]} json target/C14', r['target'] == ('2026-11-10' if int(r['id'][2:]) in T10 else '2026-11-03') and r['calibrationC14'] == (int(r['id'][2:]) in C14))

# 4. logical ledger
lg = J('logical-tester-ledger.json')
chk('logical ledger 5 records', len(lg) == 5)
lmd = (H / 'logical-tester-ledger.md').read_text(encoding='utf-8')
for k, r in enumerate(lg):
    t = TESTERS[k]
    chk(f'{r["id"]} logical id/tester', r['id'] == f'F-{2581 + k}' and r['tester'] == NAMES[t] and r['verdict'] == 'mixed')
    chk(f'{r["id"]} returns equal extraction', r['primaryReturn'] == ex['testers'][t]['primaryReturn'] and r['laterFullReturn'] == ex['testers'][t]['laterFullReturn'])
    chk(f'{r["id"]} asks ids', r['askIds'] == [f'F-{2586 + k * 3 + i}' for i in range(3)])
    chk(f'{r["id"]} unranked blockers in logical ledger carry classification and target', all(b['classification'] and b['target'] for b in r['unrankedBlockingClauses']))
    chk(f'{r["id"]} route equals ledger row', f'| {r["route"]} |' in trs[k])
    chk(f'{r["id"]} in md', r['id'] in lmd and r['tester'] in lmd)
    for d, v in r['voluntaryStops'].items():
        rs = [x for x in rows(t, d) if x['kind'] == 'stop' and x['op'] == 'log']
        chk(f'{r["id"]} {d} stop == raw', len(rs) == 1 and rs[0]['elapsed_s'] == v['elapsed_s'] and rs[0]['reason'] == v['reason'] and rs[0]['reaction'] == v['rawStopReaction'])

# 5. hashes, stops, pins, pids, ports
inp = {n: J(f'inputs/rope-retest-{n}.json') for n in ['plan', 'predispatch', 'input-freeze', 'input-preflight', 'root-delivery-verification', 'final-driver-audit', 'final-release-after-round',
                                                         'cleanup', 'round-state', 'director-method-notes', 'history-read-audit', 'director-image-observations']}
plan = {p['first']: p for p in inp['plan']}
fz = {p['tester']: p for p in inp['input-freeze']['players']}
pf = {p['tester']: p for p in inp['input-preflight']['players']}
hra = {h['tester']: h for h in inp['history-read-audit']}
fda = inp['final-driver-audit']
pids = set(inp['cleanup']['recordedPIDs'])
idx = {x['id'].split('-')[-1]: x for x in J('identity-index.json')['testers']}
drv0 = None
for t in TESTERS:
    nm = NAMES[t]
    h = H / t / 'own-history.original.md.txt'
    b = H / t / 'brief.original.md.txt'
    disp, comp, val = J(f'{t}/dispatch.json'), J(f'{t}/completion.json'), J(f'{t}/validation.json')
    chk(f'{t} history sha == freeze == dispatch', sha(h) == fz[nm]['historySha256'] == disp['ownHistorySha256'], sha(h)[:12])
    chk(f'{t} brief sha == freeze == dispatch', sha(b) == fz[nm]['briefSha256'] == disp['briefSha256'], sha(b)[:12])
    chk(f'{t} preflight hashes agree', pf[nm].get('historySha256', sha(h)) == sha(h) and pf[nm].get('briefSha256', sha(b)) == sha(b))
    data = h.read_bytes()
    lc = len(data.split(b'\n')) - (1 if data.endswith(b'\n') else 0)
    chk(f'{t} history lines {HIST_LINES[t]}', lc == HIST_LINES[t] == hra[t]['actualHistoryLines'] == pf[nm]['historyLines'] == idx[t]['historyLines'], lc)
    chk(f'{t} history fully read, end marker on every successful read', hra[t]['allActualLinesRead'] and not hra[t]['unreadLines'] and all(r['success'] and r['endMarkerSeen'] is not None for r in hra[t]['reads']) and hra[t]['reads'][-1]['endMarkerSeen'])
    chk(f'{t} freeze characters == decoded history length', fz[nm]['characters'] == len(data.decode('utf-8')) or fz[nm]['characters'] == len(data), f"{fz[nm]['characters']} vs {len(data)}")
    chk(f'{t} dispatch commit {PIN[:8]}', disp['commit'] == PIN)
    hs = disp['driverInstrument']['hashes']
    drv0 = drv0 or hs
    chk(f'{t} driver hashes identical across dispatches', hs == drv0)
    chk(f'{t} completion exit 0 and two clean pins', comp['exit'] == 0 and len(comp['pins']) == 2 and all(p == {'app': '0.2.0', 'framework': '4.15.0', 'commit': PIN, 'dirty': False} for p in comp['pins']))
    chk(f'{t} dispatch time before completion end', disp['time'] < comp['ended'])
    chk(f'{t} validation == final-driver-audit sessions', fda[t]['sessions'] == val['sessions'])
    chk(f'{t} no unexpected reads', val['unexpectedReads'] == [] and fda[t]['unexpectedReads'] == [])
    chk(f'{t} qualification file present only for nia/rosa', (H / t / 'director-method-qualification.json').exists() == (t in ('nia', 'rosa')))
    for d in DEV:
        rs = rows(t, d)
        stop = [r for r in rs if r['kind'] == 'stop' and r['op'] == 'log']
        e, why = STOP[(t, d)]
        chk(f'{t} {d} one stop {e} {why}', len(stop) == 1 and stop[0]['elapsed_s'] == e and stop[0]['reason'] == why)
        chk(f'{t} {d} stop == validation.json', val['sessions'][d]['stop'] == stop[0])
        chk(f'{t} {d} stop within ceiling 1200 s', stop[0]['elapsed_s'] <= 1200)
        rel = J(f'{t}/{d}/release-start.json')
        chk(f'{t} {d} release-start commit {PIN[:8]}', PIN in json.dumps(rel) and 'true' not in json.dumps(rel.get('dirty', False)).lower(), json.dumps(rel)[:100])
        dout = json.loads((H / t / d / 'driver.out').read_text())
        chk(f'{t} {d} driver.out pid recorded, port == plan, driver v2', dout['pid'] in pids and dout['port'] == plan[t]['ports'][d] and dout['driver'] == 'native-tap-v2' and dout['driver_check'] == 'fork-unverified')
        chk(f'{t} {d} no early first_minute/pulse by raw elapsed', not any((r['kind'] == 'first_minute' and r['op'] == 'log' and r['elapsed_s'] < 60) or (r['kind'] == 'pulse' and r['op'] == 'log' and r['elapsed_s'] < 180) for r in rs))
        chk(f'{t} {d} validation early flags false', not val['sessions'][d]['earlyFirstMinute'] and not val['sessions'][d]['earlyPulse'])
        chk(f'{t} {d} rows have t and elapsed_s', all('t' in r and 'elapsed_s' in r for r in rs))
        chk(f'{t} {d} every error row has a tool error string', all(isinstance(r['error'], str) and r['error'] for r in rs if r['error']))
chk('plan device orders', [plan[t]['order'] for t in TESTERS] == [['desktop', 'phone'], ['phone', 'desktop'], ['phone', 'desktop'], ['phone', 'desktop'], ['phone', 'desktop']])

# 6. cleanup, command counts, round state
cl = inp['cleanup']
chk('15 recorded PIDs, all absent', len(cl['recordedPIDs']) == 15 and cl['all15RecordedPIDsAbsent'] is True)
chk('every driver.out pid is among them and distinct', len({json.loads((H / t / d / 'driver.out').read_text())['pid'] for t in TESTERS for d in DEV}) == 10)
late = cl['lateObserved']
chk('late identities 13 + 11 absent', sorted((x['tester'] if 'tester' in x else x.get('who', '')) for x in late if isinstance(x, dict) and 'identities' in x) and sum(x['identities'] for x in late if isinstance(x, dict) and 'identities' in x) == 24, json.dumps(late)[:200])
chk('10 ports all closed', len(cl['ports']) == 10 and all(p['closed'] for p in cl['ports']))
chk('ports match plan', sorted(p['port'] for p in cl['ports']) == sorted(v for t in TESTERS for v in plan[t]['ports'].values()))
cc = inp['director-method-notes']['commandCounts']
chk('command counts 361+4+3 = 368', cc['strictAssignedCurl'] + cc['executedDirectoryListingsOutsideBrief'] + cc['failedShellParsingBeforeRequest'] == cc['Bash'] == 368)
rs_ = inp['round-state']
chk('round state closed, 5 reports, 10 stops, HOLD released', rs_['closed'] is True and rs_['reports'] == 5 and rs_['stops'] == 10 and 'released' in rs_['HOLD'])
chk('next round = last return + 15 min', rs_['lastActualReturn'] == '2026-10-31T10:09:57.416798+00:00' and rs_['nextRoundNotBefore'] == '2026-10-31T10:24:57.416798+00:00' and cl['lastActualReturn'] == rs_['lastActualReturn'])
chk('last completion ended == last actual return', max(J(f'{t}/completion.json')['ended'] for t in TESTERS) == rs_['lastActualReturn'])
chk('post-round release pin', PIN in json.dumps(inp['final-release-after-round']))
chk('root delivery main pin and no browser', rdv_ok := (inp['root-delivery-verification']['main'] == PIN and inp['root-delivery-verification']['browserUsed'] is False))

# 7. reactions regenerated from the raw files
ar = J('all-driver-reactions.json')
rd = (H / 'README.md').read_text(encoding='utf-8')
chk('ten reaction sessions', len(ar['sessions']) == 10)
tot = 0
for s in ar['sessions']:
    t, d = s['testerKey'], s['device']
    raw = rows(t, d)
    want = [dict(r, rowIndex=i + 1) for i, r in enumerate(raw) if r.get('reaction')]
    got = [{k: v for k, v in r.items() if k not in ('containsBackslash', 'contextBefore')} for r in s['reactions']]
    chk(f'{t} {d} reactions regenerate from raw', got == want, len(got))
    chk(f'{t} {d} raw sha', s['rawSha256'] == sha(H / t / d / 'wall-clock.jsonl') and s['rows'] == len(raw))
    chk(f'{t} {d} backslash flag', all(r['containsBackslash'] == ('\\' in r['reaction']) for r in s['reactions']))
    nl = [r['elapsed_s'] for r in s['reactions'] if r['reaction'] not in rep[t]]
    chk(f'{t} {d} not-in-report count', nl == s['notLiterallyInReportElapsedS'] and len(nl) == s['reactionsNotLiterallyInReport'])
    chk(f'{t} {d} error rows w/o reaction counted', s['errorRowsWithoutReaction'] == sum(1 for r in raw if r['error'] and not r.get('reaction')))
    tot += len(got)
chk('README per-session reaction table matches recomputed counts', all(f"| {s['tester'].split()[0]} | {s['device']} | {s['reactionRows']} | {s['reactionsNotLiterallyInReport']} |" in rd for s in ar['sessions']) and f'{tot} reaction rows' in rd and f"{sum(len([r for r in s['reactions'] if r['reaction'] not in rep[s['testerKey']]]) for s in ar['sessions'])} are not literally" in rd)
chk('nia raw-driver-reactions.json equals wall-clock reaction rows', all(json.loads((H / 'nia/raw-driver-reactions.json').read_text())[d] == [r for r in rows('nia', d) if r.get('reaction')] for d in DEV))
ck = J('checkpoint-facts.json')
chk('checkpoint tool errors recomputed', all(ck['testers'][t]['sessions'][d]['toolErrors'] == [{'rowIndex': i + 1, 't': r['t'], 'elapsed_s': r['elapsed_s'], 'kind': r['kind'], 'op': r['op'], 'input': r['input'], 'error': r['error'], 'reaction': r['reaction']} for i, r in enumerate(rows(t, d)) if r['error']] for t in TESTERS for d in DEV))

# 8. screenshots manifest: hashes only
sm = J('screenshots-manifest.json')
chk('35 screenshot entries', len(sm) == 35, len(sm))
from collections import Counter
cnt = Counter((s['testerKey'], s['device']) for s in sm)
chk('each device <= 6 captures and <= 5 manual', all(v <= 6 for v in cnt.values()) and all(sum(1 for s in sm if (s['testerKey'], s['device']) == k and s['capture'] != 'driver automatic first-minute capture') <= 5 for k in cnt))
chk('receipts per device equal manual shots', all(len(ck['testers'][t]['sessions'][d]['imageReadReceipts']) == ck['testers'][t]['sessions'][d]['manualPngCount'] for t in TESTERS for d in DEV))
chk('every manifest sha is 64 hex and no image in packet', all(re.fullmatch(r'[0-9a-f]{64}', s['sha256']) for s in sm) and not list(H.rglob('*.png')))
chk('image receipts total 25', sum(len(ck['testers'][t]['sessions'][d]['imageReadReceipts']) for t in TESTERS for d in DEV) == 25)

# 9. source map: every copy maps byte exact; no cycle
sm_ = J('source-map.json')
chk('source-map files exist byte-exact', all((H / f['packet']).exists() and sha(H / f['packet']) == f['sha256'] and (H / f['packet']).stat().st_size == f['bytes'] for f in sm_['files']))
chk('source-map covers every non-generated file', {f['packet'] for f in sm_['files']} == {str(p.relative_to(H)) for p in H.rglob('*') if p.is_file() and (re.match(r'^(pavel|tessa|nia|rosa|farah)/', str(p.relative_to(H))) or str(p.relative_to(H)).startswith('inputs/')) and p.name not in ('README.md',)})
chk('source-map count = 5*(4+... ) dynamic', len(sm_['files']) == 85, len(sm_['files']))
chk('source-map absentAtSource lists exactly 3 absent qualification files', len(sm_['absentAtSource']) == 3)
chk('source-map no hash of generated indexes', not any(f['packet'] in ('manifest.json', 'sha256.json', 'source-map.json') for f in sm_['files']))
chk('no index mentions a manifest hash', not re.search(r'(manifest|sha256)\.json["\']?\s*:\s*["\'][0-9a-f]{64}', ''.join((H / n).read_text(encoding='utf-8') for n in ('identity-index.json', 'checkpoint-facts.json', 'source-map.json'))))

# 10. forbidden content
names = [str(p.relative_to(H)) for p in H.rglob('*') if p.is_file()]
chk('no processes/stderr/transcript/png/provider files', not [n for n in names if re.search(r'(processes\.json|tester\.stderr|transcript|\.png$|envelope|stderr)', n)])
gen = ['README.md', 'ledger-additions.md', 'ask-ledger.md', 'logical-tester-ledger.md']
chk('generated text names no provider key', not [n for n in gen if re.search(r'(sk-[A-Za-z0-9]{20,}|ANTHROPIC_API|Bearer )', (H / n).read_text(encoding='utf-8'))])
chk('briefs and histories only as .original.md.txt', all(not n.endswith(('brief.md', 'own-history.md')) for n in names))

ok = all(r['ok'] for r in res)
out = {'ok': ok, 'checks': len(res), 'failed': [r for r in res if not r['ok']], 'spanLocatorChecks': n_span, 'canaryFailChecks': n_canary_fail,
       'note': 'Spans, ledger regeneration, hashes, stops, pins, pids, ports, cleanup counts, reactions, source copies and forbidden-content scan. No game behaviour, population or acceptance is tested.',
       'results': res}
(H / 'primary-quote-validation.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('checks', len(res), 'spans', n_span, 'canary', n_canary_fail, 'failed', len(out['failed']))
for f in out['failed'][:40]:
    print('FAIL', f['check'], f['detail'])
sys.exit(0 if ok else 1)
