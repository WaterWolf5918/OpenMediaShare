import { app, Notification } from 'electron';
import { configStore, mainWindow } from './main';


export class AuthManager {
    clients: Client[];
    activeClient: Client;
    constructor(){
        this.clients = [];
        this.activeClient = null;
    }

    updateClient(metadata: VideoMetadata, ip: string) {
        // console.log(this.clients.map(e => e.uuid == '432'));
        this.clients.forEach((client) => {
            const now = Date.now();
            const compare = now - client.lastUpdated;
            //remove clients that haven't responded for 5 mins 
            if (client.lastUpdated && (compare / 1000) > 300){
                this.removeClientByUUID(client.uuid);
            }
            if (client.uuid !== metadata.auth.uuid) return;

            client.lastUpdated = Date.now();
            client.ip = ip;
            client.clientInfo = {
                'creator': metadata?.data?.creator ?? client?.clientInfo?.creator ?? 'unknowm',
                'title': metadata?.data?.title ?? client?.clientInfo?.title ??'unknown',
                'thumbnail': metadata?.data?.thumbnail ?? client?.clientInfo?.thumbnail ?? 'YTlogo4.png',
                'playerState': metadata?.data?.playerState ?? client?.clientInfo?.playerState ?? 'unknown'
            };
            if (mainWindow) mainWindow.webContents.send('clientUpdate', this.clients);
            
        });
    }
    updateClientState(uuid: string,state: PlayerState) {
        // console.log(this.clients.map(e => e.uuid == '432'));
        this.clients.forEach((client) => {
            if (client.uuid !== uuid) return;
            if (!client.clientInfo) return;
            client.clientInfo.playerState = state ?? 'unknown';
        });
        if (mainWindow) mainWindow.webContents.send('clientUpdate', this.clients);
    }
    

    addClient(client: Client) {
        console.log('client add:');
        console.log(`    uuid:${client.uuid}`);
        console.log(`    name:${client.name}`);
        if (client.clientInfo == undefined) {
            client.clientInfo = {
                creator: 'unknown',
                playerState: 'unknown',
                thumbnail: 'YTlogo4.png',
                title: 'unknown'
            };
        }
        this.clients.push(client);
        this.activeClient = client;
        if (!app.isReady()) return;
        if (mainWindow) mainWindow.webContents.send('clientUpdate', this.clients);
        if(!configStore.get('debugNotification')) return;
        new Notification({
            'urgency': 'critical',
            'body': client.uuid,
            'title': 'New Client',
        }).show();
        
    }

    addClientSilent(client: Client) {
        this.clients.forEach(loopClient => {if(loopClient.uuid == client.uuid) return;});
        if (client.clientInfo == undefined) {
            client.clientInfo = {
                creator: 'unknown',
                playerState: 'unknown',
                thumbnail: 'YTlogo4.png',
                title: 'unknown'
            };
        }
        this.clients.push(client);
        if (!app.isReady()) return;
        if (mainWindow) mainWindow.webContents.send('clientUpdate', this.clients);
        if(!configStore.get('debugNotification')) return;
        new Notification({
            'urgency': 'critical',
            'body': client.uuid,
            'title': 'New Client (Silent)',
        }).show();
        
    }

    getClientByUUID(uuid: string): Client{
        let client;
        for (let i=0;i<this.clients.length;i++){
            if (this.clients[i].uuid == uuid) client = this.clients[i];
        }
        return client;
    }

    removeClientByName(name: string) {
        if (this.activeClient.name == name) {
            this.activeClient = null;
        }
        for(let i=0;i<this.clients.length;i++) {
            if(this.clients[i].name == name) {
                this.clients.splice(i, 1);
                if (!app.isReady()) return;
                if(!configStore.get('debugNotification')) return;
                new Notification({
                    'urgency': 'critical',
                    'body': name,
                    'title': 'Removed Client (Name)',
                }).show();
                return;
            }
        }
    }



    removeClientByUUID(uuid: string) {
        if (this.activeClient.uuid == uuid) {
            this.activeClient = null;
        }
        for(let i=0;i<this.clients.length;i++) {
            if(this.clients[i].uuid == uuid) {
                this.clients.splice(i, 1);
                if (!app.isReady()) return;
                if(!configStore.get('debugNotification')) return;
                new Notification({
                    'urgency': 'critical',
                    'body': uuid,
                    'title': 'Removed Client (UUID)',
                }).show();
                return;
            }
        }
    }

    setActive(client: Client) {
        this.activeClient = client;
        if (!app.isReady()) return;
        if(!configStore.get('debugNotification')) return;
        new Notification({
            'urgency': 'critical',
            'body': client.uuid,
            'title': 'New Active Client',
        }).show();
        
    }

    clientExistByUUID(uuid: string){
        let exists = false;
        for (let i=0;i<this.clients.length;i++){
            if (this.clients[i].uuid == uuid) exists = true;
        }
        return exists;
    }
}