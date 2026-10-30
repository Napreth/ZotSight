import { App, Modal, Notice, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type ZotSightPlugin from './main';
import { libraryPrefix, newSeed, ZoteroSource } from './model';
import { Library, metadataOf, ZoteroCollection, ZoteroItem } from './zotero';

export const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
export function run(task: ()=>void|Promise<void>): void { try{Promise.resolve(task()).catch(e=>new Notice(message(e),8000));}catch(e){new Notice(message(e),8000);} }
export class SearchModal extends Modal {
  private timer?:ReturnType<typeof setTimeout>;private sequence=0;private closed=false;private start=0;private query='';
  private libraries:Library[]=[];private collections=new Map<string,ZoteroCollection[]>();private expanded=new Set<string>();
  private library?:Library;private collection?:string;private selected?:ZoteroItem;
  private tree!:HTMLElement;private list!:HTMLElement;private breadcrumb!:HTMLElement;private status!:HTMLElement;
  private previous!:HTMLButtonElement;private next!:HTMLButtonElement;private create!:HTMLButtonElement;
  constructor(private plugin:ZotSightPlugin,private choose:(item:ZoteroItem,source:ZoteroSource)=>Promise<void>,private folder?:string){super(plugin.app);}
  onOpen():void {
    this.closed=false;this.titleEl.setText('新建文献');this.modalEl.addClass('zs-library-modal');
    const browser=this.contentEl.createDiv('zs-library-browser');
    const sidebar=browser.createDiv('zs-library-sidebar');sidebar.createDiv({cls:'zs-library-caption',text:'文献库'});
    this.tree=sidebar.createDiv({cls:'zs-library-tree',attr:{role:'tree','aria-label':'Zotero 文献库与分类'}});
    this.tree.addEventListener('keydown',e=>{const items=Array.from(this.tree.querySelectorAll<HTMLElement>('[role=treeitem]'));const i=items.indexOf(e.target as HTMLElement);let n=i;if(e.key==='ArrowDown')n=Math.min(items.length-1,i+1);if(e.key==='ArrowUp')n=Math.max(0,i-1);if(e.key==='Home')n=0;if(e.key==='End')n=items.length-1;if(n!==i){e.preventDefault();items[n]?.focus();}});
    const main=browser.createDiv('zs-library-main');const toolbar=main.createDiv('zs-library-toolbar');this.breadcrumb=toolbar.createDiv({cls:'zs-library-breadcrumb',text:'选择文献库'});
    const input=toolbar.createEl('input',{type:'search',attr:{placeholder:'搜索当前文献库或分类…','aria-label':'搜索 Zotero'}});
    input.oninput=()=>{this.query=input.value;this.start=0;this.sequence++;clearTimeout(this.timer);this.timer=setTimeout(()=>void this.search(),200);};
    this.list=main.createDiv('zs-library-items');
    const pagination=main.createDiv('zs-library-pagination');this.previous=pagination.createEl('button',{text:'上一页'});this.previous.disabled=true;this.previous.onclick=()=>{this.start=Math.max(0,this.start-50);void this.search();};
    this.status=pagination.createSpan();this.next=pagination.createEl('button',{text:'下一页'});this.next.disabled=true;this.next.onclick=()=>{this.start+=50;void this.search();};
    const footer=this.contentEl.createDiv('zs-library-footer');const alternatives=footer.createDiv('zs-library-alternatives');
    alternatives.createEl('button',{text:'使用 ItemKey / 链接'}).onclick=()=>{this.close();new BindModal(this.plugin,async source=>{const item=await this.plugin.client.item(source);await this.choose(item,source);}).open();};
    alternatives.createEl('button',{text:'空白文献'}).onclick=()=>{this.close();run(()=>this.plugin.createSeed(newSeed(),this.folder));};
    this.create=footer.createEl('button',{cls:'mod-cta',text:'创建文献'});this.create.disabled=true;this.create.onclick=()=>run(()=>this.createSelected());
    run(()=>this.initialize());
  }
  private key(library:Library):string{return `${library.libraryType}:${library.libraryId}`;}
  private async initialize():Promise<void>{
    this.tree.setText('正在读取文献库…');
    try{this.libraries=await this.plugin.client.libraries();if(this.closed)return;this.renderTree();const initial=this.libraries.find(l=>l.libraryType===this.plugin.settings.libraryType&&l.libraryId===this.plugin.settings.libraryId)||this.libraries[0];if(initial)await this.selectLibrary(initial);}
    catch(e){if(this.closed)return;this.tree.empty();this.tree.createDiv({cls:'zs-muted',text:message(e)});this.tree.createEl('button',{text:'重试'}).onclick=()=>run(()=>this.initialize());}
  }
  private async selectLibrary(library:Library,collection?:string):Promise<void>{
    this.library=library;this.collection=collection;this.start=0;this.selected=undefined;this.create.disabled=true;
    const key=this.key(library);this.expanded.add(key);
    if(!this.collections.has(key)){try{const rows=await this.plugin.client.collections(library);if(this.closed)return;this.collections.set(key,rows);}catch(e){new Notice(message(e));}}
    if(this.closed)return;this.renderTree();await this.search();
  }
  private renderTree():void{
    this.tree.empty();for(const library of this.libraries){const rootKey=this.key(library);const group=this.tree.createDiv({attr:{role:'group'}});
      const renderNode=(name:string,id:string,depth:number,collection?:string)=>{
        const data=this.collections.get(rootKey)||[];const children=data.filter(c=>(c.data.parentCollection||undefined)===collection);const expandable=!collection||children.length>0;
        const row=group.createDiv({cls:'zs-library-node',attr:{role:'treeitem',tabindex:'0','aria-level':String(depth+1),'data-node-id':id,'aria-selected':String(this.library===library&&this.collection===collection)}});row.style.paddingInlineStart=`${8+depth*17}px`;
        const arrow=row.createSpan('zs-tree-arrow');if(expandable){row.setAttribute('aria-expanded',String(this.expanded.has(id)));setIcon(arrow,this.expanded.has(id)?'chevron-down':'chevron-right');arrow.onclick=e=>{e.stopPropagation();run(async()=>{if(this.expanded.has(id))this.expanded.delete(id);else{this.expanded.add(id);if(!this.collections.has(rootKey))this.collections.set(rootKey,await this.plugin.client.collections(library));}if(!this.closed)this.renderTree();});};}
        setIcon(row.createSpan('zs-tree-icon'),collection?'folder':library.libraryType==='group'?'users':'library');row.createSpan({text:name});
        row.onclick=()=>run(()=>this.selectLibrary(library,collection));
        row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();row.click();}if(e.key==='ArrowRight'&&expandable&&!this.expanded.has(id)){e.preventDefault();arrow.click();}if(e.key==='ArrowLeft'&&expandable&&this.expanded.has(id)){e.preventDefault();arrow.click();}};
        if(this.expanded.has(id))for(const child of children)renderNode(child.data.name,`${rootKey}/${child.key}`,depth+1,child.key);
      };renderNode(library.name,rootKey,0);
    }
  }
  private async search():Promise<void>{
    if(!this.library)return;const id=++this.sequence;this.selected=undefined;this.create.disabled=true;this.list.empty();this.list.createDiv({cls:'zs-empty-small',text:'正在读取文献…'});
    const library=this.library;const collectionName=(this.collections.get(this.key(library))||[]).find(c=>c.key===this.collection)?.data.name;
    this.breadcrumb.setText([library.name,collectionName].filter(Boolean).join(' / '));
    try{const {items,hasMore}=await this.plugin.client.browse(library,this.query,this.start,this.collection);if(id!==this.sequence||this.closed)return;this.list.empty();this.previous.disabled=this.start===0;this.next.disabled=!hasMore;this.status.setText(items.length?`${this.start+1}–${this.start+items.length}`:'没有文献');
      if(!items.length){this.list.createDiv({cls:'zs-empty-small',text:'没有找到文献。'});return;}
      const table=this.list.createEl('table',{cls:'zs-library-table'});const header=table.createEl('thead').createEl('tr');for(const label of ['标题','作者','年份'])header.createEl('th',{text:label});const body=table.createEl('tbody');
      for(const item of items){const meta=metadataOf(item);const row=body.createEl('tr',{attr:{tabindex:'0','aria-selected':'false'}});row.createEl('td',{text:meta.title});row.createEl('td',{text:item.meta?.creatorSummary||meta.authors});row.createEl('td',{text:meta.year});
        row.onclick=()=>{this.selected=item;body.querySelectorAll('tr').forEach(r=>r.setAttribute('aria-selected',String(r===row)));this.create.disabled=false;};row.ondblclick=()=>run(async()=>{row.click();await this.createSelected();});row.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();row.click();run(()=>this.createSelected());}if(e.key===' '){e.preventDefault();row.click();}};
      }
    }catch(e){if(id!==this.sequence||this.closed)return;this.list.empty();this.list.createDiv({cls:'zs-connection-error',text:message(e)});this.list.createEl('button',{text:'重试'}).onclick=()=>void this.search();}
  }
  private async createSelected():Promise<void>{if(!this.selected||!this.library)return;this.create.disabled=true;const {libraryType,libraryId}=this.library;try{await this.choose(this.selected,{provider:'zotero',libraryType,libraryId,itemKey:this.selected.key});this.close();}finally{this.create.disabled=false;}}
  onClose():void{this.closed=true;this.sequence++;clearTimeout(this.timer);this.contentEl.empty();}
}
export class BindModal extends Modal {
  constructor(private plugin:ZotSightPlugin,private choose:(source:ZoteroSource)=>Promise<void>){super(plugin.app);}
  onOpen():void{
    this.titleEl.setText('绑定 Zotero 文献');let key='';let type=this.plugin.settings.libraryType;let id=this.plugin.settings.libraryId;
    new Setting(this.contentEl).setName('ItemKey 或 Zotero 链接').setDesc('例如 ABCD1234 或 zotero://select/library/items/ABCD1234').addText(t=>t.setPlaceholder('ItemKey / Zotero 链接').onChange(v=>key=v.trim()));
    new Setting(this.contentEl).setName('文献库').addDropdown(d=>d.addOption('user','个人库').addOption('group','群组库').setValue(type).onChange(v=>type=v as 'user'|'group'));
    new Setting(this.contentEl).setName('Library ID').setDesc('本机个人库可使用 0；群组库填写群组数字 ID。').addText(t=>t.setValue(id).onChange(v=>id=v.trim()));
    new Setting(this.contentEl).addButton(b=>b.setButtonText('绑定文献').setCta().onClick(()=>run(async()=>{
      const match=key.match(/(?:zotero:\/\/select\/|zotero:\/\/open-pdf\/)(library|groups\/(\d+))\/items\/([A-Z0-9]{8})/i);
      if(match){type=match[2]?'group':'user';id=match[2]||'0';key=match[3].toUpperCase();}
      key=key.toUpperCase();if(!/^[A-Z0-9]{8}$/.test(key))throw new Error('ItemKey 应为 8 位字母或数字。');
      const source:ZoteroSource={provider:'zotero',libraryType:type,libraryId:id,itemKey:key};libraryPrefix(source);await this.choose(source);this.close();
    })));
  }
}
export class PDFModal extends Modal {
  constructor(app:App,private choose:(kind:'vault'|'local',path:string)=>Promise<void>){super(app);}
  onOpen():void{
    this.titleEl.setText('关联 PDF');let value='';
    new Setting(this.contentEl).setName('文件路径').setDesc('库内相对路径，或本机 PDF 的完整路径。文件不会被复制或修改。').addText(t=>t.setPlaceholder('附件/paper.pdf').onChange(v=>value=v.trim()));
    const input=this.contentEl.createEl('input',{type:'file',attr:{accept:'.pdf,application/pdf','aria-label':'选择 PDF'}});
    input.addEventListener('change',()=>run(async()=>{const file=input.files?.[0];if(!file)return;const electron=await import('electron');const path=electron.webUtils?.getPathForFile(file)||(file as File&{path?:string}).path;if(!path)throw new Error('无法获取路径，请填写 PDF 完整路径。');await this.choose('local',path);this.close();}));
    new Setting(this.contentEl).addButton(b=>b.setButtonText('关联 PDF').setCta().onClick(()=>run(async()=>{if(!/\.pdf$/i.test(value))throw new Error('请选择 PDF 文件。');await this.choose(/^(?:[A-Za-z]:[\\/]|\/|\\\\)/.test(value)?'local':'vault',value);this.close();})));
    const files=this.app.vault.getFiles().filter(f=>f.extension.toLowerCase()==='pdf');
    if(files.length){this.contentEl.createEl('p',{cls:'zs-muted',text:'或选择库内 PDF'});const list=this.contentEl.createDiv('zs-vault-pdfs');for(const file of files){list.createEl('button',{cls:'zs-search-result',text:file.path}).onclick=()=>run(async()=>{await this.choose('vault',file.path);this.close();});}}
  }
}
export class ZotSightSettings extends PluginSettingTab {
  constructor(app:App,private plugin:ZotSightPlugin){super(app,plugin);}
  display():void{
    const el=this.containerEl;el.empty();el.createEl('h2',{text:'ZotSight'});
    new Setting(el).setName('Zotero 本地 API').setDesc('在 Zotero 设置 → 高级中允许其他应用通信。无需 API Key。').addText(t=>t.setValue(this.plugin.settings.apiBase).onChange(v=>{this.plugin.settings.apiBase=v.trim();void this.plugin.saveSettings();}));
    new Setting(el).setName('连接测试').addButton(b=>b.setButtonText('测试连接').onClick(()=>run(async()=>{await this.plugin.client.search('',0);new Notice('已连接 Zotero。');})));
    new Setting(el).setName('默认文献库').addDropdown(d=>d.addOption('user','个人库').addOption('group','群组库').setValue(this.plugin.settings.libraryType).onChange(v=>{this.plugin.settings.libraryType=v as 'user'|'group';void this.plugin.saveSettings();}));
    new Setting(el).setName('Library ID').setDesc('个人本机库使用 0，群组库填写数字 ID。').addText(t=>t.setValue(this.plugin.settings.libraryId).onChange(v=>{this.plugin.settings.libraryId=v.trim();void this.plugin.saveSettings();}));
    new Setting(el).setName('新文献文件夹').addText(t=>t.setValue(this.plugin.settings.folder).onChange(v=>{this.plugin.settings.folder=v.trim();void this.plugin.saveSettings();}));
    el.createEl('p',{cls:'zs-muted',text:'批注与笔记保存在 .zsseed 中；Zotero 仅作为只读数据源。ZSIndex 和 ZSTranslate 可通过扩展 API 接入。'});
  }
}
