import type { INodeProperties } from 'n8n-workflow';

export class SensorTowerApi {
  name = 'sensorTowerApi';
  displayName = 'Sensor Tower API';
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.sensortower.com',
      description: 'Base URL for Sensor Tower API',
      required: true,
    },
    {
      displayName: 'Auth Token (AUTH_TOKEN)',
      name: 'authToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];
}


