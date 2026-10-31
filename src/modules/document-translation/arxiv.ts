import type {Seed} from '../../api';
const modern=/^(\d{4}\.\d{4,5}(?:v\d+)?)$/i,legacy=/^([a-z-]+(?:\.[a-z]{2})?\/\d{7}(?:v\d+)?)$/i;
export function validArxivId(input:string):string|null{const value=input.trim().replace(/^arxiv\s*:\s*/i,'').replace(/^https?:\/\/(?:export\.)?arxiv\.org\/(?:abs|pdf|html|src|e-print)\//i,'').replace(/\.pdf$/i,'').split(/[?#]/)[0];return modern.test(value)||legacy.test(value)?value:null;}
export function detectArxiv(seed:Seed,documentText='',override=''):string|null{
  if(override){const id=validArxivId(override);if(!id)throw Error('arXiv 标识格式无效。');return id;}
  const fields=[seed.metadata.doi,seed.metadata.url,...(seed.metadata.fields||[]).filter(f=>/archive|arxiv|url|DOI/i.test(f.key)).map(f=>f.value)];
  for(const field of fields){if(!field)continue;const match=field.match(/(?:arxiv(?:\.org\/(?:abs|pdf|html)\/|\s*[:/]\s*)|10\.48550\/arxiv\.)([a-z-]+(?:\.[a-z]{2})?\/\d{7}(?:v\d+)?|\d{4}\.\d{4,5}(?:v\d+)?)/i);const id=match&&validArxivId(match[1]);if(id)return id;const direct=validArxivId(field);if(direct)return direct;}
  const match=documentText.slice(0,300000).match(/arxiv\s*:\s*([a-z-]+(?:\.[a-z]{2})?\/\d{7}(?:v\d+)?|\d{4}\.\d{4,5}(?:v\d+)?)/i);return match?validArxivId(match[1]):null;
}
