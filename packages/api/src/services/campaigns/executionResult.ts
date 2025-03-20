export enum ExecutionResultEnum {
  Continue = 'CONTINUE',
  Stop = 'STOP',
  Error = 'ERROR',
  Reschedule = 'RESCHEDULE'
}

/**
 * Returned by a subclass of AbstractNodeExecutor in the execute function to
 * let the CampaignNodeEvaluator whether to proceed with campaign execution.
 */
export default class ExecutionResult {
  constructor(
    public readonly type: ExecutionResultEnum,
    public readonly payload?: any
  ) { }
}
