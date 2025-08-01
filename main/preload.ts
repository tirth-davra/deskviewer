import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const handler = {
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
  invoke(channel: string, value?: unknown) {
    return ipcRenderer.invoke(channel, value)
  },
}

contextBridge.exposeInMainWorld('ipc', handler)
contextBridge.exposeInMainWorld('electronAPI', {
  getDisplayMedia: () => ipcRenderer.invoke('get-display-media'),
  mouseMove: (x: number, y: number) => ipcRenderer.invoke('mouse-move', x, y),
  mouseClick: (x: number, y: number, button?: string) => ipcRenderer.invoke('mouse-click', x, y, button),
  mouseDown: (x: number, y: number, button?: string) => ipcRenderer.invoke('mouse-down', x, y, button),
  mouseUp: (x: number, y: number, button?: string) => ipcRenderer.invoke('mouse-up', x, y, button),
  getScreenResolution: () => ipcRenderer.invoke('get-screen-resolution')
})

export type IpcHandler = typeof handler
