/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './web/index.css';
import './web/style.css';

const settingUnknownTenplate = document.getElementById('settings-unknown-tenplate');
const settingsToggleTenplate = document.getElementById('settings-toggle-tenplate');
const settingsTextTenplate   = document.getElementById('settings-text-tenplate');
const settingsNumberTenplate = document.getElementById('settings-number-tenplate');
const settingsRangeTenplate  = document.getElementById('settings-range-tenplate');
const settingsColorTenplate  = document.getElementById('settings-color-tenplate');

const providerTenplate       = document.getElementById('provider-tenplate');
const pluginTenplate         = document.getElementById('plugin-tenplate');

const pluginsListEl          = document.getElementById('plugins-list');
const pluginsSettingsEl      = document.getElementById('plugin-settings');

const providerTable          = document.getElementById('provider-table');
const settingsPage           = document.getElementById('settings-content');

const backBtn                = document.getElementById('back');

const config = {
    showIPS: false,
    showUUIDS: false,
    showService: false
};

let clients: Client[] = [];

for(const el of document.getElementsByClassName('sidebar-button')) {
    el.addEventListener('click', () => {
        // [WaterWolf5918] el.id should always be equal to the the first section of the page it corresponds to
        
        // [WaterWolf5918] handle plugin settings back
        if (el.id == 'back') return;
        pluginsSettingsEl.innerHTML = '';
        pluginsListEl.classList.remove('hidden');
        backBtn.classList.add('hidden');


        const lastActive    = document.querySelector('.active-sidebar-button') as HTMLDivElement;
        const newActive     = document.getElementById(el.id);

        if(lastActive.id == newActive.id) return;

        const lastActivePage = document.querySelector('.active-page');
        const newActivePage = document.getElementById(`${el.id}-content`);

        lastActive.classList.remove('active-sidebar-button');
        newActive.classList.add('active-sidebar-button');

        lastActivePage.classList.remove('active-page');
        newActivePage.classList.add('active-page');
    });
}

loadWebSettings();
renderGlobalSettings();
renderPlugins();

window.callbacks.clientUpdate((_clients) => {
    console.log('Clients:');
    console.log([..._clients,Math.random()]);
    if (clients.length == 0) {
        console.log('No Presaved Clients. Full Render');
        
        clients = _clients;
        clients.forEach(client => drawNewClient(client));
        return;
    }
    console.log('Using cached clients.');


    // const sameClients = clients.filter(c => _clients.map(c => c.uuid).includes(c.uuid));
    const sameClients = _clients.filter(c => clients.map(c => c.uuid).includes(c.uuid));
    const newClients = _clients.filter(c => !clients.map(c => c.uuid).includes(c.uuid));
    const removedClients = clients.filter(c => !_clients.map(c => c.uuid).includes(c.uuid));
    // console.log('Same Clients:');
    // console.log([...sameClients,Math.random()]);

    if (newClients.length == 0 && removedClients.length == 0) {
        console.log('No clients changed, updateing existing clients.');
        console.log(`Same Clients: ${sameClients.map(c => c.uuid).join(', ')}`);
        for (const client of sameClients) {
            updateExistingClient(client);
        }

    } else if (newClients.length > 0 && removedClients.length == 0) {
        console.log('New clients detected, adding client nodes to table.');
        console.log(`New Clients: ${newClients.map(c => c.uuid).join(', ')}`);
        for (const client of newClients) {
            drawNewClient(client);
        }
    } else if (newClients.length == 0 && removedClients.length > 0){
        console.log('Clients removed, removing client nodes from table.');
        console.log(`Removed Clients: ${removedClients.map(c => c.uuid).join(', ')}`);
        for (const client of removedClients) {
            removeClient(client);
        }
    }

    clients = _clients;
});

function getStateIcon(playerState: PlayerState) {
    switch (playerState) {
        case 'playing':
            return 'play_arrow';
            break;
        case 'paused':
            return 'pause';
            break;
        case 'unknown':
            return 'question_mark';
            break;
    }
}



function removeClient(client: Client) {
    const el = providerTable.querySelector(`#u${client.uuid}`);
    if (el == null){
        console.error(`removeClient failed with error. ${client.uuid} was not found well trying to update it. Ignoring.`);
        return;
    }
    el.remove();
}

function updateExistingClient(client: Client) {
    const el = providerTable.querySelector(`#u${client.uuid}`);
    if (el == null){
        console.error(`UpdateExistingClient failed with error. ${client.uuid} was not found well trying to update it. Creating new element`);
        drawNewClient(client);
        return;
    }
    // [WaterWolf5918] Client name, service, and uuid should never change so we don't update them. 
    //     I swear if someone makes a provider that changes one of them I'm going to lose it. 
    
    // [WaterWolf5918] Update ip if it has changed. It shouldn't most of the time...
    const elIP = (el.querySelector('.provider-ip p') as HTMLParagraphElement);
    if (elIP.innerText !== client.ip) {elIP.innerText = client.ip;}

    // [WaterWolf5918] Update state if it has changed.
    if ((el.querySelector('.provider-state span') as HTMLSpanElement).innerText !== getStateIcon(client.clientInfo?.playerState ?? 'unknown')){
        (el.querySelector('.provider-state span') as HTMLSpanElement).innerText =   getStateIcon(client.clientInfo?.playerState ?? 'unknown');
    }

    // [WaterWolf5918] Only try to update it if the title has changed.
    const elTitle = (el.querySelector('.provider-current-title p') as HTMLParagraphElement);
    if (elTitle.innerText !== client.clientInfo.title || client.clientInfo.title == undefined) {
        (el.querySelector('.provider-image img')       as HTMLImageElement).src           = client.clientInfo?.thumbnail ?? './YTlogo4.png' ;
        (el.querySelector('.provider-current-title p') as HTMLParagraphElement).innerText = client.clientInfo?.title;
    }
}


function drawNewClient(client: Client) {
    // [WaterWolf5918] Bandaid fix for Node not having methods it should in this case 
    const newEl = ((providerTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
    newEl.querySelector('.provider').id = `u${client.uuid}`;
    (newEl.querySelector('.provider-image img')       as HTMLImageElement).src           = client.clientInfo?.thumbnail ?? './YTlogo4.png' ;
    (newEl.querySelector('.provider-state span')      as HTMLSpanElement).innerText      = getStateIcon(client.clientInfo?.playerState ?? 'unknown');
    (newEl.querySelector('.provider-name p')          as HTMLParagraphElement).innerText = client.name;
    (newEl.querySelector('.provider-current-title p') as HTMLParagraphElement).innerText = client.clientInfo?.title;
    // [WaterWolf5918] Might be hidden in the future
    (newEl.querySelector('.provider-service p')       as HTMLParagraphElement).innerText = client.service; 
    //  [WaterWolf5918] Only shown if debugging is enabled 
    (newEl.querySelector('.provider-ip p')            as HTMLParagraphElement).innerText = client.ip;
    (newEl.querySelector('.provider-uuid p')          as HTMLParagraphElement).innerText = client.uuid;
    
    if (!config.showIPS) {
        (newEl.querySelector('.provider-ip')   as HTMLDivElement).classList.add('hidden');
    }
    if (!config.showUUIDS) {
        (newEl.querySelector('.provider-uuid') as HTMLDivElement).classList.add('hidden');
    }
    if (!config.showService) {
        (newEl.querySelector('.provider-service') as HTMLDivElement).classList.add('hidden');
    }

    providerTable.appendChild(newEl);
}

async function loadWebSettings() {
    const showIPS = await window.settings.get('webDisplayIPs');
    const showUUIDS = await window.settings.get('webDisplayUUIDs');
    const showService = await window.settings.get('webDisplayService');
    config.showIPS = showIPS;
    config.showUUIDS = showUUIDS;
    config.showService = showService;
    if (config.showIPS) {
        document.querySelectorAll('.provider-ip').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.provider-ip').forEach(el => el.classList.add('hidden'));
    }
    if (config.showUUIDS) {
        document.querySelectorAll('.provider-uuid').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.provider-uuid').forEach(el => el.classList.add('hidden'));
    }
    if (config.showService) {
        document.querySelectorAll('.provider-service').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.provider-service').forEach(el => el.classList.add('hidden'));
    }
}


async function renderGlobalSettings() {
    // [WaterWolf5918] We have to wrap this in another function because you can't use await in the global scope.
    renderSettingsPage(settingsPage, await window.settings.getBuilder());
}

async function renderPluginSettings(plugin: PluginInfo) {

    backBtn.classList.add('slideDown');
    setTimeout(() => {
        backBtn.classList.remove('slideDown');
    },250);
    backBtn.classList.remove('hidden');
    pluginsListEl.classList.add('hidden');
    renderSettingsPage(pluginsSettingsEl,plugin.configBuilder,plugin.name);
    backBtn.addEventListener('click',() => {
        pluginsSettingsEl.innerHTML = '';
        pluginsListEl.classList.remove('hidden');
        backBtn.classList.add('slideUp');
        setTimeout(() => {
            backBtn.classList.remove('slideUp');
            backBtn.classList.add('hidden');
        },250);

    },{once: true});
}


async function renderSettingsPage(pageEl: HTMLElement, configBuilder: ConfigBuilder, pluginName: string = 'global'){
    pageEl.innerHTML = '';
    if (pluginName !== 'global'){
        const el = document.createElement('p');
        el.classList.add('settings-title');
        el.innerText = pluginName;
        pageEl.appendChild(el);
    }
    for (const page in configBuilder.pages) { 
        const el = document.createElement('p');
        el.classList.add('settings-category');
        el.innerText = page;
        pageEl.appendChild(el);
        let config;
        if (pluginName == 'global'){
            config = await window.settings.getConfig();
        } else {
            config = await window.plugins.getConfig(pluginName);
        }
        for (const setting of configBuilder.pages[page]){


            switch(setting.type) {
                case 'checkbox': {
                    const settingsEl = ((settingsToggleTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
                    const toggle = settingsEl.querySelector('.toggle-swtich input[type="checkbox"]') as HTMLInputElement;
                    (settingsEl.querySelector('.settings-label') as HTMLParagraphElement).innerText = setting.displayName;
                    toggle.checked = (typeof config[setting.id] == 'boolean') ? config[setting.id] : false;
                    toggle.addEventListener('change',() => {
                        if (pluginName == 'global'){
                            window.settings.set(setting.id,toggle.checked);
                            loadWebSettings();
                        } else {
                            window.plugins.set(pluginName,setting.id,toggle.checked);
                        }

                    });
                    pageEl.appendChild(settingsEl);
                    break;
                }
                case 'text': {
                    const settingsEl = ((settingsTextTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
                    const textInput = settingsEl.querySelector('input[type="text"]') as HTMLInputElement;
                    (settingsEl.querySelector('.settings-label') as HTMLParagraphElement).innerText = setting.displayName;
                    textInput.value = config[setting.id];
                    textInput.addEventListener('focusout',() => {
                        if (pluginName == 'global'){
                            window.settings.set(setting.id,textInput.value);
                            loadWebSettings();
                        } else {
                            window.plugins.set(pluginName,setting.id,textInput.value);
                        }
                    });
                    pageEl.appendChild(settingsEl);
                    break;
                }
                case 'number': {
                    const settingsEl = ((settingsNumberTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
                    const numInput = settingsEl.querySelector('input[type="number"]') as HTMLInputElement;
                    (settingsEl.querySelector('.settings-label') as HTMLParagraphElement).innerText = setting.displayName;
                    numInput.value = config[setting.id] ?? 0;
                    numInput.min = (setting.min ?? Number.MIN_VALUE).toPrecision();
                    numInput.max = (setting.max ?? Number.MAX_VALUE).toPrecision();
                    numInput.addEventListener('focusout',() => {
                        if (pluginName == 'global'){
                            window.settings.set(setting.id,numInput.value);
                            loadWebSettings();
                        } else {
                            window.plugins.set(pluginName,setting.id,numInput.value);
                        }
                    });
                    pageEl.appendChild(settingsEl);
                    break;
                }
                case 'range': {
                    const settingsEl = ((settingsRangeTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
                    const rangeInput = settingsEl.querySelector('input[type="range"]') as HTMLInputElement;
                    const numInput = settingsEl.querySelector('input[type="number"]') as HTMLInputElement;
                    
                    (settingsEl.querySelector('.settings-label') as HTMLParagraphElement).innerText = setting.displayName;
                    
                    numInput.value = config[setting.id];
                    numInput.min = (setting.min ?? Number.MIN_VALUE).toPrecision();
                    numInput.max = (setting.max ?? Number.MAX_VALUE).toPrecision();
                    rangeInput.step = (setting.step ?? 0.1).toPrecision();
                    rangeInput.value = config[setting.id];
                    rangeInput.min = (setting.min ?? Number.MIN_VALUE).toPrecision();
                    rangeInput.max = (setting.max ?? Number.MAX_VALUE).toPrecision();
                    
                    numInput.addEventListener('focusout',() => {
                        if (pluginName == 'global'){
                            window.settings.set(setting.id,numInput.value);
                            loadWebSettings();
                        } else {
                            window.plugins.set(pluginName,setting.id,rangeInput.value);
                        }
                    });
                    
                    rangeInput.addEventListener('change',() => {
                        if (pluginName == 'global'){
                            window.settings.set(setting.id,rangeInput.value);
                            loadWebSettings();
                        } else {
                            window.plugins.set(pluginName,setting.id,rangeInput.value);
                        }
                    });

                    rangeInput.addEventListener('input',() => {
                        numInput.value = rangeInput.value;
                    });

                    numInput.addEventListener('input',() => {
                        rangeInput.value = numInput.value;
                    });

                    pageEl.appendChild(settingsEl);
                    break;
                }
                case 'color': {
                    const settingsEl = ((settingsColorTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
                    const colorInput = settingsEl.querySelector('input[type="color"]') as HTMLInputElement;
                    (settingsEl.querySelector('.settings-label') as HTMLParagraphElement).innerText = setting.displayName;
                    colorInput.value = config[setting.id];

                    colorInput.addEventListener('focusout',() => {
                        if (pluginName == 'global'){
                            window.settings.set(setting.id,colorInput.value);
                            loadWebSettings();
                        } else {
                            window.plugins.set(pluginName,setting.id,colorInput.value);
                        }
                    });
                    pageEl.appendChild(settingsEl);
                    break;
                }
                default: {
                    const settingsEl = ((settingUnknownTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
                    (settingsEl.querySelector('.settings-label') as HTMLParagraphElement).innerText = `Error:Unknown input type, is your app up to date?\n** Debug Info **\nSetting Type: ${setting.type}\n App version: ${await window.settings.getAppVersion()}`;
                    pageEl.appendChild(settingsEl);
                }

            }
        }
    }
}



async function renderPlugins() {
    const plugins = await window.plugins.getPluginList();
    plugins.all.forEach(plugin => {
        const newEl = ((pluginTenplate as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment);
        (newEl.querySelector('.plugin-name')       as HTMLSpanElement).innerText           = plugin.name;
        (newEl.querySelector('.plugin-desc p')       as HTMLParagraphElement).innerText           = plugin.description ?? '';
        const toggle = (newEl.querySelector('.plugin .toggle-swtich input')       as HTMLInputElement);
        const settingsBtn = (newEl.querySelector('.plugin .plugin-settings-btn') as HTMLSpanElement);
        toggle.checked = plugins.loaded.map(p => p.name).includes(plugin.name);
        toggle.addEventListener('input',() => {
            console.log(toggle.checked);
            if (toggle.checked){
                window.plugins.enable(plugin.name);
            } else {
                window.plugins.disable(plugin.name);
            }
        });
        
        settingsBtn.addEventListener('click',() => {
            renderPluginSettings(plugin);
        });

        pluginsListEl.appendChild(newEl);
    });
}



console.log('👋 This message is being logged by "renderer.ts", included via Vite');
