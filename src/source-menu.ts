import { setIcon } from 'obsidian';
import { fitFilename } from './filename';

export interface SourceOption {id:string;title:string;icon:string}
export class SourceMenu {
  private trigger:HTMLButtonElement;private label:HTMLElement;private icon:HTMLElement;
  private list:HTMLElement;private options:SourceOption[]=[];private selected='__info';private active=0;
  private outside:(e:PointerEvent)=>void;private id=`zs-source-${crypto.randomUUID()}`;
  private observer:ResizeObserver;private context:CanvasRenderingContext2D|null;
  constructor(private root:HTMLElement,private onChange:(id:string)=>void){
    this.trigger=root.createEl('button',{cls:'zs-source-trigger',attr:{'aria-label':'文献信息和附件','aria-haspopup':'listbox','aria-expanded':'false','aria-controls':this.id}});
    this.icon=this.trigger.createSpan('zs-source-icon');this.label=this.trigger.createSpan('zs-source-label');setIcon(this.trigger.createSpan('zs-source-chevron'),'chevron-down');
    this.list=root.createDiv({cls:'zs-source-menu',attr:{id:this.id,role:'listbox','aria-label':'文献信息和附件'}});this.list.hidden=true;
    this.trigger.onclick=()=>this.toggle();
    this.trigger.onkeydown=e=>{if(['ArrowDown','ArrowUp','Home','End','Escape'].includes(e.key)){e.preventDefault();this.key(e.key);}};
    this.list.onkeydown=e=>{if(['ArrowDown','ArrowUp','Home','End','Escape','Enter',' '].includes(e.key)){e.preventDefault();this.key(e.key);}};
    this.outside=e=>{if(!root.contains(e.target as Node))this.close(false);};root.doc.addEventListener('pointerdown',this.outside);
    this.context=root.doc.createElement('canvas').getContext('2d');this.observer=new ResizeObserver(()=>this.fitLabels());this.observer.observe(this.trigger);this.observer.observe(this.list);
  }
  get value():string{return this.selected;}
  set value(id:string){this.selected=id;const item=this.options.find(o=>o.id===id);this.label.dataset.fullTitle=item?.title||'信息';this.label.setText(this.label.dataset.fullTitle);this.trigger.title=item?.title||'信息';setIcon(this.icon,item?.icon||'file-text');this.list.querySelectorAll<HTMLElement>('[role=option]').forEach(el=>{const selected=el.dataset.value===id;el.setAttribute('aria-selected',String(selected));el.toggleClass('is-selected',selected);});this.fitLabels();}
  update(options:SourceOption[],value:string):void{this.options=options;this.list.empty();for(const [i,o] of options.entries()){if(o.id==='__add')this.list.createDiv('zs-source-menu-divider');const b=this.list.createEl('button',{cls:'zs-source-option',attr:{role:'option',tabindex:'-1','data-value':o.id,title:o.title}});setIcon(b.createSpan('zs-source-icon'),o.icon);b.createSpan({cls:'zs-source-label',text:o.title,attr:{'data-full-title':o.title}});setIcon(b.createSpan('zs-source-check'),'check');b.onclick=()=>{this.close();this.onChange(o.id);};b.onpointermove=()=>{this.active=i;};}this.value=value;}
  private toggle():void{if(!this.list.hidden){this.close();return;}this.open();}
  private open():void{this.list.hidden=false;this.fitLabels();this.trigger.setAttribute('aria-expanded','true');this.active=Math.max(0,this.options.findIndex(o=>o.id===this.selected));this.focus();}
  private close(focus=true):void{const open=!this.list.hidden;this.list.hidden=true;this.trigger.setAttribute('aria-expanded','false');if(open&&focus)this.trigger.focus();}
  private focus():void{this.list.querySelectorAll<HTMLElement>('[role=option]')[this.active]?.focus();}
  private key(key:string):void{if(key==='Escape'){this.close();return;}if(this.list.hidden){this.open();return;}if(key==='Enter'||key===' '){const o=this.options[this.active];this.close();if(o)this.onChange(o.id);return;}if(key==='Home')this.active=0;else if(key==='End')this.active=this.options.length-1;else this.active=(this.active+(key==='ArrowUp'?-1:1)+this.options.length)%this.options.length;this.focus();}
  private fitLabels():void{const ctx=this.context;if(!ctx)return;for(const label of this.root.querySelectorAll<HTMLElement>('.zs-source-label')){const width=label.clientWidth;if(!width)continue;const style=this.root.win.getComputedStyle(label);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const text=fitFilename(label.dataset.fullTitle||'',width,s=>ctx.measureText(s).width);if(label.textContent!==text)label.setText(text);}}
  destroy():void{this.observer.disconnect();this.root.doc.removeEventListener('pointerdown',this.outside);}
}
