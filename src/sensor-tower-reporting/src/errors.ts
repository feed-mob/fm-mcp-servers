export class CapturedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapturedError";
  }
}

export class SensorTowerApiError extends CapturedError {
  constructor(message: string) {
    super(message);
    this.name = "SensorTowerApiError";
  }
}

export class ConfigurationError extends CapturedError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
