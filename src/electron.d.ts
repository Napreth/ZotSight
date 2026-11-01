declare module 'electron' { export const webUtils: {getPathForFile(file: File): string}; }

declare module 'electron' {
  export const remote:{
    dialog:{showOpenDialog(window:unknown,options:{title:string;properties:string[];filters:{name:string;extensions:string[]}[]}):Promise<{canceled:boolean;filePaths:string[]}>};
    BrowserWindow:{getFocusedWindow():unknown};getCurrentWindow():unknown;
  };
}
