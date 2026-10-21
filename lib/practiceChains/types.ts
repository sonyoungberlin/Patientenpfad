export type ChainStatus = "DRAFT" | "READY" | "DEACTIVATED";

export type PracticeCaseChainStep = {
  id: string;
  catalogEntryId: string;
};

export type PracticeCaseChainAnswer = {
  id: string;
  label: string;
  targetStepId?: string | null;
};

export type PracticeCaseChainTransition = {
  id: string;
  fromStepId: string;
  kind: "DIRECT" | "QUESTION";
  targetStepId?: string | null;
  question?: {
    prompt: string;
    answers: PracticeCaseChainAnswer[];
  };
};

export type PracticeCaseChainDefinition = {
  startStepId: string | null;
  steps: PracticeCaseChainStep[];
  transitions: PracticeCaseChainTransition[];
};

export type ChainValidationIssue = {
  path: string;
  message: string;
};

export type PracticeCaseChainRecord = {
  id: string;
  practice_id: string;
  name: string;
  status: ChainStatus;
  version: number;
  source_chain_id: string | null;
  definition: PracticeCaseChainDefinition;
  created_at: Date;
  updated_at: Date;
};

export type PracticeCaseChainEntryApproval = {
  id: string;
  practice_id: string;
  chain_id: string;
  step_id: string;
  created_at: Date;
};

export type PracticeCaseChainConnectionApproval = {
  id: string;
  practice_id: string;
  source_chain_id: string;
  source_step_id: string;
  source_exit_id: string;
  target_chain_id: string;
  target_step_id: string;
  selection_version: number;
  created_at: Date;
};