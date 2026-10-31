#!/usr/bin/env python3
"""Validate every quoted span against the copied raw files. Run from anywhere: python3 -I validate-quotes.py
Reads exact-quote-extraction.json, ledger-additions.md and the raw copies beside this script. Writes primary-quote-validation.json."""
from pathlib import Path
import json, re
R = Path(__file__).resolve().parent
ex = json.loads((R / 'exact-quote-extraction.json').read_text())
res, bad = [], 0
def reactions(p):
    return [json.loads(l).get('reaction') or '' for l in p.read_text().splitlines()]
def check(label, tester, rel, span):
    global bad
    p = R / tester / rel if not rel.startswith(tester + '/') else R / rel
    if p.name == 'wall-clock.jsonl':
        ok = any(span in r for r in reactions(p))
    else:
        ok = span in p.read_text()
    ok = ok and '|' not in span and '\n' not in span
    bad += (not ok)
    res.append({'label': label, 'file': str(p.relative_to(R)), 'span': span, 'exact': ok})
for f, t in ex['testers'].items():
    for lab in ('primaryReturn', 'laterFullReturn'):
        for rel in ('report.md', 'report.original.md.txt'):
            check(f'{f} {lab}', f, rel, t[lab])
    for i, a in enumerate(t['rankedAsks'], 1):
        for rel in ('report.md', 'report.original.md.txt'):
            check(f'{f} ask {i}', f, rel, a)
    assert (R / f / 'report.md').read_bytes() == (R / f / 'report.original.md.txt').read_bytes()
for s in ex['supportingSpans']:
    check(s['label'], s['tester'], s['file'], s['span']) if s['file'].startswith(s['tester'] + '/') else None
# ledger rows: the words cell (outer quotes removed) must equal an extracted span
spans = {v for t in ex['testers'].values() for v in [t['primaryReturn']] + t['rankedAsks']}
rows = [l for l in (R / 'ledger-additions.md').read_text().splitlines() if l.startswith('| F-')]
ids = [int(re.match(r'\| F-(\d+)', l).group(1)) for l in rows]
assert ids == list(range(2341, 2361)), ids
for l in rows:
    c = l.split(' | ')
    assert len(c) == 9, l[:80]
    w = c[5]
    assert w.startswith('"') and w.endswith('"') and w[1:-1] in spans, l[:80]
print('checked', len(res), 'spans;', 'failures', bad, '; rows', len(rows))
(R / 'primary-quote-validation.json').write_text(json.dumps({'failures': bad, 'checks': res}, ensure_ascii=False, indent=1) + '\n')
raise SystemExit(1 if bad else 0)
