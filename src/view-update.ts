import type {Seed} from './model';

const equal=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);

function documentIdentity(seed:Seed):unknown {
  const attachment=seed.attachments.find(item=>item.id===seed.reader.attachmentId)||seed.attachments[0];
  if(!attachment)return null;
  return {
    id:attachment.id,kind:attachment.kind,path:attachment.path,key:attachment.key,
    source:attachment.kind==='zotero'&&seed.source?{
      provider:seed.source.provider,libraryType:seed.source.libraryType,
      libraryId:seed.source.libraryId,itemKey:seed.source.itemKey
    }:undefined
  };
}

/** File synchronization must not reset an unchanged PDF or its local position. */
export function seedViewUpdate(previous:Seed|null,next:Seed,clear:boolean) {
  return {
    rebuild:clear||!previous,
    document:!previous||!equal(documentIdentity(previous),documentIdentity(next)),
    note:!previous||previous.note!==next.note,
    attachments:!previous||!equal(previous.attachments,next.attachments),
    metadata:!previous||!equal(previous.metadata,next.metadata),
    annotations:!previous||!equal(previous.annotations,next.annotations),
    split:!previous||previous.reader.split!==next.reader.split
  };
}
