#!/usr/bin/env python3
"""Validate the Good Hands retest 1 source packet. Run from the packet dir: python3 -I validate-quotes.py
Exits 1 on any failure. Rewrites primary-quote-validation.json deterministically.
Source comparisons against the private originals run only if those paths exist; the output says how many ran and how many were skipped."""
from pathlib import Path
import datetime, hashlib, json, re, sys

H = Path(__file__).resolve().parent
TESTERS = ['jonas', 'aisha', 'diego', 'rosa', 'nadia']
NAMES = {'jonas': 'Jonas Berg', 'aisha': 'Aisha Rahman', 'diego': 'Diego Silva', 'rosa': 'Rosa Alvarez', 'nadia': 'Nadia Petrović'}
ORDER = {'jonas': ['desktop', 'phone'], 'aisha': ['desktop', 'phone'], 'diego': ['desktop', 'phone'],
         'rosa': ['phone', 'desktop'], 'nadia': ['desktop', 'phone']}
DOCS = 'docs/lab/reviews/light-2026-10-30/goodhands-retest1'
COMMIT = '2e67317e6a0aa187bf41de5d9bac5369916700f2'
fails, checks = [], []


def ok(name, cond, detail=''):
    checks.append(name)
    if not cond:
        fails.append(f'{name} {detail}'.strip())


def jl(p):
    return json.loads((H / p).read_text(encoding='utf-8'))


def sha(p):
    return hashlib.sha256((H / p).read_bytes()).hexdigest()


def clean(s):
    return isinstance(s, str) and bool(s) and '|' not in s and '\n' not in s


def T(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))


ex = jl('exact-quote-extraction.json')['testers']
rep = {t: (H / t / 'report.md').read_text(encoding='utf-8') for t in TESTERS}
orig = {t: (H / t / 'report.original.md.txt').read_text(encoding='utf-8') for t in TESTERS}
replines = {t: rep[t].split('\n') for t in TESTERS}

# ---- report copies byte-identical
for t in TESTERS:
    ok(f'{t} report copies identical', (H / t / 'report.md').read_bytes() == (H / t / 'report.original.md.txt').read_bytes())

# ---- extraction re-read from the report lines named by the locators
for t in TESTERS:
    e, loc, L = ex[t], ex[t]['locators'], replines[t]
    ok(f'{t} tester name', e['tester'] == NAMES[t])
    ol = L[loc['openingLine'] - 1]
    ok(f'{t} opening line has label', ol.startswith(loc['openingLabel']))
    got = ol[len(loc['openingLabel']):]
    if loc['openingOuterQuotesStripped']:
        ok(f'{t} opening wrapped in straight quotes', got.startswith('"') and got.endswith('"'))
        got = got[1:-1]
    ok(f'{t} primaryReturn equals opening line', e['primaryReturn'] == got)
    ll = L[loc['laterLine'] - 1]
    ok(f'{t} later line has label', ll.startswith(loc['laterLabel']))
    ok(f'{t} laterFullReturn equals later line', e['laterFullReturn'] == ll[len(loc['laterLabel']):])
    ok(f'{t} later return is a separate later line', loc['laterLine'] > loc['openingLine'])
    for k in ('primaryReturn', 'laterFullReturn'):
        ok(f'{t} {k} clean', clean(e[k]))
        ok(f'{t} {k} in report.md', e[k] in rep[t])
        ok(f'{t} {k} in report.original', e[k] in orig[t])
    ok(f'{t} later occurrence after opening occurrence', rep[t].index(e['primaryReturn']) < rep[t].rindex(e['laterFullReturn']))
    for lab, sp in e['laterExtraReturnSpans'].items():
        info = loc['extraLines'][lab]
        line = L[info['line'] - 1]
        ok(f'{t} extra {lab} clean', clean(sp))
        ok(f'{t} extra {lab} in its report line', sp in line)
        ok(f'{t} extra {lab} in report.original', sp in orig[t])
        if info['afterLabel'] is not None:
            ok(f'{t} extra {lab} equals line after label', line == info['afterLabel'] + sp)
    ok(f'{t} three ranked asks', len(e['rankedAsks']) == 3)
    for i, a in enumerate(e['rankedAsks'], 1):
        line = L[loc['askLines'][i - 1] - 1]
        ok(f'{t} ask{i} equals numbered line', line == f'{i}. {a}')
        ok(f'{t} ask{i} clean', clean(a))
        ok(f'{t} ask{i} in report.original', a in orig[t])
    ok(f'{t} laterAskSpans keys', sorted(e['laterAskSpans']) == ['1', '2', '3'])
    for i, v in e['laterAskSpans'].items():
        ok(f'{t} later ask{i} has at least one span', len(v) >= 1)
        for sp in v:
            ok(f'{t} later ask{i} {sp["label"]} clean', clean(sp['span']) and clean(sp['label']))
            ok(f'{t} later ask{i} {sp["label"]} in report.md', sp['span'] in rep[t])
            ok(f'{t} later ask{i} {sp["label"]} in report.original', sp['span'] in orig[t])
            ok(f'{t} later ask{i} {sp["label"]} differs from the ask', sp['span'] != e['rankedAsks'][int(i) - 1])
ok('aisha later return note present', 'laterFullReturnNote' in ex['aisha'])

# ---- raw rows, stops, reactions
raw = {}
for t in TESTERS:
    for d in ('phone', 'desktop'):
        rs = [json.loads(l) for l in (H / t / d / 'wall-clock.jsonl').read_text(encoding='utf-8').splitlines()]
        raw[(t, d)] = rs
        stops = [r for r in rs if r['kind'] == 'stop' and r['op'] == 'log']
        ok(f'{t} {d} exactly one stop', len(stops) == 1)
        ok(f'{t} {d} rows are ordered in time', all(T(a['t']) <= T(b['t']) for a, b in zip(rs, rs[1:])))
        ok(f'{t} {d} no Submit tap', not any('submit' in json.dumps(r['input']).lower() for r in rs if r['op'] == 'tap'))
rx = jl('all-driver-reactions.json')
ok('reactions session count 10', len(rx['sessions']) == 10)
tot = miss_tot = 0
for s in rx['sessions']:
    t = next(x for x in TESTERS if NAMES[x] == s['tester'])
    d = s['device']
    rs = raw[(t, d)]
    want = [r for r in rs if r.get('reaction')]
    ok(f'{t} {d} reactions equal raw rows', s['reactions'] == want)
    ok(f'{t} {d} raw sha', s['rawSha256'] == sha(f'{t}/{d}/wall-clock.jsonl'))
    ok(f'{t} {d} row count', s['rows'] == len(rs) and s['reactionRows'] == len(want))
    m = [r['elapsed_s'] for r in want if r['reaction'] not in rep[t]]
    ok(f'{t} {d} missing-in-report count', s['reactionsNotLiterallyInReport'] == len(m) and s['notLiterallyInReportElapsedS'] == m)
    tot += len(want)
    miss_tot += len(m)
ok('reaction totals', rx['totals']['reactionRows'] == tot and rx['totals']['reactionsNotLiterallyInReport'] == miss_tot)
ok('reaction session sources exist', all((H / s['source']).is_file() for s in rx['sessions']))

ck = jl('checkpoint-facts.json')['testers']
lg = jl('logical-tester-ledger.json')
ok('logical ledger five testers in order', [r['tester'] for r in lg] == [NAMES[t] for t in TESTERS])
for r, t in zip(lg, TESTERS):
    ok(f'{t} logical ledger primary/later equal extraction', r['primaryReturn'] == ex[t]['primaryReturn'] and r['laterFullReturn'] == ex[t]['laterFullReturn'])
    ok(f'{t} logical verdict', r['verdict'] == ('keep' if t == 'rosa' else 'mixed'))
    for d in ORDER[t]:
        st = [x for x in raw[(t, d)] if x['kind'] == 'stop'][0]
        v = r['voluntaryStops'][d]
        ok(f'{t} {d} ledger stop equals raw row', v['elapsed_s'] == st['elapsed_s'] and v['reason'] == st['reason'] and v['rawStopReaction'] == st['reaction'])
        ok(f'{t} {d} ledger stop literal flag', v['rawStopReactionLiterallyInReport'] == (st['reaction'] in rep[t]))
        c = ck[t]['sessions'][d]
        ok(f'{t} {d} checkpoint stop equals raw row', c['stop']['elapsed_s'] == st['elapsed_s'] and c['stop']['game_clock'] == st['game_clock'])
        fm = [x for x in raw[(t, d)] if x['kind'] == 'first_minute' and x['op'] == 'log']
        pu = [x for x in raw[(t, d)] if x['kind'] == 'pulse' and x['op'] == 'log']
        ok(f'{t} {d} checkpoint first_minute logs', [x['elapsed_s'] for x in c['firstMinuteLogs']] == [x['elapsed_s'] for x in fm])
        ok(f'{t} {d} checkpoint pulse logs', [x['elapsed_s'] for x in c['pulseLogs']] == [x['elapsed_s'] for x in pu])
        for x in c['pulseLogs']:
            ok(f'{t} {d} pulse early flag {x["elapsed_s"]}', x['earlyBefore180s'] == (x['elapsed_s'] < 180))
    ok(f'{t} device order equals ledger and checkpoint', r['deviceOrder'] == ORDER[t] == ck[t]['deviceOrder'])
# specific parent-stated method facts re-derived from raw rows
ok('rosa phone first minute unlogged despite stop past 60 s',
   not [x for x in raw[('rosa', 'phone')] if x['kind'] == 'first_minute' and x['op'] == 'log'] and [x for x in raw[('rosa', 'phone')] if x['kind'] == 'stop'][0]['elapsed_s'] > 60)
ok('rosa desktop stop before 60 s', [x for x in raw[('rosa', 'desktop')] if x['kind'] == 'stop'][0]['elapsed_s'] < 60)
ok('nadia pulses 179.1 and 177.8 are early',
   [round(x['elapsed_s'], 1) for x in ck['nadia']['sessions']['desktop']['pulseLogs']] == [179.1]
   and [round(x['elapsed_s'], 1) for x in ck['nadia']['sessions']['phone']['pulseLogs']] == [177.8])
nf = [x for x in raw[('nadia', 'phone')] if x['kind'] == 'first_minute' and x['op'] == 'log']
ok('nadia phone first minute 111.7 s is after 60 s', len(nf) == 1 and round(nf[0]['elapsed_s'], 1) == 111.7)
gap = (T([x for x in raw[('nadia', 'phone')] if x['op'] == 'open'][0]['t']) - T([x for x in raw[('nadia', 'desktop')] if x['kind'] == 'stop'][0]['t'])).total_seconds()
ok('nadia own device gap 2.006 s from desktop stop to phone open', abs(gap - 2.006) < 0.0005, str(gap))
ne = [x for x in raw[('nadia', 'desktop')] if x['kind'] == 'tool' and x['error']]
ok('nadia two stale Skip refusals before input', len(ne) == 2 and all('Skip to' in x['input']['name'] and 'not on the page now' in x['error'] for x in ne))
ok('aisha stop label refusal then curly label', any(x['kind'] == 'tool' and x['error'] and x['input'].get('text') == 'stopping' for x in raw[('aisha', 'desktop')]))
for t in TESTERS:
    for d in ('phone', 'desktop'):
        ok(f'{t} {d} no form or note input', not any(x['op'] in ('note_submit', 'submit', 'type', 'fill') for x in raw[(t, d)]))

# ---- ledger rows
ROW = re.compile(r'^\| (F-\d+) \| (\S+) \| (\S+) \| (\S+) \| (.*?) \| (.*?) \| (\S+) \| (.*?) \| (\S+) \|$')
led = {}
for fn in ('ledger-additions.md', 'ask-ledger.md'):
    for l in (H / fn).read_text(encoding='utf-8').splitlines():
        if l.startswith('| F-'):
            ok(f'{fn} row has 10 pipes {l[:8]}', l.count('|') == 10)
            m = ROW.match(l)
            ok(f'{fn} row parses {l[:8]}', bool(m))
            if m:
                led.setdefault(fn, {})[m.group(1)] = m.groups()
ids = sorted(int(k[2:]) for k in led['ledger-additions.md'])
ok('ids 2521-2540', ids == list(range(2521, 2541)), str(ids))
ok('ids 2541-2550 unused', not any(2541 <= i <= 2550 for i in ids))
ok('ask-ledger is 2526-2540', sorted(int(k[2:]) for k in led['ask-ledger.md']) == list(range(2526, 2541)))
for k, v in led['ask-ledger.md'].items():
    ok('ask row identical in both ledgers ' + k, led['ledger-additions.md'].get(k) == v)
RT = re.compile(r'^fix:goodhands \S[^;]*\(open\)$')
KEY = {2526: 'fee gets refused', 2527: 'next be reached', 2528: 'settle a trait', 2529: 'repair letter', 2530: 'why the job ended',
       2531: "second candidate's interview", 2532: 'unchecked promise', 2533: 'deposit not to clear the rent', 2534: 'more than Promise, Decline or Finish',
       2535: 'worth doing while she waits', 2536: 'said once on the agreement screen', 2537: 'Feedback', 2538: 'belief rule',
       2539: 'kept numbers while a card is open', 2540: 'Pace setting visible'}
TARGET = re.compile(r'target2026-11-(03|10) \(open\)(;|$)')
verdict_by_tester = {}
for k, g in led['ledger-additions.md'].items():
    _, date, game, kind, who, words, verdict, routes, source = g
    n = int(k[2:])
    ok(f'{k} fields', date == '2026-10-31' and game == 'goodhands' and kind == 'playtester')
    t = next((x for x in TESTERS if who == f'Fictional LIGHT panel: {NAMES[x]}'), None)
    ok(f'{k} who', t is not None, who)
    ok(f'{k} verdict', verdict == ('keep' if t == 'rosa' else 'mixed'), verdict)
    ok(f'{k} source', t is not None and source == f'{DOCS}/{t}/report.md')
    ok(f'{k} routes single line pipe-free', clean(routes) and clean(words))
    parts = [p.strip() for p in routes.split(';')]
    ok(f'{k} routes grammar', all(RT.match(p) or p == 'calibration:C14' for p in parts), routes[:60])
    ok(f'{k} C14 last and once', parts.count('calibration:C14') <= 1 and ('calibration:C14' not in parts or parts[-1] == 'calibration:C14'))
    ok(f'{k} only one fix route', sum(1 for p in parts if p.startswith('fix:')) == 1 and parts[0].startswith('fix:goodhands '))
    ok(f'{k} dated target', bool(TARGET.search(routes)))
    ok(f'{k} no unknown route words', not re.search(r'(fix:pass|canonical|CLEAR|deploy)', routes))
    if t:
        e = ex[t]
        i = TESTERS.index(t)
        if n < 2526:
            ok(f'{k} return row tester order', n == 2521 + i)
            w = f'Opening return: "{e["primaryReturn"]}" Separate later return: "{e["laterFullReturn"]}"'
            for lab, sp in e['laterExtraReturnSpans'].items():
                w += f' {lab}: "{sp}"'
            ok(f'{k} routes name its ask ids', f'asks F-{2526 + 3 * i}–F-{2528 + 3 * i}' in routes)
        else:
            j = (n - 2526) % 3 + 1
            ok(f'{k} ask tester', TESTERS[(n - 2526) // 3] == t)
            w = f'"{e["rankedAsks"][j - 1]}"'
            for sp in e['laterAskSpans'][str(j)]:
                w += f' {sp["label"]}: "{sp["span"]}"'
            ok(f'{k} ask keyword', KEY[n] in routes, KEY[n])
        ok(f'{k} words match extraction exactly', words == w)
ok('C14 is conditional on future clock changes in F-2525 only',
   sorted(k for k, g in led['ledger-additions.md'].items() if 'calibration:C14' in g[7]) == ['F-2525'])
ok('Rosa rows keep, others mixed', {g[6] for k, g in led['ledger-additions.md'].items() if 'Rosa' in g[4]} == {'keep'}
   and {g[6] for k, g in led['ledger-additions.md'].items() if 'Rosa' not in g[4]} == {'mixed'})

ask_json = jl('ask-ledger.json')
ask_keys = ['id', 'date', 'game', 'kind', 'who', 'words', 'verdict', 'routes', 'source']
expected_asks = [dict(zip(ask_keys, row)) for row in led['ask-ledger.md'].values()]
ok('ask JSON equals all literal Markdown rows', ask_json == expected_asks)

# ---- identity, pins, cleanup, freeze, plan
fz = jl('inputs/goodhands-retest-input-freeze.json')
fzp = {p['tester']: p for p in fz['players']}
plan = jl('inputs/goodhands-retest-plan.json')
planp = {p['first']: p for p in plan}
idx = jl('identity-index.json')
cl = jl('inputs/goodhands-retest-cleanup.json')
pre = jl('inputs/goodhands-retest-predispatch.json')
rel = jl('inputs/goodhands-retest-final-release-after-round.json')
ok('post-round release pin', rel['release']['commit'] == COMMIT and rel['release']['dirty'] is False and rel['release']['framework'] == '4.8.1')
ok('predispatch release pin', pre['release']['commit'] == COMMIT and pre['finalRelease']['commit'] == COMMIT and pre['mainCI']['headSha'] == COMMIT)
ok('15 pids all absent', len(cl['recordedPids']) == 15 and len(set(cl['recordedPids'])) == 15 and cl['allAbsent'] is True and cl['signalsSent'] == [])
ok('five index records', [r['tester'] for r in idx['testers']] == [NAMES[t] for t in TESTERS])
drv_pids = []
for rec, t in zip(idx['testers'], TESTERS):
    hist = (H / t / 'own-history.original.md.txt').read_bytes()
    ok(f'{t} history hash vs freeze', rec['historySha256'] == sha(f'{t}/own-history.original.md.txt') == fzp[NAMES[t]]['historySha256'])
    ok(f'{t} history hash vs dispatch', rec['historySha256'] == jl(f'{t}/dispatch.json')['ownHistorySha256'])
    ok(f'{t} history bytes and newlines', rec['historyBytes'] == len(hist) and rec['historyNewlines'] == hist.count(b'\n'))
    ok(f'{t} brief hash vs freeze and dispatch', rec['briefSha256'] == sha(f'{t}/brief.original.md.txt') == fzp[NAMES[t]]['briefSha256'] == jl(f'{t}/dispatch.json')['briefSha256'])
    d = jl(f'{t}/dispatch.json')
    ok(f'{t} dispatch matches', d['model'] == rec['model'] and d['time'] == rec['dispatchTime'] and d['commit'] == COMMIT and d['who'] == 'agent')
    ok(f'{t} driver hashes identical to first tester', rec['driver'] == idx['testers'][0]['driver'])
    ok(f'{t} plan commit and ports', planp[t]['commit'] == COMMIT and planp[t]['ports'] == rec['ports'] and planp[t]['order'] == ORDER[t] == rec['deviceOrder'])
    comp = jl(f'{t}/completion.json')
    ok(f'{t} completion exit 0 and two clean pins', comp['exit'] == 0 and len(comp['pins']) == 2 and all(p['commit'] == COMMIT and p['dirty'] is False and p['framework'] == '4.8.1' for p in comp['pins']))
    ok(f'{t} dispatch before completion', T(d['time']) < T(comp['ended']))
    for dev in ('phone', 'desktop'):
        rs = jl(f'{t}/{dev}/release-start.json')
        ok(f'{t} {dev} release pin', rs['commit'] == COMMIT and rs['dirty'] is False and rs['framework'] == '4.8.1' and rs['app'] == '0.1.0')
        out = json.loads((H / t / dev / 'driver.out').read_text(encoding='utf-8'))
        ok(f'{t} {dev} driver.out', out['driver'] == 'native-tap-v2' and out['driver_check'] == 'fork-unverified' and out['port'] == planp[t]['ports'][dev])
        drv_pids.append(out['pid'])
    # validation.json vs raw
    val = jl(f'{t}/validation.json')
    ok(f'{t} validation tester', val['tester'] == NAMES[t] and val['runSource'] == 'agent' and val['unexpectedReads'] == [])
    for dev in ('phone', 'desktop'):
        st = [x for x in raw[(t, dev)] if x['kind'] == 'stop'][0]
        ok(f'{t} {dev} validation stop equals raw stop', val['sessions'][dev]['stop'] == st)
    # history read qualification
    q = jl(f'{t}/director-method-qualification.json')
    if t != 'nadia':
        ok(f'{t} qualification lines equal history lines', q['historyActualLines'] == len(hist.decode('utf-8').splitlines()))
    else:
        ok('nadia empty history', q['emptyHistory'] is True and len(hist) == 77 and hist.count(b'\n') == 1)
        ok('nadia own device gap in qualification', q['ownDeviceGapSeconds'] == 2.006)
ok('all ten driver pids are among the 15 recorded pids', set(drv_pids) <= set(cl['recordedPids']))
qj = jl('jonas/director-method-qualification.json')
ok('jonas read receipts end at 599 of 939', qj['historyReadThrough'] == 599 and qj['historyActualLines'] == 939 and max(r['returnedLastLine'] for r in qj['historyReadReceipts']) == 599)
qr = jl('rosa/director-method-qualification.json')
ok('rosa read receipts end at 468 of 1682', max(r['last'] for r in qr['historyReadReceipts']) == 468 and qr['historyActualLines'] == 1682)
qa = jl('aisha/director-method-qualification.json')
ok('aisha read receipts reach render line 875', max(r['last'] for r in qa['historyReadReceipts']) == 875 and qa['historyActualLines'] == 874)
qd = jl('diego/director-method-qualification.json')
ok('diego read receipts reach render line 1117', max(r['last'] for r in qd['historyReadReceipts']) == 1117 and qd['historyActualLines'] == 1116)
dn = jl('inputs/goodhands-retest-director-method-notes.json')
ok('director notes counts', dn['BashCalls'] == 335 and dn['validAssignedJsonCurls'] == 322 and dn['shellParseFailuresBeforeCurl'] == 13
   and dn['BashCalls'] == dn['validAssignedJsonCurls'] + dn['shellParseFailuresBeforeCurl'] and dn['executedProtocolBreaches'] == 0)
ok('director notes close and next-panel times', dn['lastReturn'] == '2026-10-31T08:14:43.043376+00:00' and dn['nextRoundNotBefore'] == '2026-10-31T08:29:43.043376+00:00'
   and (T(dn['nextRoundNotBefore']) - T(dn['lastReturn'])).total_seconds() == 900)
ok('nadia completion equals the round close', jl('nadia/completion.json')['ended'] == dn['lastReturn'])

# ---- screenshots and image reads (hashes only, no pixels in this packet)
sh = jl('screenshots-manifest.json')
sca = jl('inputs/goodhands-retest-stop-and-capture-audit.json')
for t in TESTERS:
    for dev in ('phone', 'desktop'):
        ent = [s for s in sh if s['tester'] == NAMES[t] and s['device'] == dev]
        ok(f'{t} {dev} capture count equals audit', len(ent) == sca[t][dev]['pngCount'])
        got = sorted(s['privatePath'].rsplit('/', 1)[1] for s in ent if s['testerImageReadReceipt'])
        ok(f'{t} {dev} read receipts equal audit viewed', got == sorted(sca[t][dev]['viewed']))
        ok(f'{t} {dev} at most five receipts', len(got) <= 5)
        ok(f'{t} {dev} hashes well formed', all(re.fullmatch(r'[0-9a-f]{64}', s['sha256']) and s['bytes'] > 0 for s in ent))
        ok(f'{t} {dev} stop equals audit stop', sca[t][dev]['stop'] == [x for x in raw[(t, dev)] if x['kind'] == 'stop'][0])
ok('no png in the packet', not [p for p in H.rglob('*') if p.suffix.lower() == '.png'])

# ---- forbidden content
bad_names = re.compile(r'(\.png$|transcript|tester\.stderr|processes\.json|command-scope|envelope)', re.I)
keys = re.compile(r'tool_use_id|stop_reason|cache_creation_input_tokens|modelUsage')
for p in sorted(H.rglob('*')):
    if not p.is_file():
        continue
    r = str(p.relative_to(H))
    ok('no forbidden file ' + r, not bad_names.search(r))
    if r in ('validate-quotes.py', 'primary-quote-validation.json'):
        continue
    if p.suffix in ('.json', '.md', '.jsonl') or p.name.endswith('.txt') or p.name == 'driver.out':
        ok('no provider keys ' + r, not keys.search(p.read_text(encoding='utf-8', errors='replace')))

# ---- hashes, only when the indexes exist; self-indexes excluded to avoid cycles
excluded = {'manifest.json', 'sha256.json', 'source-map.json', 'identity-index.json'}
allf = {str(p.relative_to(H)) for p in H.rglob('*') if p.is_file()}
sm = jl('source-map.json')
deps = [row['packet'] for row in sm['files']]
ok('source-map no index dependencies', not (set(deps) & excluded))
ok('source-map dependency paths exist', all((H / p).is_file() for p in deps))
ok('source-map actual payload hashes', all(sha(row['packet']) == row['sha256'] for row in sm['files']))
ok('source-map paths unique', len(set(deps)) == len(deps))
for n in ('source-map.json', 'identity-index.json'):
    txt = (H / n).read_text(encoding='utf-8')
    ok(n + ' holds no current index hashes', all(sha(k) not in txt for k in excluded if (H / k).exists()))
ran = skipped = 0
for row in sm['files']:
    src = Path(row['source'])
    if src.is_file():
        ran += 1
        ok('private source equals packet copy ' + row['packet'], hashlib.sha256(src.read_bytes()).hexdigest() == sha(row['packet']))
    else:
        skipped += 1
if (H / 'sha256.json').exists() and (H / 'manifest.json').exists():
    sj, mj = jl('sha256.json'), jl('manifest.json')
    ok('sha256 hashes match', all(sha(k) == v for k, v in sj['files'].items()))
    ok('manifest paths exist', all((H / f['path']).exists() for f in mj['files']))
    ok('manifest bytes match', all((H / f['path']).stat().st_size == f['bytes'] for f in mj['files']))
    cover = {f['path'] for f in mj['files']}
    ok('manifest covers all but itself and sha256', allf - cover <= {'manifest.json', 'sha256.json'}, str(sorted(allf - cover)))
    ok('sha256 covers all but itself', allf - set(sj['files']) <= {'sha256.json'}, str(sorted(allf - set(sj['files']))))
    ok('sha256 does not list itself', 'sha256.json' not in sj['files'])
    ok('manifest does not list itself', 'manifest.json' not in cover)
    ok('sha256 hashes of manifest match', 'manifest.json' not in sj['files'] or sj['files']['manifest.json'] == sha('manifest.json'))
    ok('manifest source epochs are strings or null', all(f['sourceEpoch'] is None or isinstance(f['sourceEpoch'], (str, dict)) for f in mj['files']))
    ok('manifest copies carry source mtime', all(f['kind'] != 'byte copy' or isinstance(f.get('sourceMtimeUtc'), str) for f in mj['files']))
    mh = {f['path']: f for f in mj['files']}
    ok('manifest copy mtimes equal source map files', all(p in mh and mh[p]['kind'] == 'byte copy' for p in deps))

out = {'tester count': len(TESTERS), 'checks': len(checks), 'failures': fails, 'result': 'PASS' if not fails else 'FAIL',
       'sourceComparison': {'ran': ran, 'skipped': skipped},
       'indexChecksRan': (H / 'sha256.json').exists() and (H / 'manifest.json').exists()}
(H / 'primary-quote-validation.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
print(out['result'], len(checks), 'checks', len(fails), 'failures', 'source compare ran', ran, 'skipped', skipped)
for f in fails[:40]:
    print(' FAIL', f)
sys.exit(1 if fails else 0)
