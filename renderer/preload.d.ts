import { IpcHandler } from '../main/preload'

export interface ElectronAPI {
  getDisplayMedia(): Promise<any[]>
  mouseMove(x: number, y: number): Promise<{ success: boolean, error?: string }>
  mouseClick(x: number, y: number, button?: string): Promise<{ success: boolean, error?: string }>
  mouseDown(x: number, y: number, button?: string): Promise<{ success: boolean, error?: string }>
  mouseUp(x: number, y: number, button?: string): Promise<{ success: boolean, error?: string }>
  getScreenResolution(): Promise<{ width: number, height: number }>
  testRobotjs(): Promise<{ success: boolean, error?: string, originalPos?: any, testPos?: any, actualPos?: any }>
}

declare global {
  interface Window {
    ipc: IpcHandler
    electronAPI: ElectronAPI
  }
}
