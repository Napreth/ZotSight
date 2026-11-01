import {Notice,setIcon} from 'obsidian';
import type {DocumentTranslation} from './module';
import {message,type Job} from './types';
import {languages} from './catalog';
import {jobProgress,jobRouteLabel} from './choices';

export class TranslationTasks {
  private list:HTMLElement;private empty:HTMLElement;private cards=new Map<string,TaskRow>();
  constructor(root:HTMLElement,private module:DocumentTranslation){
    root.addClass('zst-task-browser');
    this.empty=root.createDiv({cls:'zst-task-empty',text:'还没有翻译记录。'});this.list=root.createDiv({cls:'zst-task-list',attr:{role:'list','aria-label':'翻译任务'}});
  }
  update():void{const jobs=this.module.jobs.filter(j=>!j.hidden).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    this.empty.hidden=jobs.length>0;const visible=new Set(jobs.map(j=>j.id));for(const [id,row] of this.cards)if(!visible.has(id)){row.element.remove();this.cards.delete(id);}
    for(let index=0;index<jobs.length;index++){const job=jobs[index];let row=this.cards.get(job.id);if(!row){row=new TaskRow(this.module,job);this.cards.set(job.id,row);}row.update(job);if(this.list.children[index]!==row.element)this.list.insertBefore(row.element,this.list.children[index]||null);}

  }
}
class TaskRow {
  readonly element:HTMLElement;private title:HTMLButtonElement;private state:HTMLElement;private meta:HTMLElement;private phase:HTMLElement;private count:HTMLElement;private progress:HTMLProgressElement;private error:HTMLElement;private detail:HTMLElement;private actions:HTMLElement;private results:HTMLElement;private signature='';
  constructor(private module:DocumentTranslation,private job:Job){
    this.element=createDiv({cls:'zst-task-row',attr:{'data-job':job.id,role:'listitem'}});const icon=this.element.createSpan('zst-task-file-icon');setIcon(icon,job.route==='reading'?'book-open':'file-type-2');const body=this.element.createDiv('zst-task-body'),head=body.createDiv('zst-task-head');this.title=head.createEl('button',{cls:'zst-task-name',attr:{type:'button'}});this.title.onclick=()=>void this.openPrimary();this.state=head.createSpan('zst-task-status');
    this.meta=body.createDiv('zst-task-meta');const phase=body.createDiv('zst-task-phase');this.phase=phase.createSpan();this.count=phase.createSpan();this.progress=body.createEl('progress');this.progress.max=1;this.error=body.createDiv('zst-task-error');this.results=body.createDiv('zst-task-results');this.actions=this.element.createDiv('zst-task-row-actions');const details=body.createEl('details',{cls:'zst-task-details'});details.createEl('summary',{text:'查看详情'});this.detail=details.createEl('pre');
  }
  update(job:Job):void{this.job=job;const busy=['running','queued'].includes(job.state),p=jobProgress(job);this.element.dataset.state=job.state;const name=`${job.title} · ${languages[job.targetLanguage]||job.targetLanguage}${job.route==='reading'?'':'.pdf'}`;this.title.setText(name);this.title.title=name;this.title.disabled=job.state!=='complete';this.state.hidden=busy;this.state.setText(({queued:'等待中',running:'翻译中',complete:'已完成',cancelled:'已取消',error:'未完成'})[job.state]);this.meta.setText([jobRouteLabel(job),`${languages[job.sourceLanguage]||job.sourceLanguage} → ${languages[job.targetLanguage]||job.targetLanguage}`,this.module.serviceName(job)].filter(Boolean).join(' · '));this.meta.title=job.path;
    this.phase.parentElement!.hidden=!busy;this.phase.setText(p.label);this.count.setText(p.detail);this.progress.hidden=!busy||job.state==='queued';if(p.value===undefined)this.progress.removeAttribute('value');else this.progress.value=p.value;
    this.error.hidden=job.state!=='error';this.error.setText((job.error||job.message).split('\n')[0].slice(0,180));if(job.state==='error'&&job.dependency==='python'){this.error.appendText(' ');const link=this.error.createEl('a',{text:'前往 Python 依赖页面',href:'#'});link.onclick=event=>{event.preventDefault();void this.module.openPythonDependencies(job.path).catch(e=>new Notice(message(e)));};}this.detail.setText(job.error||job.message);this.detail.parentElement!.hidden=job.state!=='error';
    const signature=JSON.stringify([job.state,job.phase==='cancelling',job.outputs]);if(signature===this.signature)return;this.signature=signature;this.actions.empty();this.results.empty();
    if(busy){this.action('取消翻译','x',()=>this.module.cancel(job)).disabled=job.phase==='cancelling';return;}
    if(['error','cancelled'].includes(job.state)&&job.route!=='template')this.action('继续翻译','play',()=>void this.module.resume(job).catch(e=>this.module.reportError(e,job.path)));
    if(job.state==='complete'){for(const output of job.outputs.filter(o=>o.kind==='pdf'&&/双语|dual|bilingual/i.test(o.title)))this.result('双语对照',()=>void this.open(output));for(const output of job.outputs.filter(o=>o.kind==='tex'))this.result('导出 LaTeX 源码',()=>void this.open(output));}
    this.action(job.state==='complete'?'定位译文':'定位原文','arrow-up-right',()=>void this.module.reveal(job).catch(e=>new Notice(message(e))));this.action('移除记录','x',()=>this.module.hideJob(job));
  }
  private action(label:string,icon:string,run:()=>void):HTMLButtonElement{const b=this.actions.createEl('button',{cls:'zs-icon-button',attr:{type:'button','aria-label':label,title:label}});setIcon(b,icon);b.onclick=run;return b;}
  private result(label:string,run:()=>void):void{this.results.createEl('button',{text:label,attr:{type:'button'}}).onclick=run;}
  private async openPrimary():Promise<void>{try{if(this.job.route==='reading')await this.module.show(this.job);else{const pdfs=this.job.outputs.filter(o=>o.kind==='pdf'),main=pdfs.find(o=>!/双语|dual|bilingual/i.test(o.title))||pdfs[0];if(!main)throw Error('未找到译文 PDF。');await this.open(main);}}catch(e){new Notice(message(e));}}
  private async open(output:Job['outputs'][number]):Promise<void>{try{if(output.kind==='pdf'){const seed=await this.module.host.readSeed(this.job.path),attachment=seed.attachments.find(a=>a.path===output.path);if(!attachment)throw Error('未找到译文 PDF。');await this.module.host.api.showDocumentVersion(this.job.path,'pdf:'+attachment.id);}else{const bytes=await this.module.host.api.readPackageFile(this.job.path,output.path);if(!bytes)throw Error('未找到 LaTeX 源文件。');const url=URL.createObjectURL(new Blob([Uint8Array.from(bytes)],{type:'application/zip'})),a=this.element.doc.createElement('a');a.href=url;a.download=output.title;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}}catch(e){new Notice(message(e));}}
}
