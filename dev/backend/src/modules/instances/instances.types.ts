export const INSTANCE_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type InstanceStatus = (typeof INSTANCE_STATUS)[keyof typeof INSTANCE_STATUS];

export type InstanceRecord = {
  id: string;
  instanceKey: string;
  status: InstanceStatus;
};
