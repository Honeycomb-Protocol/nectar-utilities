import { EarnedReward } from "./generated/types";

export interface OffchainParticipation {
  _id: string;
  wallet: string;
  mission: string;
  nft: string;
  endTime: string;
  isRecalled: boolean;
  rewards: EarnedReward[];
  updatedAt: string;
}
