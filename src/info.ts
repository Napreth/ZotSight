import type { Seed } from './model';

export function renderLiteratureInfo(container:HTMLElement,seed:Seed):void{
  const meta=seed.metadata;const info=container.createDiv('zs-item-info');
  const table=info.createDiv('zs-field-table');
  const row=(label:string,value:string,key='')=>{const r=table.createDiv('zs-field-row');r.createDiv({cls:'zs-field-label',text:label});const cell=r.createDiv('zs-field-value');
    if((key==='url'&&/^https?:\/\//i.test(value))||(key==='DOI'&&value))cell.createEl('a',{text:value,href:key==='DOI'?`https://doi.org/${encodeURIComponent(value)}`:value,attr:{target:'_blank',rel:'noopener'}});else cell.setText(value);return r;
  };
  row('条目类型',meta.itemTypeLabel||meta.itemType||'文献');row('标题',meta.title);
  const creators=meta.creators?.length?meta.creators:meta.authors?[{name:meta.authors,role:'作者'}]:[];
  const roles=new Map<string,string[]>();for(const c of creators){const names=roles.get(c.role)||[];names.push(c.name);roles.set(c.role,names);}for(const [role,names] of roles){const r=row(role,names.join('；'));r.addClass('zs-creators-row');r.querySelector<HTMLElement>('.zs-field-value')!.title=names.join('；');}
  const fallback=[{key:'date',label:'日期',value:meta.year},{key:'publicationTitle',label:'出版物',value:meta.publication},{key:'DOI',label:'DOI',value:meta.doi},{key:'url',label:'网址',value:meta.url}];
  for(const field of meta.fields||fallback){if(field.key==='title')continue;const el=row(field.label,field.value,field.key);el.setAttribute('data-bibliographic',field.key);}
}
