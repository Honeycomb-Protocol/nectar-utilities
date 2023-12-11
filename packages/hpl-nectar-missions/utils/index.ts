import { PublicKey } from "@solana/web3.js";
import { Participation } from "../generated";
import { OffchainParticipation } from "../types";

export * from "./merkleTree";
export * from "./lookupTables";
export * from "./NectarMissionsPdaClient";
export * from "./NectarMissionsCreateClient";
export * from "./NectarMissionsFetchClient";

export function removeDuplicateFromArrayOf<T = any, C = any>(
  array: T[],
  uniqueField: string | ((obj: T) => C)
) {
  return array.filter(
    (x, i) =>
      i ===
      array.findIndex((y) => {
        if (typeof uniqueField === "string") {
          return x[uniqueField] === y[uniqueField];
        } else {
          return uniqueField(x) === uniqueField(y);
        }
      })
  );
}

export const offchainToSolitaParticipation = (
  participation: OffchainParticipation
): Participation =>
  Participation.fromArgs({
    bump: 0,
    wallet: new PublicKey(participation.wallet),
    mission: new PublicKey(participation.mission),
    instrument: {
      __kind: participation.instrument.__kind,
      fields: [new PublicKey(participation.instrument.address)],
    },
    endTime: new Date(participation.endTime).getTime() / 1000,
    isRecalled: participation.isRecalled,
    rewards: participation.rewards.map((reward) => ({
      ...reward,
      rewardType: {
        ...reward.rewardType,
        address:
          reward.rewardType.__kind == "Currency" &&
          new PublicKey(reward.rewardType.address),
      },
    })),
  });
