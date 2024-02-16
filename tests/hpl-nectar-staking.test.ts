import base58 from "bs58";
import keccak from "keccak";
import {
  HplCurrency,
  PermissionedCurrencyKind,
} from "@honeycomb-protocol/currency-manager";
import {
  HPL_HIVE_CONTROL_PROGRAM,
  Honeycomb,
  HoneycombProject,
  Operation,
  VAULT,
  createLookupTable,
  lutModule,
} from "@honeycomb-protocol/hive-control";
import {
  GuildRole,
  PROGRAM_ID as HPL_CHARACTER_MANAGER_PROGRAM,
} from "@honeycomb-protocol/character-manager";
import * as web3 from "@solana/web3.js";
import {
  HPL_NECTAR_STAKING_PROGRAM,
  LockType,
  createAddMultiplierInstruction,
  createCreateStakingPoolInstruction,
  createInitMultipliersInstruction,
  createStakeInstruction,
  createUnstakeInstruction,
  createUpdateStakingPoolInstruction,
} from "../packages/hpl-nectar-staking";
import getHoneycombs from "../scripts/prepare";

import createEdgeClient from "@honeycomb-protocol/edge-client";
import {
  CharacterModel,
  Character,
} from "@honeycomb-protocol/edge-client/client/generated";
import { Client, cacheExchange, fetchExchange } from "@urql/core";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";

jest.setTimeout(2000000);

export function keccak256Hash(buffers: Buffer[]): Buffer {
  // Create a Keccak-256 hash object
  const hash = keccak("keccak256");

  // Concatenate the buffers
  buffers.forEach((buffer) => {
    hash.update(buffer);
  });

  // Get the final hash as a Buffer
  const resultBuffer = hash.digest();

  // Convert the Buffer to an array of numbers
  const resultArray: number[] = [];
  for (let i = 0; i < resultBuffer.length; i++) {
    resultArray.push(resultBuffer.readUInt8(i));
  }

  return Buffer.from(resultArray);
}

describe("Nectar Staking", () => {
  const collection: web3.PublicKey = new web3.PublicKey(
    "2M6dcz7wa7S5jaEZ1deTqQTKXfy59g3NDmnmbVw5kWsH"
  );
  const merkleTree: web3.PublicKey = new web3.PublicKey(
    "2fvvnVih4qVSYFemMgjN8xkHwFWJKJ2P1HaYosA27cUx"
  );
  const projectAddress: web3.PublicKey = new web3.PublicKey(
    "7s8tzjfqQvXjH6wGCGjmYVZAUaZAiSRxc8anVTQv5ubx"
  );
  const characterModelAddress: web3.PublicKey = new web3.PublicKey(
    "9HuxvNvciQ628s5ri1VYVPgs4TR9nReh1bwroaoMvujz"
  );
  let currencyAddress: web3.PublicKey;

  const client = createEdgeClient(
    new Client({
      url: "http://localhost:4000",
      exchanges: [cacheExchange, fetchExchange],
    })
  );

  let adminHC: Honeycomb;
  let userHC: Honeycomb;

  let stakingPoolAddress: web3.PublicKey;
  let universalLutAddress: web3.PublicKey;

  let characterModel: CharacterModel;
  let currency: HplCurrency;
  let universalLut: web3.AddressLookupTableAccount;
  let character: Character;

  beforeAll(async () => {
    // ============ HONEYCOMB ============

    const temp = getHoneycombs();
    adminHC = temp.adminHC;
    userHC = temp.userHC;

    adminHC.use(
      lutModule(async (accounts) => {
        throw new Error("Should not be called");
      })
    );

    userHC.use(
      lutModule(async (accounts) => {
        throw new Error("Should not be called");
      })
    );

    console.log(
      "Admin",
      adminHC.identity().address.toString(),
      "User",
      userHC.identity().address.toString()
    );

    // ============ HONEYCOMB END ============

    // ============ LOAD HIVE CONTROL PROJECT ============

    adminHC.use(await HoneycombProject.fromAddress(adminHC, projectAddress));
    userHC.use(await HoneycombProject.fromAddress(userHC, projectAddress));

    // ============ LOAD HIVE CONTROL PROJECT END ============

    // ============ LOAD CHARACTER MODEL ============

    characterModel = await client
      .findCharacterModels({
        ids: [characterModelAddress.toString()],
      })
      .then((res) => res.characterModel[0]);

    // ============ LOAD CHARACTER MODEL END ============

    // ============ LOAD CURRENCY SETUP ============

    // Create Currency

    if (!currencyAddress) {
      currency = await HplCurrency.new(adminHC, {
        name: "BAIL",
        symbol: "BAIL",
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri: "https://arweave.net/1VxSzPEOwYlTo3lU5XSQWj-9Ldt3dB68cynDDjzeF-c",
      });
      currencyAddress = currency.address;
    } else {
      currency = await HplCurrency.fromAddress(adminHC, currencyAddress);
    }

    console.log("Currency", currencyAddress.toString());

    adminHC.use(currency);
    userHC.use(await HplCurrency.fromAddress(userHC, currencyAddress));

    await adminHC
      .currency()
      .newHolderAccount(userHC.identity().address)
      .then((hA) => hA.mint(10_000 * 1_000_000_000));

    // ============ LOAD CURRENCY SETUP END ============
  });

  it("Load/Create Staking Pool", async () => {
    if (!stakingPoolAddress) {
      const key = web3.Keypair.generate().publicKey;
      [stakingPoolAddress] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("staking_pool"),
          projectAddress.toBuffer(),
          key.toBuffer(),
        ],
        HPL_NECTAR_STAKING_PROGRAM
      );

      let [multipliersAddress] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("multipliers"), stakingPoolAddress.toBuffer()],
        HPL_NECTAR_STAKING_PROGRAM
      );

      const createStakePoolIx = createCreateStakingPoolInstruction(
        {
          key,
          stakingPool: stakingPoolAddress,
          currency: currencyAddress,
          project: projectAddress,
          delegateAuthority: HPL_NECTAR_STAKING_PROGRAM,
          authority: adminHC.identity().address,
          payer: adminHC.identity().address,
          vault: VAULT,
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          clockSysvar: web3.SYSVAR_CLOCK_PUBKEY,
          rentSysvar: web3.SYSVAR_RENT_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          args: {
            name: "Staking3.0",
            rewardsPerDuration: 1 * 1_000_000_000,
            rewardsDuration: 1,
            maxRewardsDuration: null,
            minStakeDuration: null,
            cooldownDuration: null,
            resetStakeDuration: false,
            startTime: Date.now(),
            endTime: null,
            lockType: LockType.Freeze,
          },
        }
      );

      const updateStakePoolIx = createUpdateStakingPoolInstruction(
        {
          project: projectAddress,
          stakingPool: stakingPoolAddress,
          currency: currencyAddress,
          collection,
          creator: HPL_NECTAR_STAKING_PROGRAM,
          merkleTree,
          delegateAuthority: HPL_NECTAR_STAKING_PROGRAM,
          authority: adminHC.identity().address,
          payer: adminHC.identity().address,
          vault: VAULT,
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          rent: web3.SYSVAR_RENT_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          args: {
            name: null,
            rewardsPerDuration: null,
            rewardsDuration: null,
            maxRewardsDuration: null,
            minStakeDuration: null,
            cooldownDuration: null,
            resetStakeDuration: null,
            startTime: null,
            endTime: null,
          },
        }
      );

      const initMultiplierIx = createInitMultipliersInstruction(
        {
          project: projectAddress,
          stakingPool: stakingPoolAddress,
          multipliers: multipliersAddress,
          delegateAuthority: HPL_NECTAR_STAKING_PROGRAM,
          authority: adminHC.identity().address,
          payer: adminHC.identity().address,
          vault: VAULT,
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          args: {
            decimals: 3,
          },
        }
      );

      const createAddMultiplierIx = createAddMultiplierInstruction(
        {
          project: projectAddress,
          stakingPool: stakingPoolAddress,
          multipliers: multipliersAddress,
          delegateAuthority: HPL_NECTAR_STAKING_PROGRAM,
          authority: adminHC.identity().address,
          payer: adminHC.identity().address,
          vault: VAULT,
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          rentSysvar: web3.SYSVAR_RENT_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          args: {
            multiplierType: {
              __kind: "NFTCount",
              minCount: 3,
            },
            value: 1400,
          },
        }
      );

      const operation = new Operation(adminHC, [
        createStakePoolIx,
        updateStakePoolIx,
        initMultiplierIx,
        createAddMultiplierIx,
      ]);

      await operation.send();
    }
    console.log("Staking", stakingPoolAddress.toString());

    // universalLut = (await getOrFetchLoockupTable(userHC.connection, universalLutAddress))!;
  });

  it("Stake Character", async () => {
    // Fetch character to stake
    await client
      .findCharacters({
        trees: characterModel.merkle_trees.merkle_trees,
        includeProof: true,
      })
      .then((res) => (character = res.character[0]));
    console.dir(character, { depth: null });

    const wallet = userHC.identity().address;

    const [staker] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("staker"), wallet.toBuffer(), stakingPoolAddress.toBuffer()],
      HPL_NECTAR_STAKING_PROGRAM
    );

    const sourceHash = keccak256Hash([
      Buffer.from("Wrapped"),
      Buffer.from(base58.decode(character.source.params.mint)),
      Buffer.from(
        keccak256Hash([
          Buffer.from(character.source.params.criteria.kind),
          Buffer.from(base58.decode(character.source.params.criteria.params)),
        ])
      ),
      Buffer.from(
        keccak256Hash([
          Buffer.from(character.source.params.is_compressed ? [1] : [0]),
        ])
      ),
    ]);

    const computeBudgetIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const stakeIx = createStakeInstruction(
      {
        project: projectAddress,
        characterModel: characterModelAddress,
        merkleTree: new web3.PublicKey(
          characterModel.merkle_trees.merkle_trees[
            characterModel.merkle_trees.active
          ]
        ),
        stakingPool: stakingPoolAddress,
        staker,
        wallet,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        characterManager: HPL_CHARACTER_MANAGER_PROGRAM,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        anchorRemainingAccounts: character.proof!.proof.map((pubkey) => ({
          pubkey: new web3.PublicKey(pubkey),
          isSigner: false,
          isWritable: false,
        })),
      },
      {
        args: {
          root: Array.from(base58.decode(character.proof!.root)),
          leafIdx: Number(character.leaf_idx),
          sourceHash: Array.from(sourceHash),
          usedBy: { __kind: "None" },
        },
      }
    );

    const operation = new Operation(userHC, [computeBudgetIx, stakeIx]);
    await operation.send();

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Refetch chara
    await client
      .findCharacters({
        ids: [character.id],
        includeProof: true,
      })
      .then((res) => (character = res.character[0]));
  });

  it("Unstake Character", async () => {
    const wallet = userHC.identity().address;

    const [staker] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("staker"), wallet.toBuffer(), stakingPoolAddress.toBuffer()],
      HPL_NECTAR_STAKING_PROGRAM
    );

    const sourceHash = keccak256Hash([
      Buffer.from("Wrapped"),
      Buffer.from(base58.decode(character.source.params.mint)),
      Buffer.from(
        keccak256Hash([
          Buffer.from(character.source.params.criteria.kind),
          Buffer.from(base58.decode(character.source.params.criteria.params)),
        ])
      ),
      Buffer.from(
        keccak256Hash([
          Buffer.from(character.source.params.is_compressed ? [1] : [0]),
        ])
      ),
    ]);

    const computeBudgetIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });

    const unstakeIx = createUnstakeInstruction(
      {
        project: projectAddress,
        characterModel: characterModelAddress,
        merkleTree: new web3.PublicKey(
          characterModel.merkle_trees.merkle_trees[
            characterModel.merkle_trees.active
          ]
        ),
        stakingPool: stakingPoolAddress,
        staker,
        wallet,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        characterManager: HPL_CHARACTER_MANAGER_PROGRAM,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        anchorRemainingAccounts: character.proof!.proof.map((pubkey) => ({
          pubkey: new web3.PublicKey(pubkey),
          isSigner: false,
          isWritable: false,
        })),
      },
      {
        args: {
          root: Array.from(base58.decode(character.proof!.root)),
          leafIdx: Number(character.leaf_idx),
          sourceHash: Array.from(sourceHash),
          usedBy: !character.usedBy
            ? { __kind: "None" }
            : character.usedBy.params?.__typename === "UsedByStaking"
            ? {
                __kind: "Staking",
                pool: new web3.PublicKey(character.usedBy.params.pool),
                staker: new web3.PublicKey(character.usedBy.params.staker),
                stakedAt: character.usedBy.params.stakedAt,
                claimedAt: character.usedBy.params.claimedAt,
              }
            : character.usedBy.params?.__typename === "UsedByMission"
            ? {
                __kind: "Mission",
                id: new web3.PublicKey(character.usedBy.params.id),
                rewards: character.usedBy.params.rewards.map((reward) => ({
                  delta: reward.delta,
                  rewardIdx: reward.rewardIdx,
                })),
                endTime: character.usedBy.params.endTime,
                rewardsCollected: character.usedBy.params.rewardsCollected,
              }
            : character.usedBy.params?.__typename === "UsedByGuild"
            ? {
                __kind: "Guild",
                id: new web3.PublicKey(character.usedBy.params.id),
                order: character.usedBy.params.order,
                role:
                  character.usedBy.params.role.kind == "Chief"
                    ? GuildRole.Chief
                    : GuildRole.Member,
              }
            : { __kind: "None" },
        },
      }
    );

    const operation = new Operation(userHC, [computeBudgetIx, unstakeIx]);
    await operation.send();

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Refetch chara
    await client
      .findCharacters({
        ids: [character.id],
        includeProof: true,
      })
      .then((res) => (character = res.character[0]));
  });
});
