// Concrete histories from docs/work-progress-execution.md, committed before matrix execution.
const start=(actor='A',item='work-1')=>({type:'start',actor,item});
const stop=actor=>({type:'stop',actor});
const handover=(from,to)=>({type:'handover',from,to,item:'work-1'});
export const CASES=Object.freeze([
 {id:'H1',setup:{},commands:[{at:0,command:start()}],expected:[20],fixed:[20]},
 {id:'H2',setup:{toolArrival:1},commands:[{at:0,command:start()}],expected:[15],fixed:[20]},
 {id:'H3',setup:{},commands:[{at:0,command:start()},{at:7,command:stop('A')},{at:10,command:start()}],expected:[23],fixed:[23]},
 {id:'H4',setup:{toolArrival:1},commands:[{at:0,command:start()},{at:1,command:stop('A')},{at:1,command:start()}],expected:[15],fixed:[20]},
 {id:'H5',setup:{},commands:[{at:0,command:start()},{at:1,command:handover('A','B')}],expected:[19],fixed:[20]},
 {id:'H6',setup:{},commands:[{at:0,command:start('B')},{at:1,command:handover('B','A')}],expected:[20],fixed:[18]},
 {id:'H7',setup:{busyB:true},commands:[{at:0,command:start()},{at:1,command:handover('A','B')}],expected:[20],fixed:[20]},
 {id:'H8',setup:{items:2},commands:[{at:0,command:start()},{at:2,command:start('B','work-2')}],expected:[20,20],fixed:[20,20]}
].map(record=>Object.freeze(record)));
export const DRIVERS=Object.freeze(['minute','event','uneven']);
export const END_AT=40;
