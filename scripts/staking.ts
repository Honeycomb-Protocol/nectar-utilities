import * as web3 from "@solana/web3.js";
import { getDependencies } from "./utils";
import {
  LockType,
  NectarStaking,
  nectarStakingModule,
} from "../packages/hpl-nectar-staking";
import {
  Honeycomb,
  HoneycombProject,
  identityModule,
} from "@honeycomb-protocol/hive-control";

export default async function (
  action: string,
  network: "mainnet" | "devnet" = "devnet",
  ...args: string[]
) {
  const { connection, signer, deployments, setDeployments } = getDependencies(
    network,
    "staking"
  );

  const honeycomb = new Honeycomb(connection);
  honeycomb.use(
    await HoneycombProject.fromAddress(
      honeycomb.connection,
      new web3.PublicKey("7CKTHsJ3EZqChNf3XGt9ytdZXvSzDFWmrQJL3BCe4Ppw")
    )
  );
  honeycomb.use(identityModule(signer));
  // await honeycomb.identity().loadDelegateAuthority();

  if (action == "create-pool") {
    console.log("Project", honeycomb.project().address.toString());
    const nectarStaking = await NectarStaking.new(honeycomb, {
      args: {
        name: "Sol Patrol",
        rewardsPerDuration: 50 * 1000000000,
        rewardsDuration: 24 * 3600,
        maxRewardsDuration: null,
        minStakeDuration: null,
        cooldownDuration: null,
        resetStakeDuration: false,
        startTime: Date.now(),
        endTime: null,
        lockType: LockType.Freeze,
      },
      rewardMint: new web3.PublicKey(args[0]),
      collections: [new web3.PublicKey(args[1])],
      multipliers: [
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 3,
          },
          value: 1400,
        },
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 5,
          },
          value: 1800,
        },
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 10,
          },
          value: 2200,
        },
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 15,
          },
          value: 2400,
        },
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 25,
          },
          value: 2600,
        },
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 50,
          },
          value: 2800,
        },
        {
          multiplierType: {
            __kind: "NFTCount",
            minCount: 100,
          },
          value: 3000,
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
