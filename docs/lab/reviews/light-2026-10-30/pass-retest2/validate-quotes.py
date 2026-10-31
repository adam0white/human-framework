#!/usr/bin/env python3
"""Validate the pass-retest2 source packet. Run from the packet dir: python3 -I validate-quotes.py
Exits 1 on any failure. Rewrites primary-quote-validation.json deterministically."""
from pathlib import Path
import hashlib, json, re, sys

H = Path(__file__).resolve().parent
TESTERS = ['maya', 'emre', 'nia', 'rosa', 'sonia']
NAMES = {'maya': 'Maya Chen', 'emre': 'Emre Kaya', 'nia': 'Nia Okafor', 'rosa': 'Rosa Alvarez', 'sonia': 'Sonia Ionescu'}
DOCS = 'docs/lab/reviews/light-2026-10-30/pass-retest2'
fails, checks = [], []


def ok(name, cond, detail=''):
    checks.append({'check': name, 'ok': bool(cond)})
    if not cond:
        fails.append(f'{name} {detail}'.strip())


def jl(p):
    return json.loads((H / p).read_text(encoding='utf-8'))


def sha(p):
    return hashlib.sha256((H / p).read_bytes()).hexdigest()


ex = jl('exact-quote-extraction.json')
rep = {t: (H / t / 'report.md').read_text(encoding='utf-8') for t in TESTERS}
orig = {t: (H / t / 'report.original.md.txt').read_text(encoding='utf-8') for t in TESTERS}


def clean(s):
    return isinstance(s, str) and s and '|' not in s and '\n' not in s


# report copies byte-identical
for t in TESTERS:
    ok(f'{t} report copies identical', (H / t / 'report.md').read_bytes() == (H / t / 'report.original.md.txt').read_bytes())


def in_reports(t, s, label):
    ok(f'{t} {label} single-line pipe-free', clean(s), s[:40] if isinstance(s, str) else '')
    ok(f'{t} {label} in report.md', s in rep[t], s[:50])
    ok(f'{t} {label} in report.original', s in orig[t], s[:50])


for t in TESTERS:
    e = ex['testers'][t]
    in_reports(t, e['primaryReturn'], 'primaryReturn')
    in_reports(t, e['laterFullReturn'], 'laterFullReturn')
    ok(f'{t} later return is a separate later occurrence', rep[t].index(e['primaryReturn']) < rep[t].rindex(e['laterFullReturn']))
    for k, s in e['laterExtraReturnSpans'].items():
        in_reports(t, s, 'extra ' + k)
    ok(f'{t} three ranked asks', len(e['rankedAsks']) == 3)
    for i, a in enumerate(e['rankedAsks'], 1):
        in_reports(t, a, f'ask{i}')
    for i, v in e['laterAskSpans'].items():
        for sp in v:
            in_reports(t, sp['span'], f'later ask{i} {sp["label"]}')
            ok(f'{t} later ask{i} differs from ask', sp['span'] != e['rankedAsks'][int(i) - 1])
for s in ex['supportingSpans']:
    p = H / s['file']
    ok('supporting file exists ' + s['file'], p.exists())
    if p.exists():
        txt = p.read_text(encoding='utf-8')
        if p.name == 'wall-clock.jsonl':
            reacts = [json.loads(l).get('reaction') or '' for l in txt.splitlines()]
            ok('supporting in reaction ' + s['label'], any(s['span'] in r for r in reacts))
        else:
            ok('supporting in report ' + s['label'], s['span'] in txt)
        ok('supporting clean ' + s['label'], clean(s['span']))

# raw stops and reactions
for t in TESTERS:
    for d in ('phone', 'desktop'):
        rows = [json.loads(l) for l in (H / t / d / 'wall-clock.jsonl').read_text(encoding='utf-8').splitlines()]
        stops = [r for r in rows if r['kind'] == 'stop' and r['op'] == 'log']
        ok(f'{t} {d} exactly one stop', len(stops) == 1)

# ledger rows
ROW = re.compile(r'^\| (F-\d+) \| (\S+) \| (\S+) \| (\S+) \| (.*?) \| (.*?) \| (\S+) \| (.*?) \| (\S+) \|$')
led = {}
for fn in ('ledger-additions.md', 'ask-ledger.md'):
    for l in (H / fn).read_text(encoding='utf-8').splitlines():
        if l.startswith('| F-'):
            ok(f'{fn} row has 10 pipes {l[:8]}', l.count('|') == 10)
            m = ROW.match(l)
            ok(f'{fn} row parses {l[:8]}', m)
            if m:
                led.setdefault(fn, {})[m.group(1)] = m.groups()
ids = sorted(int(k[2:]) for k in led['ledger-additions.md'])
ok('ids 2491-2510', ids == list(range(2491, 2511)), str(ids))
ok('ids 2511-2520 unused', not any(2511 <= i <= 2520 for i in ids))
ok('ask-ledger is 2496-2510', sorted(int(k[2:]) for k in led['ask-ledger.md']) == list(range(2496, 2511)))
for k, v in led['ask-ledger.md'].items():
    ok('ask row identical in both ledgers ' + k, led['ledger-additions.md'].get(k) == v)
RT = re.compile(r'^fix:pass \S.*\(open\)$')
for k, g in led['ledger-additions.md'].items():
    _, date, game, kind, who, words, verdict, routes, source = g
    ok(f'{k} fields', date == '2026-10-31' and game == 'pass' and kind == 'playtester' and verdict == 'mixed')
    t = next((x for x in TESTERS if who == f'Fictional LIGHT panel: {NAMES[x]}'), None)
    ok(f'{k} who', t is not None, who)
    ok(f'{k} source', source == f'{DOCS}/{t}/report.md')
    parts = [p.strip() for p in routes.split(';')]
    good = all(RT.match(p) or p == 'calibration:C14' for p in parts)
    ok(f'{k} routes grammar', good, routes[:60])
    ok(f'{k} C14 last and once', parts.count('calibration:C14') <= 1 and ('calibration:C14' not in parts or parts[-1] == 'calibration:C14'))
    ok(f'{k} only one fix route', sum(1 for p in parts if p.startswith('fix:')) == 1)
    n = int(k[2:])
    if t:
        e = ex['testers'][t]
        if n < 2496:
            w = f'Opening return: "{e["primaryReturn"]}" Separate later return: "{e["laterFullReturn"]}"'
            for lab, sp in e['laterExtraReturnSpans'].items():
                w += f' {lab}: "{sp}"'
        else:
            j = (n - 2496) % 3 + 1
            ok(f'{k} ask tester', TESTERS[(n - 2496) // 3] == t)
            w = f'"{e["rankedAsks"][j - 1]}"'
            for sp in e['laterAskSpans'].get(str(j), []):
                w += f' {sp["label"]}: "{sp["span"]}"'
        ok(f'{k} words match extraction exactly', words == w)

# identity
fz = jl('inputs/pass-retest2-input-freeze.json')
fzp = {p['tester']: p for p in fz['players']}
idx = jl('identity-index.json')
for rec, t in zip(idx['testers'], TESTERS):
    ok(f'{t} history hash vs freeze', rec['historySha256'] == sha(f'{t}/own-history.original.md.txt') == fzp[NAMES[t]]['historySha256'] if 'historySha256' in fzp[NAMES[t]] else rec['historySha256'] == sha(f'{t}/own-history.original.md.txt'))
    d = jl(f'{t}/dispatch.json')
    ok(f'{t} dispatch matches', d['model'] == rec['model'] and d['time'] == rec['dispatchTime'])
    comp = jl(f'{t}/completion.json')
    ok(f'{t} completion exit 0', comp['exit'] == 0)
    for dev in ('phone', 'desktop'):
        rs = jl(f'{t}/{dev}/release-start.json')
        ok(f'{t} {dev} release pin', json.dumps(rs).count('288b2fda7c8589931a9d9e8f044f1a8aaf630333') >= 1)
cl = jl('inputs/pass-retest2-process-cleanup.json')
ok('15 pids all absent', len(cl['recordedPids']) == 15 and cl['allAbsent'] is True and cl['signalsSent'] == [])

# forbidden content
bad_names = re.compile(r'(\.png$|transcript|tester\.stderr|processes\.json|command-scope|envelope)', re.I)
keys = re.compile(r'tool_use_id|stop_reason|cache_creation_input_tokens|modelUsage')
for p in sorted(H.rglob('*')):
    if not p.is_file():
        continue
    r = str(p.relative_to(H))
    ok('no forbidden file ' + r, not bad_names.search(r))
    if p.suffix in ('.json', '.md', '.jsonl', '.py') or p.name.endswith('.txt') or p.name == 'driver.out':
        if r in ('validate-quotes.py', 'primary-quote-validation.json'):
            continue
        ok('no provider keys ' + r, not keys.search(p.read_text(encoding='utf-8', errors='replace')))

# hash coverage, when present
self_names = {'manifest.json', 'sha256.json', 'source-map.json', 'identity-index.json'}
if (H / 'sha256.json').exists() and (H / 'manifest.json').exists():
    sj, mj = jl('sha256.json'), jl('manifest.json')
    ok('sha256 hashes match', all(sha(k) == v for k, v in sj['files'].items()))
    ok('manifest paths exist', all((H / f['path']).exists() for f in mj['files']))
    cover = {f['path'] for f in mj['files']}
    allf = {str(p.relative_to(H)) for p in H.rglob('*') if p.is_file()}
    ok('manifest covers all but itself and sha256', allf - cover <= {'manifest.json', 'sha256.json'}, str(sorted(allf - cover)))
    ok('sha256 covers all but itself', allf - set(sj['files']) <= {'sha256.json'}, str(sorted(allf - set(sj['files']))))
    excluded = {'manifest.json', 'sha256.json', 'source-map.json', 'identity-index.json'}
    sm = jl('source-map.json')
    deps = [row['packet'] for row in sm['files']]
    ok('source-map no index dependencies', not (set(deps) & excluded))
    ok('source-map dependency paths exist', all((H / p).is_file() for p in deps))
    ok('source-map actual payload hashes', all(sha(row['packet']) == row['sha256'] for row in sm['files']))
    for n in ('source-map.json', 'identity-index.json'):
        txt = (H / n).read_text(encoding='utf-8')
        ok(n + ' no current index hashes', all(sha(k) not in txt for k in excluded))

out = {'tester count': len(TESTERS), 'checks': len(checks), 'failures': fails, 'result': 'PASS' if not fails else 'FAIL'}
(H / 'primary-quote-validation.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
print(out['result'], len(checks), 'checks', len(fails), 'failures')
for f in fails[:40]:
    print(' FAIL', f)
sys.exit(1 if fails else 0)
