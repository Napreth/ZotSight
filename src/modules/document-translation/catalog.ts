import {presets} from './providers';
import {defaults,type Profile,type Settings,type Job} from './types';
import type {SelectOption} from '../../grouped-select';

export const groups=['翻译 API','AI 厂商与平台','自定义'] as const;
export const languages:Record<string,string>={auto:'自动检测',en:'English','zh-CN':'简体中文','zh-TW':'繁體中文',ja:'日本語',ko:'한국어',de:'Deutsch',fr:'Français',es:'Español',ru:'Русский',pt:'Português'};
export const builtinProfiles=()=>presets.filter(p=>p.protocol.endsWith('-web')).map(p=>({...defaults.profiles[0],...p,id:'web:'+p.id,presetId:p.id,builtin:true}));
export function providerGroup(id:string):string{return ['libre','openai','ollama'].includes(id)?groups[2]:['deepl','google-cloud','azure','baidu','tencent','youdao'].includes(id)?groups[0]:groups[1];}
export function providerOptions():SelectOption[]{return groups.flatMap(group=>presets.filter(p=>!p.protocol.endsWith('-web')&&providerGroup(p.id)===group).map(p=>({value:p.id,label:p.name,group})));}
export function presetFor(profile:Profile){return presets.find(p=>p.id===profile.presetId)||presets.find(p=>p.protocol===profile.protocol&&p.endpoint===profile.endpoint)||presets.find(p=>p.protocol===profile.protocol);}
export function profileOptions(settings:Settings):SelectOption[]{return groups.flatMap(group=>settings.profiles.filter(p=>(p.builtin?groups[0]:providerGroup(presetFor(p)?.id||'openai'))===group).map(p=>({value:p.id,label:p.name,group})));}
export function normalizeProfiles(settings:Settings,jobs:Job[]):void{
  const ids=new Map<string,string>();const custom:Profile[]=[];
  for(const profile of settings.profiles){if(profile.protocol.endsWith('-web')){ids.set(profile.id,'web:'+profile.protocol);continue;}if(profile.name==='通义千问 / DashScope')profile.name='阿里云百炼';if(profile.presetId==='qwen')profile.presetId='bailian';custom.push({...profile,builtin:false,presetId:presetFor(profile)?.id||'openai'});}
  settings.profiles=[...builtinProfiles(),...new Map(custom.map(p=>[p.id,p])).values()];settings.profileId=ids.get(settings.profileId)||settings.profileId;if(!settings.profiles.some(p=>p.id===settings.profileId))settings.profileId=settings.profiles[0].id;
  for(const job of jobs)job.profileId=ids.get(job.profileId)||job.profileId;
}
