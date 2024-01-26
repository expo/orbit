export type ElectronModule = {
  name: string;
  [key: string]:
    | number
    | string
    | boolean
    | ((...args: any[]) => Promise<any> | any)
    | { [key: string]: number | string | boolean };
};

export type Registry = ElectronModule[];

export type IpcMainModulesFunctions = {
  [moduleName: string]: { functions: string[]; values: string[] };
};
