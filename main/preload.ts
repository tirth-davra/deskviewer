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
  getDisplayMedia: () => ipcRenderer.invoke('get-display-media')
})

export type IpcHandler = typeof handler
