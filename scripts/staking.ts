import * as web3 from "@solana/web3.js";
import { getDependencies } from "./utils";
import {
  claimRewards,
  createStakingPool,
  fetchAvailableNfts,
  fetchStakedNfts,
  fundRewards,
  LockType,
  stake,
  StakingPool,
  unstake,
} from "../packages/hpl-nectar-staking";
import { Project } from "@honeycomb-protocol/hive-control";

export default async function (
  action: string,
  network: "mainnet" | "devnet" = "devnet",
  ...args: string[]
) {
  const project = new web3.PublicKey(
    "5ms4asWXuigS4HjZAAUkPjPya9KFEvYiLXEswATwyr3s"
  );
  const { deployments, mx, setDeployments } = getDependencies(
    network,
    "staking"
  );
  console.log(deployments);
  switch (action) {
    case "create-pool":
      const createStakingPoolRes = await createStakingPool({
        metaplex: mx,
        project,
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

      console.log("Tx:", createStakingPoolRes.response.signature);
      console.log("StakingPool: ", createStakingPoolRes.stakingPool.toString());
      setDeployments({
        ...deployments,
        pool: createStakingPoolRes.stakingPool,
      });
      break;

    case "stake":
      const projectAccount = await Project.fromAccountAddress(
        mx.connection,
        project
      );
      const stakeStakingPool = await StakingPool.fromAccountAddress(
        mx.connection,
        new web3.PublicKey(deployments.pool)
      );
      const availableNfts = await fetchAvailableNfts({
        metaplex: mx,
        project: projectAccount,
        stakingPool: stakeStakingPool,
        walletAddress: mx.identity().publicKey,
      });

      const stakeResponses = await stake({
        metaplex: mx,
        stakingPool: stakeStakingPool,
        nfts: [availableNfts[0]],
      });
      console.log("Responses:", stakeResponses);
      break;

    case "unstake":
      const staking_poolAddress = new web3.PublicKey(deployments.pool);
      const unstakeStakingPool = await StakingPool.fromAccountAddress(
        mx.connection,
        staking_poolAddress
      );
      const stakedNfts = await fetchStakedNfts({
        metaplex: mx,
        staking_poolAddress: staking_poolAddress,
        walletAddress: mx.identity().publicKey,
      });

      const unstakeResponses = await unstake({
        metaplex: mx,
        stakingPool: unstakeStakingPool,
        nfts: [stakedNfts[0]],
      });
      console.log("Responses:", unstakeResponses);
      break;

    case "fund-rewards":
      const fundRewardsResponse = await fundRewards({
        metaplex: mx,
        project,
        stakingPool: new web3.PublicKey(deployments.pool),
        amount: Number(args[0]) * 1000000000,
      });
      console.log("Tx:", fundRewardsResponse.response.signature);
      break;

    case "claim-rewards":
      const claimRewardsResponse = await claimRewards({
        metaplex: mx,
        project,
        stakingPool: new web3.PublicKey(deployments.pool),
        nftMint: new web3.PublicKey(args[0]),
      });
      console.log("Tx:", claimRewardsResponse.response.signature);
      break;

    default:
      throw new Error("Invalid Staking program action");
  }
}
