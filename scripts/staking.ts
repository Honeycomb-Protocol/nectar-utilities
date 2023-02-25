import * as web3 from "@solana/web3.js";
import { getDependencies } from "./utils";
import {
  claimRewards,
  createStakingPool,
  fetchAvailableNfts,
  fetchStakedNfts,
  fundRewards,
  LockType,
  NectarStaking,
  nectarStakingModule,
  stake,
  StakingPool,
  unstake,
} from "../packages/hpl-nectar-staking";
import {
  Honeycomb,
  identityModule,
  Project,
} from "@honeycomb-protocol/hive-control";

export default async function (
  action: string,
  network: "mainnet" | "devnet" = "devnet",
  ...args: string[]
) {
  const { connection, mx, signer, deployments, setDeployments } =
    getDependencies(network, "staking");

  const honeycomb = await Honeycomb.fromAddress(
    connection,
    new web3.PublicKey("HEHH65goNqxcWpxDpgPqKwernLawqbQJ7L9aocNkm2YT")
  );
  honeycomb.use(identityModule(signer));
  await honeycomb.identity().loadDelegateAuthority();

  if (action == "create-pool") {
    const nectarStaking = await NectarStaking.new(honeycomb, {
      args: {
        name: "Test",
        rewardsPerDuration: 1000000000,
        rewardsDuration: 1,
        maxRewardsDuration: 20,
        minStakeDuration: 60 * 1,
        cooldownDuration: 60 * 2,
        resetStakeDuration: false,
        startTime: Date.now() * 1000,
        endTime: Date.now() * 1000 + 3600 * 24,
        lockType: LockType.Freeze,
      },
      rewardMint: new web3.PublicKey(args[0]),
      collections: [new web3.PublicKey(args[1])],
      multipliers: [
        {
          multiplierType: {
            __kind: "StakeDuration",
            minDuration: 60 * 2,
          },
          value: 10000,
        },
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 1,
          },
          value: 100000,
        },
      ],
      multipliersDecimals: 3,
    });

    console.log("StakingPool: ", nectarStaking.poolAddress.toString());
    setDeployments({
      ...deployments,
      pool: nectarStaking.poolAddress,
    });
  } else {
    honeycomb.use(
      await nectarStakingModule(honeycomb, new web3.PublicKey(deployments.pool))
    );

    switch (action) {
      case "stake":
        const availableNfts = await honeycomb.staking().fetch().availableNfts();
        const stakeResponses = await honeycomb
          .staking()
          .stake(availableNfts[0]);
        console.log("Responses:", stakeResponses);
        break;

      case "unstake":
        const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
        const unstakeResponses = await honeycomb
          .staking()
          .unstake(stakedNfts[0]);
        console.log("Responses:", unstakeResponses);
        break;

      case "fund-rewards":
        const fundRewardsResponse = await honeycomb
          .staking()
          .fundRewards(Number(args[0]) * 1000000000);
        console.log("Response:", fundRewardsResponse);
        break;

      case "claim-rewards":
        const claimStakedNfts = await honeycomb.staking().fetch().stakedNfts();
        const claimRewardsResponses = await honeycomb
          .staking()
          .claim(claimStakedNfts[0]);
        console.log("Responses:", claimRewardsResponses);
        break;

      default:
        throw new Error("Invalid Staking program action");
    }
  }
}
