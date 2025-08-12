/* eslint-disable no-irregular-whitespace */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import { contextBridge, ipcRenderer, app} from 'electron';


contextBridge.exposeInMainWorld('settings', {
    
    getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
    forceRefresh: ()  => ipcRenderer.invoke('forceRefresh'),

    getBuilder: ()    => ipcRenderer.invoke('getConfigBuilder'),
    getConfig: ()     => ipcRenderer.invoke('getConfig'),
    get: (key: string)        => ipcRenderer.invoke('getConfigKey', key),
    set: (key:string, value:any) => ipcRenderer.invoke('setConfigKey', key, value),
});

contextBridge.exposeInMainWorld('plugins', {
    getPluginList: ()                                  => ipcRenderer.invoke('getPluginList'),
    enable: (pluginName: string)                       => ipcRenderer.invoke('enablePlugin',pluginName),
    disable: (pluginName: string)                      => ipcRenderer.invoke('disablePlugin',pluginName),
    getConfig: (pluginName: string)                    => ipcRenderer.invoke('getPluginConfig',pluginName),
    get: (pluginName: string, key: string)             => ipcRenderer.invoke('getPluginKey',pluginName,key),
    set: (pluginName: string, key: string, value: any) => ipcRenderer.invoke('setPluginKey',pluginName,key,value)
});

contextBridge.exposeInMainWorld('callbacks', {
    clientUpdate:(callback: (clients:Client[]) => void) => ipcRenderer.on('clientUpdate',(event,clients:Client[]) => {
        callback(clients);
    }),
});


const test = function() {

}



