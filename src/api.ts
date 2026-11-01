import type { Seed, Attachment } from './model';
export type {Seed,Attachment} from './model';
import type {ReadingDocument,ReadingTranslation} from './reading-api';
export type {ReadingDocument,ReadingTranslation,ReadingTranslationPart} from './reading-api';
export interface LiteratureContext { path: string; seed: Seed }
export interface ReaderState {path:string;mode:'pdf'|'reading'|'unsupported';attachmentId:string;sourceAttachmentId:string;translationId?:string}
export interface DocumentVersion {id:string;mode:'pdf'|'reading';attachmentId:string;sourceAttachmentId:string;label:string;language:string;original:boolean;translationId?:string}
export interface LiteraturePanel {
  id: string; title: string; icon: string;
  render(container: HTMLElement, context: LiteratureContext): void | (()=>void);
}
export interface LiteratureAction {
  id: string; title: string; icon: string;
  run(context: LiteratureContext): void | Promise<void>;
}
export interface ZotSightAPI {
  apiVersion: '1.0.0';
  getActiveLiterature(): LiteratureContext | null;
  getLiterature(path: string): Promise<Seed>;
  getAttachments(path: string): Promise<Attachment[]>;
  getNotes(path: string): Promise<string>;
  getReaderState(path?:string):ReaderState|null;
  getDocumentVersions(path:string):Promise<DocumentVersion[]>;
  showDocumentVersion(path:string,id:string):Promise<void>;
  updateNotes(path: string, markdown: string): Promise<void>;
  getPDFDocument(path:string,attachmentId?:string):Promise<{attachmentId:string;sourceHash:string;pdf:Uint8Array}>;
  getReadingDocument(path:string,attachmentId?:string,options?:{signal?:AbortSignal;onProgress?:(message:string)=>void}):Promise<ReadingDocument>;
  registerReadingTranslation(translation:ReadingTranslation):()=>void;
  showReadingTranslation(path:string,translationId:string|null):Promise<void>;
  readPackageFile(path:string,entry:string):Promise<Uint8Array|null>;
  listPackageFiles(path:string,prefix?:string):Promise<string[]>;
  writeExtensionFiles(path:string,namespace:string,files:Record<string,Uint8Array|string>):Promise<void>;
  registerPackagePDF(path:string,entry:string,title:string,previousPath?:string,outline?:import('./outline').OutlineTranslation[]):Promise<Attachment>;
  showAttachment(path:string,id:string):Promise<void>;
  registerPDFAttachment(path:string,filePath:string,title:string):Promise<Attachment>;
  registerPanel(panel: LiteraturePanel): ()=>void;
  registerAction(action: LiteratureAction): ()=>void;
  on(event: 'active-change'|'reader-change'|'literature-change'|'unload', callback: (context: LiteratureContext|null)=>void): ()=>void;
}
