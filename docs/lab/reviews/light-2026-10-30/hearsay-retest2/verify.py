import pathlib,json,hashlib
p=pathlib.Path(__file__).parent
rows=json.loads((p/'ledger-rows.json').read_text()); assert [r['id'] for r in rows]==[f'F-{i}' for i in range(2641,2661)]
n=0
for r in rows:
 s=(p/r['source']).read_text()
 for x in [r.get('opening'),r.get('later'),r.get('primary'),*r.get('unranked',[])]:
  if x:
   assert s[x['char_start']:x['char_end_exclusive']]==x['text']; assert s.count('\n',0,x['char_start'])+1==x['line_start']; assert s.count('\n',0,x['char_end_exclusive'])+1==x['line_end']; n+=1
sources=json.loads((p/'source-map.json').read_text())
for x in sources:
 original=pathlib.Path(x['source']); st=original.stat(); b=original.read_bytes(); copied=(p/x['destination']).read_bytes()
 assert hashlib.sha256(b).hexdigest()==x['sha256']==hashlib.sha256(copied).hexdigest()
 assert len(b)==x['bytes'] and st.st_mtime_ns==x['mtime_ns']
assert len({r['id'] for r in rows})==20 and sum(r['type']=='return' for r in rows)==5 and sum(r['type']=='ranked ask' for r in rows)==15
for r in rows:
 assert r['status']=='open' and r['route']=='fix:hearsay'
 if r['type']=='ranked ask': assert r['rank'] in (1,2,3)
assert all(next(r for r in rows if r['id']==i)['target']=='2026-11-03' for i in ('F-2649','F-2652','F-2658'))
raw=json.loads((p/'all-driver-reactions.json').read_text()); stops=json.loads((p/'actual-stops.json').read_text()); assert len(stops)==10
for r in raw:
 v=json.loads((p/r['source']).read_text().splitlines()[r['line']-1]); assert v['reaction']==r['reaction']
check=json.loads((p/'curated-parser-check.json').read_text()); assert not check['problems'] and check['parsedRows']==20 and all(x[1]==1 for x in check['fixCounts'])
print(json.dumps({'spans':n,'copiedSources':len(sources),'rawReactions':len(raw),'finalStops':len(stops),'parserRows':check['parsedRows'],'parserProblems':len(check['problems'])}))
