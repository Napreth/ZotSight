import type {ZotSightAPI,LiteratureContext,ReadingDocument,ReadingTranslation} from '../../api';
export type {ZotSightAPI,LiteratureContext,ReadingDocument,ReadingTranslation};
export type Route='reading'|'pdf'|'arxiv'|'layout'|'babeldoc'|'pdfmath';
export type Protocol='google-web'|'edge-web'|'tencent-web'|'google-cloud'|'deepl'|'azure'|'baidu'|'tencent'|'youdao'|'libre'|'openai'|'responses'|'anthropic'|'gemini'|'ollama';
export interface Profile {id:string;name:string;protocol:Protocol;endpoint:string;model:string;appId:string;region:string;maxChars:number;maxTokens:number;apiVersion:string;presetId?:string;builtin?:boolean}
export interface RuntimeSettings {uv:string;basePython:string;babelPython:string;pdfmathPython:string;xelatex:string;pdflatex:string;latexml:string}
export interface Settings {profiles:Profile[];profileId:string;sourceLanguage:string;targetLanguage:string;outputFolder:string;concurrency:number;interval:number;timeout:number;retries:number;glossary:string;prompt:string;runtime:RuntimeSettings;layoutEngine:'auto'|'babeldoc'|'pdfmath';arxivId:string;replaceReadingButton:boolean;autoDownloadLatex:boolean}
export interface Job {id:string;path:string;title:string;attachmentId:string;route:Route|'template';resolvedRoute?:'arxiv'|'layout';fallbackReasons?:string[];sourceLanguage:string;targetLanguage:string;profileId:string;layoutEngine:'auto'|'babeldoc'|'pdfmath';arxivId:string;latexMain?:string;state:'queued'|'running'|'complete'|'cancelled'|'error';phase:string;done:number;total:number;message:string;error?:string;sourceHash?:string;createdAt:string;updatedAt:string;hidden?:boolean;outputs:{path:string;title:string;kind:'pdf'|'tex'|'translation'}[]}
export interface TranslationUnit {id:string;text:string;ref?:string;protected:{token:string;text:string;sourceIndex?:number}[];page?:number;preserveOrder?:boolean}
export interface EngineContext {source:string;target:string;title:string;glossary:string;prompt:string}
export interface Secrets {key:string;secret:string}
export interface HttpRequest {url:string;method:'GET'|'POST';headers?:Record<string,string>;body?:string;signal?:AbortSignal}
export interface HttpResponse {status:number;headers:Record<string,string>;text:string;json:any}
export type Transport=(request:HttpRequest)=>Promise<HttpResponse>;
export const ROUTES:Record<Route,string>={pdf:'PDF',reading:'阅读模式译文',arxiv:'LaTeX 源文件翻译',babeldoc:'BabelDOC',pdfmath:'PDFMathTranslate',layout:'保留原 PDF 排版'};
export const availableRoutes:Route[]=['reading','arxiv','babeldoc','pdfmath'];
export const defaults:Settings={profiles:[{id:'default',name:'Google 网页翻译',protocol:'google-web',endpoint:'https://translate.googleapis.com',model:'',appId:'',region:'',maxChars:3000,maxTokens:8192,apiVersion:'2023-06-01'}],profileId:'default',sourceLanguage:'auto',targetLanguage:'zh-CN',outputFolder:'ZSTranslate',concurrency:2,interval:500,timeout:90000,retries:2,glossary:'',prompt:'',layoutEngine:'auto',arxivId:'',replaceReadingButton:false,autoDownloadLatex:true,runtime:{uv:'uv',basePython:'',babelPython:'',pdfmathPython:'',xelatex:'xelatex',pdflatex:'pdflatex',latexml:''}};
export function checkAbort(signal:AbortSignal):void{if(signal.aborted)throw new DOMException('已取消翻译','AbortError');}
export function message(error:unknown):string{return error instanceof Error?error.message:String(error);}

// Keep retired task metadata readable without exposing an execution route.
export function storedRoute(value:unknown):value is Job['route']{return value==='template'||typeof value==='string'&&Object.hasOwn(ROUTES,value);}
