export interface LinkUpdate {
  reference:{original:string;position?:{start:{offset:number};end:{offset:number}}};change:string;
}
export function applyNoteLinkUpdates(note:string,updates:LinkUpdate[]):string{
  const ordered=[...updates].sort((a,b)=>(b.reference.position?.start.offset??-1)-(a.reference.position?.start.offset??-1));
  for(const u of ordered){
    const {reference:r,change}=u;const p=r.position;
    if(p){if(note.slice(p.start.offset,p.end.offset)===r.original)note=note.slice(0,p.start.offset)+change+note.slice(p.end.offset);}
    else if(r.original){
      // Frontmatter refs have a property key rather than a source position.
      // Replace literal links only inside YAML; preserve its original formatting.
      const yaml=/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/.exec(note);
      if(yaml)note=yaml[0].split(r.original).join(change)+note.slice(yaml[0].length);
    }
  }
  return note;
}
