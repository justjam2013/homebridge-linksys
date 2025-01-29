import {
  API,
  APIEvent,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
} from 'homebridge';
import { LinksysAPI } from './linksys/api.js';
import { LinksysConfig } from './linksys/models/config.js';
import { LinksysAccessory } from './accessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

export class LinksysPlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  private config: LinksysConfig;
  private readonly accessories: Array<PlatformAccessory> = [];
  private routerIP = 'http://192.168.1.1';
  private password = '';

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.api = api;
    this.config = config as LinksysConfig;

    // Need a config or plugin will not start
    if (!config) {
      return;
    }

    // Set up the config if options are not set
    this.routerIP = this.config.routerIP;
    this.password = this.config.password;

    if (!this.password) {
      this.log.error('Please add your router\'s password to the config.json.');
      return;
    }

    api.on(APIEvent.DID_FINISH_LAUNCHING, this.didFinishLaunching.bind(this));
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info(`Configuring accessory ${accessory.displayName}`);

    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log.info(`${accessory.displayName} identified!`);
    });

    const linksysAccessory = new LinksysAccessory(accessory, this.config, this.log, this.api.hap);

    const routerService = linksysAccessory.createService(this.api.hap.Service.WiFiRouter);
    routerService
      .getCharacteristic(this.api.hap.Characteristic.ManagedNetworkEnable)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
        callback(null, 1);
      });

    routerService
      .getCharacteristic(this.api.hap.Characteristic.RouterStatus)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
        callback(null, 0);
      });

    this.accessories.push(accessory);
  }

  async didFinishLaunching(): Promise<void> {
    let Accessory: typeof PlatformAccessory;

    const api = new LinksysAPI(this.routerIP, this.password);
    const validated = (await api.sendRequest('core/CheckAdminPassword')).result === 'OK';

    if (!validated) {
      this.log.error('Password to router is incorrect.');
    }
    const info = (await api.sendRequest('core/GetDeviceInfo')).output;
    const wifi = (await api.sendRequest('router/GetLANSettings')).output;
    const ssid = wifi.hostName;
    const uuid = this.api.hap.uuid.generate(info.serialNumber);
    const accessory = new Accessory(ssid, uuid);

    const accessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);
    if (accessoryInformation) {
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.Manufacturer, info.manufacturer);
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, info.modelNumber);
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.SerialNumber, info.serialNumber);
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, info.firmwareVersion);
    }

    if (!this.accessories.find((x: PlatformAccessory) => x.UUID === uuid)) {
      this.configureAccessory(accessory); // abusing the configureAccessory here
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}
