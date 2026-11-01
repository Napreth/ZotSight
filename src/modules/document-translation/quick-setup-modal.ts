import {Modal,setIcon} from 'obsidian';
import type {DocumentTranslation} from './module';
import {browse} from './browse-program';
import {message} from './types';
import type {QuickTexChoice} from './quick-setup';

export class QuickSetupModal extends Modal {
  private unsubscribe?:()=>void;private closed=false;
  constructor(private module:DocumentTranslation){super(module.app);}
  onOpen():void{
    this.modalEl.addClass('zs-quick-setup-modal');this.setTitle('一键安装');
    const root=this.contentEl;root.createDiv({cls:'zs-quick-location',text:'安装位置：'+this.module.backend.dependencies.root});
    const form=root.createEl('fieldset',{cls:'zs-quick-plan'});form.createEl('legend',{text:'LaTeX'});
    const choices=form.createDiv({cls:'zs-quick-choices zst-choices',attr:{role:'radiogroup','aria-label':'LaTeX 安装方式'}});
    let selected:QuickTexChoice|undefined=this.module.quickSetupOptions?.tex,path=this.module.quickSetupOptions?.texPath||'',touched=!!path,detected=false;
    const buttons=new Map<QuickTexChoice,HTMLButtonElement>(),systemHint:HTMLElement[]=[];
    const select=(value:QuickTexChoice)=>{selected=value;refresh();};
    for(const [id,title,subtitle,icon] of [['existing','使用系统中的 LaTeX','正在检测…','monitor'],['portable-full','下载完整版','体积很大','download'],['portable-basic','下载精简版','需要联网使用','cloud-download']] as const){
      const button=choices.createEl('button',{cls:'zst-choice',attr:{type:'button',role:'radio','aria-label':title}});setIcon(button.createSpan('zst-choice-icon'),icon);button.createSpan({cls:'zst-choice-title',text:title});const hint=button.createSpan({cls:'zst-choice-subtitle',text:subtitle});if(id==='existing')systemHint.push(hint);buttons.set(id,button);button.onclick=()=>select(id);
      button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const ids=[...buttons.keys()],index=ids.indexOf(id),next=event.key==='Home'?0:event.key==='End'?2:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+3)%3;select(ids[next]);buttons.get(ids[next])!.focus();};
    }
    const manual=form.createDiv('zs-quick-system');manual.createEl('label',{text:'LaTeX 程序路径'});const row=manual.createDiv('zs-dependency-picker-row'),input=row.createEl('input',{type:'text',value:path,attr:{placeholder:'xelatex.exe 或 pdflatex.exe 的完整路径','aria-label':'系统 LaTeX 程序路径'}}),browseButton=row.createEl('button',{text:'浏览',attr:{type:'button'}});input.oninput=()=>{path=input.value;touched=true;refresh();};browseButton.onclick=()=>void browse(root,value=>{path=value;touched=true;input.value=value;refresh();},'tex');
    const result=root.createDiv({cls:'zs-quick-result',attr:{role:'status'}}),status=result.createDiv('zs-quick-status'),progress=result.createEl('progress'),detail=result.createDiv('zs-quick-message');
    const logs=root.createEl('details',{cls:'zs-quick-log'});logs.createEl('summary',{text:'安装日志'});const log=logs.createEl('pre');
    const actions=root.createDiv('zs-quick-actions'),secondary=actions.createEl('button',{text:'取消',attr:{type:'button'}}),primary=actions.createEl('button',{text:'开始安装',cls:'mod-cta',attr:{type:'button'}});
    const refresh=()=>{
      const state=this.module.quickSetupState,busy=this.module.installing,active=state?.phase==='installing';form.disabled=busy;form.hidden=!!active||state?.phase==='complete';
      for(const [id,button] of buttons){button.setAttribute('aria-checked',String(selected===id));button.toggleClass('is-active',selected===id);button.tabIndex=selected?selected===id?0:-1:id==='existing'?0:-1;}
      manual.hidden=selected!=='existing';result.hidden=!state;progress.hidden=!active;progress.max=state?.total||6;progress.value=Math.max(0,(state?.step||1)-1);
      status.setText(!state?'':state.phase==='complete'?'安装完成':state.phase==='cancelled'?'安装已取消':state.phase==='error'?`${state.label} · 安装未完成`:`${state.label} · ${state.step}/${state.total}`);
      detail.hidden=state?.phase!=='error'||!state.message;detail.toggleClass('is-error',state?.phase==='error');detail.setText(state?.phase==='error'?state.message:'');const text=state?.kind?this.module.backend.dependencies.logs(state.kind):'';logs.hidden=!text;log.setText(text);
      primary.setText(active?'正在安装…':state?.phase==='complete'?'完成':state?.phase==='error'||state?.phase==='cancelled'?'重试安装':'开始安装');primary.disabled=busy||this.module.busyTranslating||(!selected||selected==='existing'&&!path.trim())&&state?.phase!=='complete';secondary.setText(active?'取消安装':state?.phase==='complete'?'重新配置':'取消');
    };
    secondary.onclick=()=>{if(this.module.quickSetupState?.phase==='installing'){this.module.cancelSetup();return;}if(this.module.quickSetupState?.phase==='complete'){this.module.quickSetupState=undefined;this.module.changed();return;}this.close();};
    primary.onclick=()=>{if(this.module.quickSetupState?.phase==='complete'){this.close();return;}if(!selected)return;void this.module.installAll({tex:selected,texPath:path,language:this.module.settings.targetLanguage}).catch(error=>{if(!this.closed&&!this.module.quickSetupState){result.hidden=false;status.setText('无法开始安装');detail.hidden=false;detail.addClass('is-error');detail.setText(message(error));}});};
    this.unsubscribe=this.module.subscribe(refresh);refresh();
    void this.module.backend.dependencies.systemTex().then(value=>{if(this.closed)return;detected=!!value;systemHint[0].setText(detected?'已检测到':'未检测到');if(!touched&&value){path=value;input.value=value;}refresh();}).catch(()=>{if(!this.closed){systemHint[0].setText('未检测到');refresh();}});
  }
  onClose():void{this.closed=true;this.unsubscribe?.();}
}
