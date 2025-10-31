declare module 'n8n-workflow' {
  export interface INodeProperties {
    displayName: string;
    name: string;
    type: string;
    default: unknown;
    required?: boolean;
    description?: string;
    placeholder?: string;
    typeOptions?: Record<string, unknown>;
    displayOptions?: Record<string, unknown>;
    options?: Array<{ name: string; value: string; description?: string; action?: string }>;
  }
  export interface INodeTypeDescription {
    displayName: string;
    name: string;
    icon?: string;
    group: string[];
    version: number;
    subtitle?: string;
    description?: string;
    defaults: { name: string };
    inputs: string[];
    outputs: string[];
    credentials?: Array<{ name: string; required: boolean }>;
    properties: INodeProperties[];
  }
  export interface INodeExecutionData { json: any }
  export interface IExecuteFunctions {
    getInputData(): INodeExecutionData[];
    getNodeParameter(name: string, itemIndex: number, fallback?: unknown): unknown;
    getCredentials(name: string): Promise<Record<string, unknown>>;
  }
  export interface INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  }

  export interface ICredentialType {
    name: string;
    displayName: string;
    properties: INodeProperties[];
  }
}


