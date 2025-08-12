// import { app, BrowserWindow } from 'electron';
// import path from 'node:path';
// import started from 'electron-squirrel-startup';

// let mainWindow
// // Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (started) {
//     app.quit();
// }

// const createWindow = () => {
//     // Create the browser window.
//     mainWindow = new BrowserWindow({
//         width: 800,
//         height: 600,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//         },
//     });

//     // and load the index.html of the app.
//     if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
//         mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
//     } else {
//         mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
//     }

//     // Open the DevTools.
//     mainWindow.webContents.openDevTools();
// };

// // Quit when all windows are closed, except on macOS. There, it's common
// // for applications and their menu bar to stay active until the user quits
// // explicitly with Cmd + Q.
// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') {
//         app.quit();
//     }
// });

// app.on('activate', () => {
//     // On OS X it's common to re-create a window in the app when the
//     // dock icon is clicked and there are no other windows open.
//     if (BrowserWindow.getAllWindows().length === 0) {
//         createWindow();
//     }
// });

// // This method will be called when Electron has finished
// // initialization and is ready to create browser windows.
// // Some APIs can only be used after this event occurs.
// app.whenReady().then(() => {

//     createWindow()
// })
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) process.exit();
import path from 'path';
import * as positron from './positron';
import { app, BrowserWindow, dialog, ipcMain, Tray } from 'electron';
import { InfoStore } from './infoStore';
import { restSetup } from './restServ';
import { networkInterfaces } from 'os';
import { PluginConfigHelper, PluginManager } from './pluginManager';
import { AuthManager } from './ClientManager';
import { Logger } from './logger';
export const store = new InfoStore();
// export const configStore = new ConfigHelper(path.join(__dirname, '../config.json'));
const configBuilder:PluginInfo['configBuilder'] = {
    pages: {

        Debug: [
            {
                type: 'checkbox',
                id: 'debugNotification',
                displayName: 'Display Debug Notifications',
                required: true,
                default: false
            },
            {
                type: 'checkbox',
                id: 'debug',
                displayName: 'Display Debug Messages',
                required: true,
                default: false
            },
            {
                type: 'checkbox',
                id: 'webDisplayIPs',
                displayName: 'Show IPs',
                required: true,
                default: false
            },
            {
                type: 'checkbox',
                id: 'webDisplayUUIDs',
                displayName: 'Show UUIDs',
                required: true,
                default: false
            },
            {
                type: 'checkbox',
                id: 'webDisplayService',
                displayName: 'Show Services',
                required: true,
                default: false
            },
        ]
    }
};

export const configStore = new PluginConfigHelper({'info': {'name': 'systen', 'configBuilder': configBuilder}},'./');
export const authManager = new AuthManager();

const pluginManager = new PluginManager();
const tray: Tray = null;
const logger = new Logger();

export let mainWindow: BrowserWindow;
let appShouldClose = false;



console.clear = () => {
    console.log('\x1b[2J\x1b[H\x1bc');
}; //since console.clear() still doesn't work on windows :face_palm:


function createWindow() {
    mainWindow = new BrowserWindow({
        resizable: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        frame: true,
        autoHideMenuBar: true,
        backgroundMaterial: 'none',
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, '../build', 'YTlogo4.png'),

    });
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
    // Mainwindow.loadFile(path.join(__dirname, '../app/index.html'));
    if (!tray) { positron.createBasicTray(tray, mainWindow); }

    mainWindow.on('close', (e) => {
        if (!appShouldClose) e.preventDefault();
        dialog.showMessageBox(positron.closedialogSettings).then(async (result) => {
            if (result.response == 1) {
                appShouldClose = true;
                logger.info(['Main'],'Shutting Down...');
                await pluginManager.stopPlugins();
                
                app.quit();
            } else {
                BrowserWindow.getFocusedWindow().hide();
            }
        });
    });
}



ipcMain.handle('getAppVersion', () => {
    return app.getVersion();
});

ipcMain.handle('forceRefresh', () => {
    mainWindow.reload();
});

ipcMain.handle('getConfigBuilder',() => {
    return configBuilder;
});

ipcMain.handle('getConfigKey',(_event, key) => {
    return configStore.get(key);
});

ipcMain.handle('getConfig',(_event, key) => {
    return configStore.config;
});

ipcMain.handle('setConfigKey',(_event, key,value) => {
    logger.info(['Main','Settings','IPC'],`Set Option "${key}" to "${value}"`);
    return configStore.set(key,value);
});

ipcMain.handle('getPluginList',() => {
    return {all: pluginManager.plugins.map(p => p.info), loaded: pluginManager.runningPlugins.map(p => p.plugin.info)};
});

ipcMain.handle('enablePlugin',(_event,pluginName) => {
    pluginManager.enablePlugin(pluginName);
});

ipcMain.handle('disablePlugin',(_event,pluginName) => {
    pluginManager.disablePlugin(pluginName);
});

ipcMain.handle('setPluginKey',(_event,pluginName,key, value) => {
    let cm: PluginConfigHelper;
    if (!pluginManager.plugins.map(p => p.info.name).includes(pluginName) ) {
        logger.error(['PluginManager','Settings'],'Tried to write to plugin that doesn\'t exist.');
        return;
    }
    if (!pluginManager.runningPlugins.map(p => p.plugin.info.name).includes(pluginName)) {
        logger.warn(['PluginManager','Settings'],'Wrote to plugin that isn\'t loaded. Creating temporary configHelper.') ;
        cm = new PluginConfigHelper({info: {name: pluginName,configBuilder:pluginManager.plugins.find(p => p.info.name == pluginName).info.configBuilder}});
    } else {
        cm = pluginManager.runningPlugins.find(p => p.plugin.info.name == pluginName).configManager;
    }
    logger.info(['PluginManager','Settings','IPC'],`Set Option "${key}" to "${value}"`);
    cm.set(key,value);
});

ipcMain.handle('getPluginConfig',(_event,pluginName) => {
    let cm: PluginConfigHelper;
    if (!pluginManager.plugins.map(p => p.info.name).includes(pluginName) ) {
        logger.error(['PluginManager','Settings'],'Tried to read from a plugin that doesn\'t exist.');
        return;
    }
    if (!pluginManager.runningPlugins.map(p => p.plugin.info.name).includes(pluginName)) {
        logger.warn(['PluginManager','Settings'],'Reading from a plugin that isn\'t loaded. Creating temporary configHelper.') ;

        cm = new PluginConfigHelper({info: {name: pluginName,configBuilder:pluginManager.plugins.find(p => p.info.name == pluginName).info.configBuilder}});
    } else {
        cm = pluginManager.runningPlugins.find(p => p.plugin.info.name == pluginName).configManager;
    }
    return cm.config;
});

ipcMain.handle('getPluginKey',(_event,pluginName,key,) => {
    let cm: PluginConfigHelper;
    if (!pluginManager.plugins.map(p => p.info.name).includes(pluginName) ) {
        logger.error(['PluginManager','Settings'],'Tried to read from a plugin that doesn\'t exist.');
        return;
    }
    if (!pluginManager.runningPlugins.map(p => p.plugin.info.name).includes(pluginName)) {
        logger.warn(['PluginManager','Settings'],'Reading from a plugin that isn\'t loaded. Creating temporary configHelper.') ;

        cm = new PluginConfigHelper({info: {name: pluginName,configBuilder:pluginManager.plugins.find(p => p.info.name == pluginName).info.configBuilder}});
    } else {
        cm = pluginManager.runningPlugins.find(p => p.plugin.info.name == pluginName).configManager;
    }
    return cm.get(key);
});



app.whenReady().then(() => {
    createWindow();
    store.on('infoUpdated', () => {
        logger.dinfo(['InfoStore'],'Info Update');
        mainWindow.webContents.send('infoUpdate', store.info);
    });
    logger.info(['Plugin Manager'],'Starting Plugins');
    pluginManager.loadPlugins();

});


restSetup()
    .then(() => {
        logger.info(['restServ'],'Server listening on port 9494');
        const interfaces = networkInterfaces();
        Object.entries(interfaces).forEach(item => {
            item[1].forEach(info => {
                console.log(`    ${item[0]}: \x1b[36mhttp://${info.address}:9494\x1b[0m`);
            });
        });

    })
    .catch(err => {
        console.error(err);
        process.exit();
        throw new Error('Failed to create web server');
        
    });


