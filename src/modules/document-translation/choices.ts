import type {Job} from './types';
export const translationChoices=[
  {id:'reading',title:'翻译阅读模式',subtitle:'在阅读模式中显示译文',icon:'book-open'},
  {id:'arxiv',title:'使用 LaTeX 源文件翻译',subtitle:'翻译为 PDF',icon:'file-code-2'},
  {id:'babeldoc',title:'使用 BabelDOC 翻译',subtitle:'翻译为 PDF',icon:'panels-top-left'},
  {id:'pdfmath',title:'使用 PDFMathTranslate 翻译',subtitle:'翻译为 PDF',icon:'scan-text'},
] as const;
export type TranslationChoice=typeof translationChoices[number]['id'];
export interface SourceInfo {attachmentId:string;sourceHash?:string;arxivId?:string;hasLatex:boolean;scanned?:boolean;phase:'checking'|'downloading'|'ready'|'error';message:string;prefix?:string;archive?:string}
export function recommendedChoices(info?:SourceInfo):TranslationChoice[]{const result:TranslationChoice[]=['reading'];if(info?.hasLatex)result.push('arxiv');if(info?.scanned)result.push('pdfmath');else if(info?.scanned===false&&!info.hasLatex)result.push('babeldoc');return result;}
export function jobRouteLabel(job:Pick<Job,'route'|'layoutEngine'|'resolvedRoute'>):string{const route=job.route==='pdf'?(job.resolvedRoute==='arxiv'?'arxiv':job.layoutEngine==='pdfmath'?'pdfmath':'babeldoc'):job.route==='layout'?(job.layoutEngine==='pdfmath'?'pdfmath':'babeldoc'):job.route;return ({reading:'阅读模式',arxiv:'LaTeX',babeldoc:'BabelDOC',pdfmath:'PDFMathTranslate',template:'实验任务（已移出）'})[route]||'PDF';}
export function jobProgress(job:Pick<Job,'state'|'phase'|'done'|'total'>):{label:string;value?:number;detail:string}{const label:Record<string,string>={queued:'等待开始',preparing:'读取文档',source:'准备 LaTeX 源文件',translating:'翻译正文',compiling:'编译 PDF',layout:'翻译并生成 PDF',publishing:'保存结果',cancelling:'正在取消',complete:'翻译完成'};return {label:label[job.phase]||'读取文档',value:job.phase==='translating'&&job.total>0?Math.min(1,job.done/job.total):undefined,detail:job.phase==='translating'&&job.total>0?`${job.done} / ${job.total} 段`:job.phase==='layout'&&job.done>0?`已处理 ${job.done} 段`:''};}
