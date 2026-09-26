export type ChainStatus = "DRAFT" | "READY";

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