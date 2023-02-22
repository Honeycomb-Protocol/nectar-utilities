import * as web3 from "@solana/web3.js";
import { getDependencies } from "./utils";
import {
  claimRewards,
  createProject,
  fetchAvailableNfts,
  fetchStakedNfts,
  fundRewards,
  LockType,
  stake,
  StakingProject,
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
    case "create-project":
      const createProjectRes = await createProject({
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

      console.log("Tx:", createProjectRes.response.signature);
      console.log(
        "StakingProject: ",
        createProjectRes.stakingProject.toString()
      );
      setDeployments({
        ...deployments,
        project: createProjectRes.stakingProject,
      });
      break;

    case "stake":
      const projectAccount = await Project.fromAccountAddress(
        mx.connection,
        project
      );
      const stakeStakingProject = await StakingProject.fromAccountAddress(
        mx.connection,
        new web3.PublicKey(deployments.project)
      );
      const availableNfts = await fetchAvailableNfts({
        metaplex: mx,
        project: projectAccount,
        stakingProject: stakeStakingProject,
        walletAddress: mx.identity().publicKey,
      });

      const stakeResponses = await stake({
        metaplex: mx,
        stakingProject: stakeStakingProject,
        nfts: [availableNfts[0]],
      });
      console.log("Responses:", stakeResponses);
      break;

    case "unstake":
      const stakingProjectAddress = new web3.PublicKey(deployments.project);
      const unstakeStakingProject = await StakingProject.fromAccountAddress(
        mx.connection,
        stakingProjectAddress
      );
      const stakedNfts = await fetchStakedNfts({
        metaplex: mx,
        stakingProjectAddress: stakingProjectAddress,
        walletAddress: mx.identity().publicKey,
      });

      const unstakeResponses = await unstake({
        metaplex: mx,
        stakingProject: unstakeStakingProject,
        nfts: [stakedNfts[0]],
      });
      console.log("Responses:", unstakeResponses);
      break;

    case "fund-rewards":
      const fundRewardsResponse = await fundRewards({
        metaplex: mx,
        project,
        stakingProject: new web3.PublicKey(deployments.project),
        amount: Number(args[0]) * 1000000000,
      });
      console.log("Tx:", fundRewardsResponse.response.signature);
      break;

    case "claim-rewards":
      const claimRewardsResponse = await claimRewards({
        metaplex: mx,
        project,
        stakingProject: new web3.PublicKey(deployments.project),
        nftMint: new web3.PublicKey(args[0]),
      });
      console.log("Tx:", claimRewardsResponse.response.signature);
      break;

    default:
      throw new Error("Invalid Staking program action");
  }
}
