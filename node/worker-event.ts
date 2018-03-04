export interface WorkerEvent {
  name: string;
  status?: EventStatus;
  data?: any;
}

export enum EventStatus {
  Error = 'ERROR',
  Success = 'SUCCESS',
}
