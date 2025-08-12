/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { Notification } from 'electron';
import { mainWindow, store } from './main';
import { webServer } from './restServ';
import { Logger } from './logger';
import { TypedEventEmitterClass } from './utils';
import { InfoStore } from './infoStore';
import { pathToFileURL } from 'url';

type PluginEvents = {
    playbackChange: [PlayerState],
    mediaChange: [VideoMetadata],
    rawInfoUpdate: [VideoMetadata],
    rawPlayerStateChange: [PlayerState]
}

type RunningPlugin = {
    plugin: FSPlugin,
    configManager: PluginConfigHelper,
    eventDispatcher: TypedEventEmitterClass<PluginEvents>
}

interface DumbObject {
    [key:string]: any // A fix for not being able to index objects by string, because why the fuck not.
}


const logger = new Logger();
export class PluginManager {
    lastSong: string;
    pluginDir: any;
    pluginFileMappings: DumbObject
    plugins: FSPlugin[];
    runningPlugins: RunningPlugin[];
    constructor(){
        this.pluginDir = path.join(homedir(),'.openMediaShare','plugins');
        if(!existsSync(this.pluginDir)) { mkdirSync(this.pluginDir,{ recursive: true }); }
        this.plugins = [];
        this.runningPlugins = [];
        this.pluginFileMappings = {};
    }

    async loadPlugins(){
        const files = readdirSync(this.pluginDir,{ withFileTypes: true });
        for(const file of files) {

            if (!file.isFile() || !file.name.endsWith('js')){continue;}
            logger.info(['Plugin Manager'],`Importing Plugin: ${file.name}`);
            const plugin: FSPlugin = await import(pathToFileURL(path.join(this.pluginDir,file.name)).toString()); 

            if (!plugin.info || !plugin.info.name) {
                logger.warn(['Plugin Manager'],`File ${file.name} isn't a vaild plugin, Skipping. `);
                return;
            }
            // Fix for my bad spelling, I'm sorry :(
            // @ts-expect-error This is a missing type because it doesn't exist in any new projects, and is from my miss spelling.
            if (plugin.info.auther) {
                // @ts-expect-error This is a missing type because it doesn't exist in any new projects, and is from my miss spelling.
                plugin.info.author = plugin.info.auther;
            }



            if (this.plugins.map(p => p.info.name).includes(plugin.info.name)){
                logger.error(['Plugin Manager'],`Duplicate plugin "${plugin.info.name}" detected! Can\`t load plugin with duplicate name.`);
                continue;
            }
            this.pluginFileMappings[plugin.info.name] = file.name;
            this.plugins.push(plugin);
            if (file.name.endsWith('d.js')){
                logger.info(['Plugin Manager'],`Plugin "${file.name}" is disabled`);
                continue;
            }
            await this.startPlugin(plugin.info.name);

        }
        if (mainWindow) mainWindow.webContents.send('allPluginsLoaded',this.runningPlugins.map(p => p.plugin.info));
    }


    private async startPlugin(pluginName: string){
        const electronImport = await import('electron');
        // [WaterWolf5918] Recreating this between plugins should help prevent plugins being able to modify builtin functions.
        const modules = {
            electron: electronImport,
            express: webServer,
            Logger: Logger,
            infoStore: store
        };

        const plugin = this.plugins.find(p => p.info.name == pluginName);
        const runningPlugin:RunningPlugin = {plugin: plugin,configManager: new PluginConfigHelper(plugin),eventDispatcher: new TypedEventEmitterClass()};

        plugin.info.legacy = false;

        logger.info(['Plugin Manager'],`Starting Plugin: ${plugin.info.name}`); 
        store.on('infoUpdated',(e) => {
            runningPlugin.eventDispatcher.emit('rawInfoUpdate',e);
            if (this.lastSong == e.data.title) return;
            runningPlugin.eventDispatcher.emit('mediaChange',e);
            this.lastSong = e.data.title;
        });

        store.on('playerStateChange',(e) => {
            runningPlugin.eventDispatcher.emit('rawPlayerStateChange',e);
            if (e == undefined) return;
            runningPlugin.eventDispatcher.emit('playbackChange',e);
        });



        plugin.start(modules,runningPlugin.configManager,runningPlugin.eventDispatcher);
        // check to see if infoupdate exists before calling it
        if (plugin.infoUpdate instanceof Function){
            if (!plugin.info.legacy) {logger.warn(['Plugin Manager'],`Plugin ${plugin.info.name} looks to be using the v0 plugin API. Please ask ${plugin.info.author} to consider switching to the new v1 API.`);}

            plugin.info.legacy = true;
            store.on('infoUpdated',(metadata) => {
                plugin.infoUpdate(modules,metadata,runningPlugin.configManager);
            });
        }
        if (plugin.stateUpdate instanceof Function){
            if (!plugin.info.legacy) {logger.warn(['Plugin Manager'],`Plugin ${plugin.info.name} looks to be using the v0 plugin API. Please ask ${plugin.info.author} to consider switching to the new v1 API.`);}

            plugin.info.legacy = true;
            store.on('playerStateChange',(playerState) => {
                plugin.stateUpdate(modules,playerState,runningPlugin.configManager);
            });
        }
        logger.info(['Plugin Manager'],`Started Plugin: ${plugin.info.name}`);

        this.runningPlugins.push(runningPlugin);
    }








    private async stopPlugin(pluginName: string){
        const runningPlugin = this.runningPlugins.find(rp => rp.plugin.info.name == pluginName);
        logger.info(['Plugin Manager'],`Stopping Plugin: ${runningPlugin.plugin.info.name}`);
        runningPlugin.eventDispatcher.emitter.removeAllListeners();
        runningPlugin.plugin.stop();
        logger.info(['Plugin Manager'],`Stopped Plugin: ${runningPlugin.plugin.info.name}`);
        this.runningPlugins = this.runningPlugins.filter(_rp => _rp.plugin.info.name !== runningPlugin.plugin.info.name);
    }

    async stopPlugins(){
        this.runningPlugins.forEach(lp => {
            this.stopPlugin(lp.plugin.info.name);
        });
    }

    async enablePlugin(pluginName: string){
        const legacy = this.plugins.find(p => p.info.name == pluginName).info.legacy;
        if (!this.plugins.map(p => p.info.name).includes(pluginName) ) {
            logger.error(['PluginManager'],'Tried to start a plugin that isn\'t loaded.');
            return;
        }
        if (this.runningPlugins.map(p => p.plugin.info.name).includes(pluginName) && !legacy) {
            logger.warn(['PluginManager'],'Tried to enable plugin that is already running') ;
            return;
        }

        renameSync(path.join(this.pluginDir,this.pluginFileMappings[pluginName]),path.join(this.pluginDir,this.pluginFileMappings[pluginName].replace('.d','')));
        this.pluginFileMappings[pluginName] = this.pluginFileMappings[pluginName].replace('.d','');
        if (legacy) return;
        this.startPlugin(pluginName);
    }

    async disablePlugin(pluginName: string){
        if (!this.plugins.map(p => p.info.name).includes(pluginName)) {
            logger.error(['PluginManager'],'Tried to stop a plugin that isn\'t loaded. How did the plugin start?');
            return;
        }
        if (!this.runningPlugins.map(p => p.plugin.info.name).includes(pluginName)) {
            logger.warn(['PluginManager'],'Tried to disable plugin that isn\'t running.') ;
            return;
        }


        renameSync(path.join(this.pluginDir,this.pluginFileMappings[pluginName]),path.join(this.pluginDir,`${this.pluginFileMappings[pluginName]}.d`));
        this.pluginFileMappings[pluginName] = `${this.pluginFileMappings[pluginName]}.d`;
        if(this.plugins.find(p => p.info.name == pluginName).info.legacy){
            logger.error(['PluginManager'],'Legacy plugins do not support live starting or stopping.');
            if (mainWindow) {
                new Notification({
                    urgency: 'critical',
                    title: '⚠️ Plugin Toggle Note',
                    body: 'Legacy plugins do not support live stopping.\n\nThis plugin will be disabled next time you restart OpenMediaShare.'
                }).show();
            }
            return;
        }

        await this.stopPlugin(pluginName);
    }

}

export class PluginConfigHelper {
    name: string;
    filePath: string;
    vaild: boolean;
    configPath: string;
    config: DumbObject;
    constructor(plugin: {info: {name: string, configBuilder: ConfigBuilder}},filePath=path.join(homedir(),'.openMediaShare','configs')){
        this.vaild = false;
        this.name = plugin.info.name;
        this.filePath = filePath;
        this.configPath = path.join(this.filePath,`${this.name}.config.json`);
        if (!existsSync(this.filePath)) mkdirSync(this.filePath,{recursive: true});

        if(plugin.info.configBuilder){
            this.buildPluginConfig(plugin);
            this.vaild = true;
        }
        
    }

    private buildPluginConfig(plugin: {info: {name: string, configBuilder: ConfigBuilder}}) {
        
        if(!existsSync(this.configPath)){
            const json: DumbObject = {};
            const pages = plugin.info.configBuilder.pages;
            // const testPages = testPlugin.info.configBuilder.pages;
            //# condense pages into one key:value pairs 
            //## loop over each page
            Object.keys(pages).forEach(page => {
                //## loop over elements in the array and turn it into a key:value
                pages[page].forEach(e => json[e.id] = e.default?? null);
            });
            writeFileSync(this.configPath,JSON.stringify(json,null,4),);
        }
        this.config = JSON.parse(readFileSync(this.configPath,'utf-8'));
        //idk do ui stuff sometime
    }

    set(key:string,value:any) {
        this.config[key] = value;
        writeFileSync(this.configPath,JSON.stringify(this.config,null,4),);
    }

    get(key: string) {
        return this.config[key];
    }
}