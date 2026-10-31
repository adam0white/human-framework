#!/usr/bin/env python3
"""Validate every quoted span against the copied raw files. Run from anywhere: python3 -I validate-quotes.py
Reads exact-quote-extraction.json, ledger-additions.md, ask-ledger.md and the raw copies beside this script.
Writes primary-quote-validation.json. If sha256.json exists, also verifies every listed file hash.
Pure file reading and hashing; no network, no git, no pixels."""
from pathlib import Path
import hashlib, json, re
R = Path(__file__).resolve().parent
ex = json.loads((R / 'exact-quote-extraction.json').read_text())
res, bad = [], 0


def reactions(p):
    return [json.loads(l).get('reaction') or '' for l in p.read_text().splitlines()]


def check(label, rel, span):
    global bad
    p = R / rel
    ok = any(span in r for r in reactions(p)) if p.name == 'wall-clock.jsonl' else span in p.read_text()
    ok = ok and '|' not in span and '\n' not in span and span != ''
    bad += (not ok)
    res.append({'label': label, 'file': rel, 'span': span, 'exact': ok})


def q(s):
    return '"' + s + '"'


expected = {}
for i, (f, t) in enumerate(ex['testers'].items()):
    for lab in ('primaryReturn', 'laterFullReturn'):
        for rel in ('report.md', 'report.original.md.txt'):
            check(f'{f} {lab}', f'{f}/{rel}', t[lab])
    for extra, sp in t.get('laterExtraReturnSpans', {}).items():
        check(f'{f} {extra}', f'{f}/report.md', sp)
    for j, a in enumerate(t['rankedAsks'], 1):
        for rel in ('report.md', 'report.original.md.txt'):
            check(f'{f} ask {j}', f'{f}/{rel}', a)
    for j, a in t['laterAskSpans'].items():
        check(f'{f} later ask {j}', f'{f}/report.md', a)
    original = (R / f / 'report.original.md.txt').read_bytes()
    readable = (R / f / 'report.md').read_bytes()
    if f == 'jonas':
        # Director header is separate from the byte-exact producer body.
        assert readable.endswith(original) and len(readable) > len(original)
        assert hashlib.sha256(readable[:-len(original)]).hexdigest() == 'ce1c1549ad62b26423afce8334cac38866116b1b9ec594dbc7002ddb50f7de11'
    else:
        assert readable == original
    w = f'Opening return: {q(t["primaryReturn"])} Separate later return: {q(t["laterFullReturn"])}'
    for extra, sp in t.get('laterExtraReturnSpans', {}).items():
        w += f' {extra}: {q(sp)}'
    expected[2371 + i] = (t['tester'], w)
    for j, a in enumerate(t['rankedAsks'], 1):
        w = q(a)
        if str(j) in t['laterAskSpans']:
            w += f' Later wording (section 8): {q(t["laterAskSpans"][str(j)])}'
        expected[2376 + i * 3 + j - 1] = (t['tester'], w)
for s in ex['supportingSpans']:
    check(s['label'], s['file'], s['span'])


def parse(path):
    rows = [l for l in (R / path).read_text().splitlines() if l.startswith('| F-')]
    out = {}
    for l in rows:
        assert l.count('|') == 10, ('pipe in cell', l[:80])
        c = [x.strip() for x in l.strip('|').split(' | ')]
        assert len(c) == 9, l[:80]
        out[int(re.match(r'F-(\d+)', c[0]).group(1))] = c
    return rows, out


rows, parsed = parse('ledger-additions.md')
assert sorted(parsed) == list(range(2371, 2391)), sorted(parsed)
for i, c in parsed.items():
    name, words = expected[i]
    assert c[1] == '2026-10-31' and c[2] == 'smoke' and c[3] == 'playtester', c[:4]
    assert c[4] == 'Fictional LIGHT panel: ' + name, c[4]
    assert c[5] == words, ('words differ', i)
    assert c[6] in ('keep', 'mixed') and (c[6] == 'keep') == (name == 'Jonas Berg'), (i, c[6])
    assert c[8].startswith('docs/lab/reviews/light-2026-10-30/smoke/') and c[8].endswith('/report.md'), c[8]
    assert not any(x in c[7] for x in ('tool' + 'u_', 'tool' + '_result'))
    # semicolons only between route prefixes
    parts = c[7].split('; ')
    assert all(';' not in p for p in parts), c[7]
    assert all(p.startswith(('fix:', 'calibration:')) for p in parts), c[7]
    assert all(p == 'calibration:C14' or re.match(r'^fix:smoke \S.*\(open\)$', p) for p in parts), c[7]
_, asks = parse('ask-ledger.md')
assert sorted(asks) == list(range(2376, 2391))
assert all(asks[i] == parsed[i] for i in asks)
assert 'Jonah' not in (R / 'ledger-additions.md').read_text()
print('checked', len(res), 'spans;', 'failures', bad, '; rows', len(rows))
(R / 'primary-quote-validation.json').write_text(json.dumps({'failures': bad, 'checks': res}, ensure_ascii=False, indent=1) + '\n')
sh = R / 'sha256.json'
if sh.exists():
    idx = json.loads(sh.read_text())
    miss = [k for k, v in idx.items() if hashlib.sha256((R / k).read_bytes()).hexdigest() != v]
    print('hash index entries', len(idx), 'mismatches', miss)
    bad += len(miss)
raise SystemExit(1 if bad else 0)
