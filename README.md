# OpenMediaShare
A program built to manage playback[^2], and share playing media data to local running apps using a RestAPI and or Websockets[^1].

## Service Providers 
Service Proiders are anything that feeds media data into the program.
* [OpenMediaShare/OpenMediaShare-UserScripts](https://github.com/OpenMediaShare/OpenMediaShare-UserScripts)
  
## Plugins 
> [!CAUTION]
> **Only install plugins from developers you trust.**
> 
> All plugins run with full nodeJS and electron access, this means installing untrusted plugins can lead to your system being compromised!!!
> 
Plugins are javascript files containing code that runs at start up, shutdown, and on info updates.

List of trusted plugins 
* [WaterWolf5918/VibeLight](https://github.com/WaterWolf5918/OpenMediaShare-Plugins) - Software to controll home assistant based lighting from thumbnail colors.
* [WaterWolf5918/WatchRPC](https://github.com/WaterWolf5918/OpenMediaShare-Plugins) - DiscordRPC media share for any service.

[^1]: Websockets currently added but may be unstable.
[^2]: Playback controlls are provider depended.
### Developers
> [!TIP]
> Look at the [wiki](https://github.com/WaterWolf5918/OpenMediaShare/wiki/) for documentation on stuff like the protocol.
