#!/usr/bin/env python3
"""Validate the Glance retest 2 packet. Run in this directory: python3 -I validate-quotes.py
Writes primary-quote-validation.json (deterministic; independent of manifest.json and sha256.json).
Exit 0 only if every check passes. A failed check raises with the failing item named; nothing is skipped."""
from pathlib import Path
import hashlib, json, re, sys

D = Path(__file__).resolve().parent
TESTERS = ['mei', 'samir', 'leila', 'rosa', 'eszter']
DEV = ('phone', 'desktop')
PIN = 'c112497284e78d4c99aa62895262368214f37d9f'
FW = '4.14.0'
RELEASE = {'app': '0.1.0', 'framework': FW, 'commit': PIN, 'dirty': False}
counts = {}


def jl(p):
    return json.loads((D / p).read_text(encoding='utf-8'))


def need(cond, msg):
    if not cond:
        raise SystemExit('FAIL: ' + msg)


def bump(k, n=1):
    counts[k] = counts.get(k, 0) + n


def sha(p):
    return hashlib.sha256((D / p).read_bytes()).hexdigest()


# ---------------------------------------------------------------- 1. reports and spans
rep, orig, lines = {}, {}, {}
for t in TESTERS:
    a, b = (D / t / 'report.md').read_bytes(), (D / t / 'report.original.md.txt').read_bytes()
    need(a == b, f'{t} report.md and report.original.md.txt differ')
    bump('reportPairsByteIdentical')
    rep[t] = a.decode('utf-8')
    lines[t] = rep[t].split('\n')
ex = jl('exact-quote-extraction.json')


def check_loc(t, loc, label):
    ln, span, mode = loc['line'], loc['span'], loc['mode']
    need(span and '\n' not in span, f'{label}: empty or multi-line span')
    need(1 <= ln <= len(lines[t]), f'{label}: line {ln} out of range')
    line = lines[t][ln - 1]
    if mode == 'after-label':
        need(line == loc['prefix'] + span, f'{label}: line {ln} is not prefix+span')
    elif mode == 'inline':
        need(span in line, f'{label}: span not inside line {ln}')
    else:
        need(False, f'{label}: bad mode {mode}')
    # the same span with one character changed must NOT be found on that line (the check is not vacuous)
    canary = span[:-1] + ('~' if span[-1] != '~' else '^')
    need(canary not in line, f'{label}: canary found')
    need((loc['prefix'] + canary if mode == 'after-label' else canary) != line and canary not in rep[t], f'{label}: canary leaked into report')
    bump('spanLocatorsChecked')
    bump('canariesRejected')


for t in TESTERS:
    e = ex['testers'][t]
    check_loc(t, e['primaryReturnLocator'], f'{t} opening')
    need(e['primaryReturnLocator']['line'] == 1, f'{t} opening is not on report line 1')
    if t == 'eszter':
        need(e['primaryReturnAfterLabelLiteral'] == '"' + e['primaryReturn'] + '"', 'eszter wrapper-quote forms disagree')
        need(lines[t][0] == '**Would you return voluntarily?** ' + e['primaryReturnAfterLabelLiteral'], 'eszter line 1 is not label + literal')
    else:
        need(lines[t][0].endswith(e['primaryReturn']) and lines[t][0].startswith('**'), f'{t} line 1 mismatch')
    if e['laterFullReturn'] is not None:
        check_loc(t, e['laterFullReturnLocator'], f'{t} later return')
        need(e['primaryReturnLocator']['line'] < e['laterFullReturnLocator']['line'], f'{t} opening not before later return')
        need(e['laterFullReturn'] != e['primaryReturn'], f'{t} later return equals opening (nothing separate)')
    else:
        need(t == 'rosa', f'{t} has no later return')
        check_loc(t, e['laterReturnLeadLocator'], 'rosa lead')
        need(len(e['laterConditionSpans']) == 3, 'rosa needs 3 condition spans')
        lead = e['laterReturnLeadLocator']['line']
        for i, sp in enumerate(e['laterConditionSpans']):
            need(sp['line'] == lead + 1 + i and sp['prefix'] == '  - ', f'rosa condition {i + 1} is not bullet {i + 1} under the lead')
        for k in ('laterFullReturn',):
            need(e[k] is None, 'rosa joined sentence invented')
        joined = ' '.join(sp['span'] for sp in e['laterConditionSpans'])
        need(joined not in rep[t], 'rosa joined spans appear in report (would mean a real sentence)')
    for sp in e['laterConditionSpans'] + e['laterExtraReturnSpans']:
        check_loc(t, sp, f'{t} {sp["label"]}')
    need(len(e['rankedAsks']) == 3 and len(e['rankedAskLocators']) == 3, f'{t} needs 3 ranked asks')
    for j, loc in enumerate(e['rankedAskLocators'], 1):
        check_loc(t, loc, f'{t} ask {j}')
        need(loc['prefix'] == f'{j}. ' and loc['line'] == 3 + j, f'{t} ask {j} is not report line {3 + j}')
        need(loc['span'] == e['rankedAsks'][j - 1], f'{t} ask {j} text differs')
    for j, spans in e['laterAskSpans'].items():
        for sp in spans:
            check_loc(t, sp, f'{t} ask {j} {sp["label"]}')
            need(sp['line'] > 6, f'{t} ask {j} later span sits in the top block')
    bump('rankedAsks', 3)
for sp in ex['supportingSpans']:
    if sp['mode'] == 'raw-reaction':
        t = sp['file'].split('/')[0]
        rows = [json.loads(l) for l in (D / sp['file']).read_text(encoding='utf-8').splitlines()]
        hit = [r for r in rows if r['elapsed_s'] == sp['elapsed_s'] and sp['span'] in (r.get('reaction') or '')]
        need(len(hit) == 1, f'raw span not found: {sp["label"]}')
        bump('rawReactionSpansChecked')
    else:
        t = sp['file'].split('/')[0]
        check_loc(t, sp, 'supporting ' + sp['label'])

# required conditions, negations and qualifiers must still be present as words in the kept spans
REQUIRED = {
    'mei': {'primaryReturn': ['another evening', 'only if', 'or if I were told up front', 'I would not leave it running']},
    'samir': {'primaryReturn': ['another evening', 'desktop only', 'and if the waiting cost much less', 'I would not leave it running', 'I would not come back on the phone tonight']},
    'leila': {'primaryReturn': ['another evening', 'only on desktop', 'only if a night asked me for more than about four choices', 'I would not leave it running']},
    'rosa': {'primaryReturn': ['another evening', 'only if', 'Hold it to insist', 'one next job', 'I would not leave it running']},
    'eszter': {'primaryReturn': ['one more Monday-style night', 'Fast pace', 'only if the nights stop feeling like the same form', 'grey Skip waits go away', 'on the phone, no']},
}
for t, m in REQUIRED.items():
    for field, phrases in m.items():
        for ph in phrases:
            need(ph in ex['testers'][t][field], f'{t} {field} lost required phrase {ph!r}')
            bump('requiredPhrasesChecked')
for t, phrases in {'samir': ['if each step cost much less waiting', 'because it needs me at each step', 'because I already know the loop from desktop', 'I would not leave it running', 'I would not come back on the phone tonight'],
                   'mei': ['another evening', 'nothing needs deciding until the level rises'],
                   'leila': ['another evening', 'I would not leave it running', 'Doubt now does something I can see'],
                   'eszter': ['one more Monday-style night', 'on the phone, no', 'Twelve nights at about 5–7 minutes each']}.items():
    blob = ' '.join([ex['testers'][t].get('laterFullReturn') or ''] + [s['span'] for s in ex['testers'][t]['laterExtraReturnSpans']])
    for ph in phrases:
        need(ph in blob, f'{t} later return lost {ph!r}')
        bump('requiredPhrasesChecked')
need('Fast' in ' '.join(s['span'] for s in ex['testers']['eszter']['laterAskSpans']['1']), 'eszter pace span lost Fast')
need(any('Skip' in s['span'] for s in ex['testers']['eszter']['laterAskSpans']['2']), 'eszter skip span lost Skip')
need(any('four nights' in s['span'] and 'two partial Tuesday' in s['span'] for s in ex['supportingSpans']), 'eszter own correction missing')
need(any('Mei piped one curl' in s['label'] for s in ex['supportingSpans']), 'mei pipe span missing')

# ---------------------------------------------------------------- 2. ledgers
head = '| id | date | game | kind | who | words | verdict | routes | source |'
NAMES = {'mei': 'Mei Tan', 'samir': 'Samir Haddad', 'leila': 'Leila Mansour', 'rosa': 'Rosa Alvarez', 'eszter': 'Eszter Fekete'}
txt = (D / 'ledger-additions.md').read_text(encoding='utf-8').split('\n')
i0 = txt.index(head)
rows = [l for l in txt[i0 + 2:] if l.strip()]
need(len(rows) == 20, f'ledger-additions has {len(rows)} rows')
cells = [[c.strip() for c in r.strip('|').split(' | ')] for r in rows]
for r, c in zip(rows, cells):
    need(len(c) == 9 and r.count(' | ') == 8, f'row cell count: {r[:20]}')
need([c[0] for c in cells] == [f'F-{n}' for n in range(2551, 2571)], 'ledger ids are not F-2551..F-2570 in order')
need(not any(c[0] in ('F-2571', 'F-2580') for c in cells), 'unused ids present')
notes = jl('inputs/glance-retest2-director-method-notes.json')
C14 = {2560, 2563, 2569}
q = lambda s: '"' + s + '"'
S = {'5': 'Later wording (section 5)'}
for k, c in enumerate(cells):
    n = 2551 + k
    t = TESTERS[k // 1] if n <= 2555 else TESTERS[(n - 2556) // 3]
    need(c[1] == '2026-10-31' and c[2] == 'glance' and c[3] == 'playtester' and c[4] == f'Fictional LIGHT panel: {NAMES[t]}' and c[6] == 'mixed', f'row {n} fixed columns')
    need(c[8] == f'docs/lab/reviews/light-2026-10-30/glance-retest2/{t}/report.md', f'row {n} source')
    e = ex['testers'][t]
    if n <= 2555:
        w = f'Opening return: {q(e["primaryReturn"])}'
        if e['laterFullReturn'] is not None:
            w += f' Separate later return: {q(e["laterFullReturn"])}'
        else:
            w += f' Later return lead (section 7): {q(e["laterReturnLead"])}'
            for sp in e['laterConditionSpans']:
                w += f' {sp["label"]}: {q(sp["span"])}'
        for sp in e['laterExtraReturnSpans']:
            w += f' {sp["label"]}: {q(sp["span"])}'
        target = '2026-11-03'
    else:
        j = (n - 2556) % 3 + 1
        w = q(e['rankedAsks'][j - 1])
        for sp in e['laterAskSpans'].get(str(j), []):
            w += f' {sp["label"]}: {q(sp["span"])}'
        target = notes['targets'][str(n)]
        need(target in ('2026-11-03', '2026-11-10'), f'row {n} parent target')
    need(c[5] == w, f'row {n} words differ from extraction')
    route = c[7]
    parts = [p.strip() for p in route.split(';')]
    need(parts[0].startswith('fix:glance ') and parts[0].endswith(f'target{target} (open)'), f'row {n} route/target')
    need(route.count('fix:glance') == 1 and route.count('(open)') == 1, f'row {n} needs exactly one route')
    need((len(parts) == 2 and parts[1] == 'calibration:C14') == (n in C14) and len(parts) == (2 if n in C14 else 1), f'row {n} C14 placement')
    bump('ledgerRowsChecked')
need(sorted(int(k) for k in notes['targets']) == list(range(2556, 2571)), 'director targets table is not F-2556..F-2570')
need({k for k in notes['targets'] if notes['targets'][k] == '2026-11-03'} == {str(n) for n in (2556, 2561, 2564, 2565, 2566, 2567, 2568)}, 'parent Nov 3 set differs')
need({k for k in notes['targets'] if notes['targets'][k] == '2026-11-10'} == {str(n) for n in (2557, 2558, 2559, 2560, 2562, 2563, 2569, 2570)}, 'parent Nov 10 set differs')
ask_md = (D / 'ask-ledger.md').read_text(encoding='utf-8').split('\n')
ask_rows = [l for l in ask_md[ask_md.index(head) + 2:] if l.strip()]
need(ask_rows == rows[5:], 'ask-ledger.md rows differ from ledger-additions.md rows 6-20')
aj = jl('ask-ledger.json')['rows']
need(len(aj) == 15 and [r['id'] for r in aj] == [f'F-{n}' for n in range(2556, 2571)], 'ask-ledger.json ids')
for r, c in zip(aj, cells[5:]):
    need(r['words'] == c[5] and r['route'] == c[7] and r['verdict'] == 'mixed' and r['source'] == c[8], f'ask json row {r["id"]} differs from md')
    need(r['target'] == notes['targets'][r['id'][2:]], f'ask json target {r["id"]}')
    need(r['calibrationC14'] == (int(r['id'][2:]) in C14), f'ask json C14 {r["id"]}')
    need(r['rank'] in (1, 2, 3), 'rank')
    bump('askJsonRowsChecked')
lt = jl('logical-tester-ledger.json')
need([r['id'] for r in lt] == [f'F-{n}' for n in range(2551, 2556)] and len(lt) == 5, 'logical ledger ids')
for r, t, c in zip(lt, TESTERS, cells[:5]):
    need(r['tester'] == NAMES[t] and r['primaryReturn'] == ex['testers'][t]['primaryReturn'] and r['route'] == c[7] and r['verdict'] == 'mixed', f'logical {t}')
    need(r['target'] == '2026-11-03', f'logical {t} target')
need(lt[3]['laterFullReturn'] is None and lt[3]['laterReturnNote'], 'rosa logical record must carry no joined later sentence')
md = (D / 'logical-tester-ledger.md').read_text(encoding='utf-8')
for r in lt:
    need(r['id'] in md and r['tester'] in md, f'logical md missing {r["id"]}')
bump('logicalRecords', 5)

# ---------------------------------------------------------------- 3. raw rows, stops, pins, history hashes
audit = jl('inputs/glance-retest2-stop-and-capture-audit.json')
fdaud = jl('inputs/glance-retest2-final-driver-audit.json')
freeze = {p['tester']: p for p in jl('inputs/glance-retest2-input-freeze.json')['players']}
hra = {h['tester']: h for h in jl('inputs/glance-retest2-history-read-audit.json')}
plan = {p['first']: p for p in jl('inputs/glance-retest2-plan.json')}
cleanup = jl('inputs/glance-retest2-cleanup.json')
recorded = set(cleanup['recordedPids'])
LINES = {'mei': 999, 'samir': 749, 'leila': 948, 'rosa': 1811, 'eszter': 5}
DRIVER = jl('mei/dispatch.json')['driverInstrument']['hashes']
CAP = {'mei': {'desktop': 3, 'phone': 3}, 'samir': {'phone': 2, 'desktop': 2}, 'leila': {'desktop': 2, 'phone': 3}, 'rosa': {'phone': 3, 'desktop': 4}, 'eszter': {'phone': 5, 'desktop': 5}}
need(audit['captureCounts'] == CAP, 'capture counts differ from the brief')
need(audit['allCapsPass'] is True, 'allCapsPass is not true')
stops_seen = 0
pngs_seen = 0
for t in TESTERS:
    disp, comp, val = jl(f'{t}/dispatch.json'), jl(f'{t}/completion.json'), jl(f'{t}/validation.json')
    need(disp['commit'] == PIN and disp['driverInstrument']['hashes'] == DRIVER, f'{t} dispatch pin or driver hash')
    need(comp['exit'] == 0 and len(comp['pins']) == 2 and all(p == RELEASE for p in comp['pins']), f'{t} completion pins')
    bump('completionPinsChecked', 2)
    need(disp['briefSha256'] == freeze[NAMES[t]]['briefSha256'] == sha(f'{t}/brief.original.md.txt'), f'{t} brief hash')
    need(disp['ownHistorySha256'] == freeze[NAMES[t]]['historySha256'] == sha(f'{t}/own-history.original.md.txt'), f'{t} history hash')
    h = (D / t / 'own-history.original.md.txt').read_bytes()
    need(h.count(b'\n') + (0 if h.endswith(b'\n') else 1) == LINES[t] == hra[NAMES[t]]['actualHistoryLines'], f'{t} history line count')
    need(hra[NAMES[t]]['allActualLinesRead'] is True and hra[NAMES[t]]['unreadLines'] == [] and any(r.get('endMarkerSeen') for r in hra[NAMES[t]]['reads'] if r.get('success') is not False), f'{t} history read audit')
    # Eszter's single read has no success field in the audit (null); it is accepted only because the end marker was seen and the file has 5 lines
    need(all(r.get('success') is True for r in hra[NAMES[t]]['reads'] if t != 'eszter' and r.get('success') is not False) , f'{t} read success flags')
    need(t != 'eszter' or (len(hra[NAMES[t]]['reads']) == 1 and hra[NAMES[t]]['reads'][0].get('success') is None), 'eszter read shape changed')
    bump('historyHashesChecked')
    need(freeze[NAMES[t]]['characters'] == len(h.decode('utf-8')), f'{t} freeze characters')
    for d in DEV:
        rows = [json.loads(l) for l in (D / t / d / 'wall-clock.jsonl').read_text(encoding='utf-8').splitlines()]
        stop = [r for r in rows if r['kind'] == 'stop' and r['op'] == 'log']
        need(len(stop) == 1, f'{t} {d} needs exactly one stop row')
        need(stop[0] == val['sessions'][d]['stop'], f'{t} {d} stop differs from validation.json')
        a = [x for x in audit['stops'] if x['tester'] == NAMES[t] and x['device'] == d]
        need(len(a) == 1 and a[0]['stop'] == stop[0], f'{t} {d} stop differs from stop-and-capture-audit')
        need(fdaud[t]['sessions'][d]['stop'] == stop[0], f'{t} {d} stop differs from final-driver-audit')
        stops_seen += 1
        need(jl(f'{t}/{d}/release-start.json') == RELEASE, f'{t} {d} release-start pin')
        bump('releaseStartPinsChecked')
        dout = json.loads((D / t / d / 'driver.out').read_text())
        need(dout['pid'] in recorded and dout['driver'] == 'native-tap-v2' and dout['driver_check'] == 'fork-unverified', f'{t} {d} driver.out')
        need(dout['port'] == plan[t]['ports'][d], f'{t} {d} port')
        need(not rows[-1:] or rows[-1]['elapsed_s'] >= stop[0]['elapsed_s'], f'{t} {d} rows end before stop')
        shots = [s for s in jl('screenshots-manifest.json') if s['testerKey'] == t and s['device'] == d]
        need(len(shots) == CAP[t][d] <= 6, f'{t} {d} png count')
        need(len([s for s in shots if s['capture'] == 'tester manual shot']) <= 5, f'{t} {d} manual cap')
        pngs_seen += len(shots)
        # no early first_minute / pulse unflagged
        for r in rows:
            if r['kind'] == 'first_minute' and r['op'] == 'log' and r['elapsed_s'] < 60:
                need(val['sessions'][d]['earlyFirstMinute'], f'{t} {d} early first_minute not flagged in validation.json')
            if r['kind'] == 'pulse' and r['op'] == 'log' and r['elapsed_s'] < 180:
                need(val['sessions'][d]['earlyPulse'], f'{t} {d} early pulse not flagged in validation.json')
need(stops_seen == 10, 'ten stops')
need(pngs_seen == 32, 'png total 32')
need(max(max(v.values()) for v in CAP.values()) <= 6, 'png cap')
rel = jl('inputs/glance-retest2-final-release-after-round.json')['release']
need(rel == RELEASE, 'post-round release pin')
bump('stopsChecked', 10)
bump('captureCapsChecked', 10)

# ---------------------------------------------------------------- 4. cleanup and counts
need(len(cleanup['recordedPids']) == 15 and cleanup['allAbsent'] is True and cleanup['signalsSent'] == [], 'cleanup pids')
need(len(cleanup['lateColdObservedProcessChecks']) == 13 and all(c['absent'] is True for c in cleanup['lateColdObservedProcessChecks']), 'late cold processes')
cc = notes['commandCounts']
need(cc['BashCalls'] == 308 and cc['validAssignedJSONCurls'] == 299 and cc['failedShellParseBeforeCurl'] == 8 and cc['executedBriefPipeViolation'] == 1 and cc['otherExecutedProtocolBreach'] == 0, 'command counts')
need(cc['validAssignedJSONCurls'] + cc['failedShellParseBeforeCurl'] + cc['executedBriefPipeViolation'] == cc['BashCalls'], 'command counts do not add up')
need(notes['closedAt'] == '2026-10-31T09:09:33.248155+00:00' and notes['nextPanelNotBefore'] == '2026-10-31T09:24:33.248155+00:00', 'closed or next-panel time')
need(notes['reportsReadInFull'] == 5 and notes['stops'] == 10, 'notes reports or stops')
need(not jl('inputs/glance-retest2-cleanup.json').get('liveOwnedProcesses'), 'cleanup lists owned processes')
bump('cleanupChecks', 3)

# ---------------------------------------------------------------- 5. reactions
ar = jl('all-driver-reactions.json')['sessions']
need(len(ar) == 10, 'ten reaction sessions')
for s in ar:
    rows = [json.loads(l) for l in (D / s['source']).read_text(encoding='utf-8').splitlines()]
    kept = [r for r in rows if r.get('reaction')]
    need(s['rawSha256'] == sha(s['source']) and s['reactionRows'] == len(kept) == len(s['reactions']), f'reactions count {s["source"]}')
    for a, b in zip(kept, s['reactions']):
        need(all(b[k] == a[k] for k in a), f'reaction row altered {s["source"]} {a["elapsed_s"]}')
        need(b['containsBackslash'] == ('\\' in a['reaction']), 'backslash flag')
    t = s['testerKey']
    nl = [r['elapsed_s'] for r in kept if r['reaction'] not in rep[t]]
    need(nl == s['notLiterallyInReportElapsedS'] and len(nl) == s['reactionsNotLiterallyInReport'], f'not-literal count {s["source"]}')
    bump('reactionRowsChecked', len(kept))

# ---------------------------------------------------------------- 6. identity index and source map hold no reference to generated hashes
for name in ('identity-index.json', 'source-map.json'):
    blob = (D / name).read_text(encoding='utf-8')
    for gen in ('manifest.json', 'sha256.json'):
        need(gen not in blob, f'{name} mentions {gen}')
    bump('noCycleChecks')
for rec in jl('identity-index.json')['testers']:
    t = rec['tester'].split()[0].lower()
    need(rec['historySha256'] == sha(f'{t}/own-history.original.md.txt') and rec['briefSha256'] == sha(f'{t}/brief.original.md.txt'), f'identity {t}')
    need(rec['historyLines'] == LINES[t], f'identity {t} lines')
    need(rec['driver'] == DRIVER, f'identity {t} driver')
sm = jl('source-map.json')['files']
need(len(sm) == 84, f'source map lists {len(sm)} copies, expected 84')
for f in sm:
    need(sha(f['packet']) == f['sha256'] and (D / f['packet']).stat().st_size == f['bytes'], f'source map hash {f["packet"]}')
    bump('sourceMapCopiesHashed')
ok_pairs = {(f['source'], f['sha256']) for f in sm}
need(sum(1 for f in sm if f['packet'].endswith('report.md')) == 5 and sum(1 for f in sm if f['packet'].endswith('report.original.md.txt')) == 5, 'report copies')
need(len({f['packet'] for f in sm}) == 84, 'duplicate packet paths')

# ---------------------------------------------------------------- 7. forbidden content
INDEX_FILES = {'manifest.json', 'sha256.json', 'primary-quote-validation.json'}   # written after this script; excluded so the proof is the same with or without them
BAD_NAME = re.compile(r'(\.png$|transcript|stderr|processes|command-scope|envelope|\.jsonl$)', re.I)
for p in sorted(D.rglob('*')):
    if p.is_file() and p.name not in INDEX_FILES:
        rel = p.relative_to(D).as_posix()
        if BAD_NAME.search(rel) and not rel.endswith('wall-clock.jsonl'):
            need(False, f'forbidden file name in packet: {rel}')
        bump('fileNamesScanned')
KEYS = ('tool_use_id', 'stop_reason', 'cache_creation_input_tokens', 'modelUsage', 'anthropic-ratelimit')
SKIP = ('own-history.original.md.txt', 'brief.original.md.txt', 'validate-quotes.py')   # supplied inputs, copied unread; they may quote tool vocabulary
for p in sorted(D.rglob('*')):
    if p.is_file() and p.name not in INDEX_FILES and not p.name.endswith(SKIP) and p.suffix != '.png':
        b = p.read_text(encoding='utf-8', errors='replace')
        for k in KEYS:
            need(k not in b, f'provider key {k} in {p.relative_to(D)}')
        bump('filesKeyScanned')

out = {'note': 'Deterministic result of validate-quotes.py. It does not depend on manifest.json or sha256.json. Counts are checks that ran and passed; there is no growing list.',
       'result': 'pass', 'counts': dict(sorted(counts.items())), 'sourceEpochNote': 'Source files were copied once, byte-exact, before anything derived was written; source-map.json records each source mtime.'}
(D / 'primary-quote-validation.json').write_text(json.dumps(out, indent=1) + '\n', encoding='utf-8')
print('validate-quotes: PASS', json.dumps(out['counts']))
