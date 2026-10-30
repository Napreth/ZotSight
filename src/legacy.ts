import type { Seed } from './model';

export function legacyProxySource(markdown:string):string|null {
  const match=markdown.replace(/\r\n/g,'\n').match(/^---\nzotsight-source: ("[^\n]*")\ntags: \[zotsight\]\n---\n/);
  if(!match)return null;
  try{const path:unknown=JSON.parse(match[1]);return typeof path==='string'&&path.endsWith('.zsseed')?path:null;}catch{return null;}
}

export function isUnchangedLegacyProxy(markdown:string,path:string,seed:Seed):boolean {
  const expected=`---\nzotsight-source: ${JSON.stringify(path)}\ntags: [zotsight]\n---\n\n# ${seed.metadata.title.replace(/[\r\n]/g,' ')}\n\n[[${path}|打开文献]]\n\n${seed.note}\n`;
  return markdown.replace(/\r\n/g,'\n')===expected.replace(/\r\n/g,'\n');
}
