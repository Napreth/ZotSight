import {Modal,Notice,Setting,type App} from 'obsidian';
import {GroupedSelect} from '../../grouped-select';
import type {DocumentTranslation} from './module';
import {presets,llmProtocols} from './providers';
import {defaults,message,type Profile} from './types';
import {providerOptions,profileOptions,presetFor,languages} from './catalog';

function profileFields(root:HTMLElement,profile:Profile,secret:{key:string;secret:string},changed:()=>void):void{
  const text=(name:string,value:string,change:(v:string)=>void,password=false)=>new Setting(root).setName(name).addText(input=>{input.setValue(value);if(password)input.inputEl.type='password';input.onChange(v=>{change(v);changed();});});
  text('显示名称',profile.name,v=>profile.name=v);text('服务地址',profile.endpoint,v=>profile.endpoint=v.trim());
  if(llmProtocols.has(profile.protocol))text('模型 ID',profile.model,v=>profile.model=v.trim());
  text(profile.protocol==='tencent'?'Secret ID':'API Key',secret.key,v=>secret.key=v,true);
  if(['tencent','baidu','youdao'].includes(profile.protocol)){if(profile.protocol==='tencent')text('Secret Key',secret.secret,v=>secret.secret=v,true);else text('应用 ID',profile.appId,v=>profile.appId=v.trim());}
  if(['azure','tencent'].includes(profile.protocol))text('区域',profile.region,v=>profile.region=v.trim());
  if(profile.protocol==='anthropic')text('Anthropic API 版本',profile.apiVersion,v=>profile.apiVersion=v.trim());
}

export class AddServiceModal extends Modal {
  private select?:GroupedSelect;
  constructor(private module:DocumentTranslation,private done?:(profile:Profile)=>void){super(module.app);}
  onOpen():void{
    this.titleEl.setText('添加翻译服务');const profile:Profile={...defaults.profiles[0],id:crypto.randomUUID(),presetId:'deepl',builtin:false};const secret={key:'',secret:''};
    const choice=this.contentEl.createDiv('zs-service-provider'),fields=this.contentEl.createDiv('zs-service-fields');choice.createEl('label',{text:'服务平台'});
    const apply=(id:string)=>{secret.key='';secret.secret='';const preset=presets.find(p=>p.id===id)!;Object.assign(profile,{...preset,id:profile.id,presetId:id,model:preset.model||'',builtin:false});fields.empty();profileFields(fields,profile,secret,()=>{});};
    this.select=new GroupedSelect(choice,'服务平台',apply,this.module.app);this.select.setOptions(providerOptions(),'deepl');apply('deepl');
    const error=this.contentEl.createDiv({cls:'zs-service-error',attr:{role:'alert'}});
    new Setting(this.contentEl).addButton(b=>b.setButtonText('取消').onClick(()=>this.close())).addButton(b=>b.setButtonText('添加服务').setCta().onClick(()=>{try{const url=new URL(profile.endpoint);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('请输入有效的 API 根地址。');if(!profile.name.trim())throw Error('请输入显示名称。');if(llmProtocols.has(profile.protocol)&&!profile.model.trim())throw Error('请输入模型 ID。');this.module.settings.profiles.push(profile);this.module.settings.profileId=profile.id;this.module.setSecret(profile.id,'key',secret.key);this.module.setSecret(profile.id,'secret',secret.secret);this.module.changed();this.done?.(profile);this.close();}catch(e){error.setText(message(e));}}));
  }
  onClose():void{this.select?.destroy();this.contentEl.empty();}
}

export function languageFields(root:HTMLElement,source:string,target:string,change:(source:string,target:string)=>void,app:App):{source:GroupedSelect;target:GroupedSelect;destroy:()=>void}{
  const row=root.createDiv('zs-language-row'),from=row.createEl('label',{text:'源语言'}).createDiv(),to=row.createEl('label',{text:'目标语言'}).createDiv();
  const sourceSelect=new GroupedSelect(from,'源语言',()=>change(sourceSelect.value,targetSelect.value),app),targetSelect=new GroupedSelect(to,'目标语言',()=>change(sourceSelect.value,targetSelect.value),app);
  sourceSelect.setOptions(Object.entries(languages).map(([value,label])=>({value,label})),source);targetSelect.setOptions(Object.entries(languages).filter(([code])=>code!=='auto').map(([value,label])=>({value,label})),target);return {source:sourceSelect,target:targetSelect,destroy:()=>{sourceSelect.destroy();targetSelect.destroy();}};
}

export function renderTranslationSettings(root:HTMLElement,module:DocumentTranslation):()=>void{
  root.createEl('h3',{text:'文档翻译'});const selects:GroupedSelect[]=[];const choose=root.createDiv('zs-service-provider');choose.createEl('label',{text:'翻译服务'});const fields=root.createDiv('zs-service-fields');
  const profileSelect=new GroupedSelect(choose,'翻译服务',value=>{module.settings.profileId=value;module.changed();renderProfile();},module.app);selects.push(profileSelect);
  profileSelect.setActions([{label:'添加翻译服务',icon:'plus',run:()=>new AddServiceModal(module,()=>{refresh();renderProfile();}).open()}]);let typeSelect:GroupedSelect|undefined;
  const renderProfile=()=>{typeSelect?.destroy();typeSelect=undefined;fields.empty();const profile=module.settings.profiles.find(p=>p.id===module.settings.profileId)||module.settings.profiles[0];if(profile.builtin){fields.createEl('p',{cls:'setting-item-description',text:'内置网页翻译服务，无需密钥，始终保留。'});new Setting(fields).setName('测试连接').addButton(b=>b.setButtonText('测试翻译').onClick(()=>void module.testProvider(profile).then(t=>new Notice(t,8000)).catch(e=>new Notice(message(e)))));return;}
    const provider=fields.createDiv('zs-service-provider');provider.createEl('label',{text:'服务平台'});typeSelect=new GroupedSelect(provider,'服务平台',id=>{const p=presets.find(p=>p.id===id)!;module.setSecret(profile.id,'key','');module.setSecret(profile.id,'secret','');Object.assign(profile,{presetId:id,name:p.name,protocol:p.protocol,endpoint:p.endpoint,model:p.model||''});module.changed();renderProfile();},module.app);typeSelect.setOptions(providerOptions(),presetFor(profile)?.id||'openai');
    const secret=module.secrets(profile.id);profileFields(fields,profile,secret,()=>{module.setSecret(profile.id,'key',secret.key);module.setSecret(profile.id,'secret',secret.secret);module.changed();});
    new Setting(fields).setName('服务操作').addButton(b=>b.setButtonText('测试翻译').onClick(()=>void module.testProvider(profile).then(t=>new Notice(t,8000)).catch(e=>new Notice(message(e))))).addButton(b=>b.setButtonText('删除服务').onClick(()=>{module.removeProfile(profile);refresh();renderProfile();}));
  };
  const refresh=()=>profileSelect.setOptions(profileOptions(module.settings),module.settings.profileId);refresh();renderProfile();
  const language=languageFields(root,module.settings.sourceLanguage,module.settings.targetLanguage,(source,target)=>{module.settings.sourceLanguage=source;module.settings.targetLanguage=target;module.changed();},module.app);
  new Setting(root).setName('有译文时，将阅读模式按钮改为文档切换菜单').addToggle(t=>t.setValue(module.settings.replaceReadingButton).onChange(value=>{module.settings.replaceReadingButton=value;module.changed();}));
  new Setting(root).setName('自动尝试从 arXiv 下载 LaTeX 源文件').addToggle(t=>t.setValue(module.settings.autoDownloadLatex).onChange(value=>module.setAutoDownload(value)));
  for(const [key,name,min,max] of [['concurrency','并发请求数',1,8],['interval','请求间隔（毫秒）',0,10000],['timeout','请求超时（毫秒）',5000,600000],['retries','重试次数',0,5]] as const)new Setting(root).setName(name).addText(t=>t.setValue(String(module.settings[key])).onChange(value=>{module.settings[key]=Math.max(min,Math.min(max,Number(value)||min));module.changed();}));
  new Setting(root).setName('术语表').setDesc('每行一组“原词=译词”。').addTextArea(t=>t.setValue(module.settings.glossary).onChange(v=>{module.settings.glossary=v;module.changed();}));new Setting(root).setName('AI 翻译偏好').addTextArea(t=>t.setValue(module.settings.prompt).onChange(v=>{module.settings.prompt=v;module.changed();}));
  root.createEl('h4',{text:'本地排版环境'});root.createEl('p',{cls:'setting-item-description',text:'阅读模式翻译无需 Python。LaTeX、BabelDOC 和 PDFMathTranslate 按所选方式生成 PDF；扫描件推荐 PDFMathTranslate。'});const status=root.createDiv('zst-environment-status');
  new Setting(root).setName('依赖检查与安装').addButton(b=>b.setButtonText('检查环境').onClick(()=>void module.backend.check(new AbortController().signal).then(r=>status.setText(JSON.stringify(r,null,2))).catch(e=>status.setText(message(e))))).addButton(b=>b.setButtonText('安装 Python 依赖').onClick(()=>void module.setup().catch(e=>status.setText(message(e))))).addButton(b=>b.setButtonText('取消安装').onClick(()=>module.cancelSetup()));
  for(const [key,name] of [['uv','uv 可执行文件'],['basePython','提取环境 Python'],['babelPython','BabelDOC 环境 Python'],['pdfmathPython','PDFMathTranslate 环境 Python'],['xelatex','XeLaTeX'],['pdflatex','pdfLaTeX'],['latexml','LaTeXML（可选）']] as const)new Setting(root).setName(name).addText(t=>t.setValue(module.settings.runtime[key]).onChange(value=>{module.settings.runtime[key]=value.trim();module.changed();}));
  const unsubscribe=module.subscribe(()=>{refresh();status.setText(module.installationMessage);});return()=>{unsubscribe();typeSelect?.destroy();language.destroy();for(const s of selects)s.destroy();};
}
