import pathlib,json,hashlib
p=pathlib.Path(__file__).parent; rows=json.loads((p/'ledger-rows.json').read_text()); assert [r['id'] for r in rows]==[f'F-{i}' for i in range(2671,2691)]; assert sum(r['type']=='return' for r in rows)==5 and sum(r['type']=='ranked ask' for r in rows)==15
n=0
for r in rows:
 assert r['route']=='fix:stairwell' and r['status']=='open'
 s=(p/r['source']).read_text()
 for x in [r.get('opening'),r.get('later'),r.get('primary'),r.get('later_ask'),*r.get('unranked',[])]:
  if x:
   assert s[x['char_start']:x['char_end_exclusive']]==x['text']; assert s.count('\n',0,x['char_start'])+1==x['line_start']; assert s.count('\n',0,x['char_end_exclusive'])+1==x['line_end']; n+=1
sources=json.loads((p/'source-map.json').read_text())
for x in sources:
 o=pathlib.Path(x['source']); b=o.read_bytes(); st=o.stat(); assert hashlib.sha256(b).hexdigest()==x['sha256']==hashlib.sha256((p/x['destination']).read_bytes()).hexdigest(); assert len(b)==x['bytes'] and st.st_mtime_ns==x['mtime_ns']
raw=json.loads((p/'all-driver-reactions.json').read_text()); stops=json.loads((p/'actual-stops.json').read_text()); assert len(stops)==10
for r in raw:
 v=json.loads((p/r['source']).read_text().splitlines()[r['line']-1]); assert v['reaction']==r['reaction'] and v['kind']==r['kind'] and v['op']==r['op']
for name in ['maya','jonas','leila','rosa','ivo']:
 companion=json.loads((p/name/'raw-reactions-companion.json').read_text())
 for x in companion['rows']:
  v=json.loads((p/name/x['device']/'wall-clock.jsonl').read_text().splitlines()[x['row']-1]); assert v['reaction']==x['reaction'] and v['op']==x['op'] and v['kind']==x['kind']
for x in json.loads((p/'screenshots-manifest.json').read_text()):
 q=pathlib.Path(x['source']); b=q.read_bytes(); assert hashlib.sha256(b).hexdigest()==x['sha256'] and len(b)==x['bytes'] and q.stat().st_mtime_ns==x['mtime_ns']
check=json.loads((p/'curated-parser-check.json').read_text()); assert not check['problems'] and check['parsedRows']==20 and all(x[1]==1 for x in check['fixCounts']) and not check['calibrationRows']
print(json.dumps(dict(spans=n,sourceCopies=len(sources),rawReactions=len(raw),finalStops=len(stops),screenshotHashes=len(json.loads((p/'screenshots-manifest.json').read_text())),parserRows=check['parsedRows'],parserProblems=0)))
