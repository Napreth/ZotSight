import type { Seed, Attachment } from './model';
export interface LiteratureContext { path: string; seed: Seed }
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
  updateNotes(path: string, markdown: string): Promise<void>;
  registerPanel(panel: LiteraturePanel): ()=>void;
  registerAction(action: LiteratureAction): ()=>void;
  on(event: 'active-change'|'literature-change'|'unload', callback: (context: LiteratureContext|null)=>void): ()=>void;
}
