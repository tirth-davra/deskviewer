import { IpcHandler } from '../main/preload'

export interface ElectronAPI {
  getDisplayMedia(): Promise<any[]>
}

declare global {
  interface Window {
    ipc: IpcHandler
    electronAPI: ElectronAPI
  }
}
