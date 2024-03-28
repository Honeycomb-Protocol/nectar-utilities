import * as web3 from "@solana/web3.js";
import { 
    Metaplex,
    keypairIdentity,
} from "@metaplex-foundation/js";
import { bignum } from "@metaplex-foundation/beet";
import {
    PROGRAM_ID as BUBBLEGUM_PROGRAM_ID
} from "@metaplex-foundation/mpl-bubblegum";
import { Client, cacheExchange, fetchExchange } from "@urql/core";
import createEdgeClient, { Proof } from "@honeycomb-protocol/edge-client";
import {
    Global,
    HPL_HIVE_CONTROL_PROGRAM as HPL_HIVE_CONTROL_PROGRAM_ID,
    Honeycomb,
    HoneycombProject,
    METADATA_PROGRAM_ID,
    Operation,
    // ProfileDataType,
    VAULT,
    createCreateNewProfilesTreeInstruction,
    createCreateNewUserTreeInstruction,
    createInitGlobalInstruction,
    createNewProfileInstruction,
    createNewUserInstruction,
    // createCreateProfileInstruction,
    // createInitializeUserInstruction,
} from "@honeycomb-protocol/hive-control";
import {
    PROGRAM_ID as CHARACTER_MANAGER_PROGRAM_ID,
    Asset,
    CharacterModel,
    HplCharacter,
    createNewCharacterModelInstruction,
    createCreateNewCharactersTreeInstruction,
    fetchHeliusAssets,
    fetchAssetProof,
    createDepositCnftInstruction,
    createWrapCharacterInstruction,
    AssetProof,
} from "@honeycomb-protocol/character-manager";
import {
    PROGRAM_ID as HPL_NECTAR_MISSIONS_PROGRAM_ID, 
    createCollectRewardsInstruction, 
    createCreateMissionInstruction,
    createParticipateInstruction,
    createRecallInstruction,
    createUpdateMissionPoolInstruction,
} from "../packages/hpl-nectar-missions";
import {
    createCreateMissionPoolInstruction,
} from "../packages/hpl-nectar-missions";
import getHoneycombs from "../scripts/prepare";
import {
    createNewTree,
    mintOneCNFT,
} from "./helpers";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, ValidDepthSizePair, getConcurrentMerkleTreeAccountSize } from "@solana/spl-account-compression";
import {
    HPL_CURRENCY_MANAGER_PROGRAM as HPL_CURRENCY_MANAGER_PROGRAM_ID,
    HplCurrency,
    createCreateCurrencyInstruction,
} from "@honeycomb-protocol/currency-manager";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const client = createEdgeClient(
    new Client({
      url: "http://localhost:4000",
      exchanges: [cacheExchange, fetchExchange],
    }) as any
);

jest.setTimeout(300000);

describe("Nectar Missions Tests", () => {
    const numCnfts = 0;
    const numCharacters = 0;

    let admin: web3.Keypair; 
    let adminHC: Honeycomb;
    let delegate: web3.Keypair;
    let delegateHC: Honeycomb;
    let user: web3.Keypair;
    let userHC: Honeycomb;
    let metaplex: Metaplex;
    
    let globalPubkey: web3.PublicKey;
    let project: web3.PublicKey;
    let collection: web3.PublicKey;
    let merkleTree: web3.PublicKey;
    let characterModelAddress: web3.PublicKey;
    let missionPool: web3.PublicKey;
    let characterModel: CharacterModel;
    let activeCharactersTree: web3.PublicKey;
    let activeUsersTree: web3.PublicKey;
    let activeProfilesTree: web3.PublicKey;
    let wrappedCharacterNfts: Asset[] = [];
    let characters: HplCharacter[] = [];

    let hiveControlUser: {
        id: number;
        info: {
          username: string;
          name: string;
          bio: string;
          pfp: string;
        };
        wallets: {
          shadow: web3.PublicKey;
          wallets: web3.PublicKey[];
        };
        leafIndex: number;
        merkleTree: web3.PublicKey;
        proof: () => Promise<Proof>;
    };
    let hiveControlUserProfile: {
        id: number;
        project: web3.PublicKey;
        userId: bignum;
        identity: string;
        info: {
          name: string | null;
          bio: string | null;
          pfp: string | null;
        };
        platformData: {
          custom: Map<string, string[]>;
          xp: bignum;
          achievements: number[];
        };
        customData: Map<string, string[]>;
        leafIndex: number;
        merkleTree: web3.PublicKey;
        proof: () => Promise<Proof>;
    };

    let currency: web3.PublicKey;
    let currencyMint: web3.PublicKey;

    let mission: web3.PublicKey;

    const missionDuration = 5; // 5 seconds

    it("Prepare", async () => {
        const setupData = getHoneycombs();

        admin = setupData.admin;
        adminHC = setupData.adminHC;
        delegate = setupData.delegate;
        delegateHC = setupData.delegateHC;
        user = setupData.user;
        userHC = setupData.userHC;

        metaplex = new Metaplex(adminHC.connection);
        metaplex.use(keypairIdentity(setupData.admin));

        console.log("Admin: ", admin.publicKey.toBase58());
        console.log("User: ", user.publicKey.toBase58());
    });

    it("Setup", async () => {
        if(!collection) { 
            collection = await metaplex
                .nfts()
                .create({
                    name: "Collectionest Collection",
                    symbol: "COLCOL",
                    sellerFeeBasisPoints: 0,
                    uri: "https://api.eboy.dev/",
                    isCollection: true,
                    collectionIsSized: true,
                })
                .then((x) => x.nft.mint.address);
        }

        // CNFT minting
        let treeKeypair: web3.Keypair = web3.Keypair.generate();
        for (let i = 0; i < numCnfts; i++) {
            if(i === 0) {
                treeKeypair = (await createNewTree(adminHC))[0];
                merkleTree = treeKeypair.publicKey;
            }

            await mintOneCNFT(adminHC, {
                dropWalletKey: userHC.identity().address.toBase58(),
                name: `CNFT ${i}`,
                symbol: `CNFT${i}`,
                uri: "https://api.eboy.dev/",
                merkleTree: treeKeypair.publicKey,
                collectionMint: collection,
            });
        }

        if(!project) {
            const name = "Test project";
            adminHC.use(
                await HoneycombProject.new(adminHC, {
                    name,
                    // expectedMintAddresses: 0,
                    // profileDataConfigs: [
                    //     { label: "nectar_missions_xp", dataType: ProfileDataType.SingleValue }
                    // ],
                })
            );
            console.log("Project: ", adminHC.project().address.toBase58());
            project = adminHC.project().address;
        }
    });

    it.skip("Create/load character model", async () => {
        if (!characterModelAddress) {
            const key = web3.Keypair.generate().publicKey;
            [characterModelAddress] = web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("character_model"),
                    project.toBuffer(),
                    key.toBuffer(),
                ],
                CHARACTER_MANAGER_PROGRAM_ID
            );
    
            let operation = new Operation(adminHC, [
                createNewCharacterModelInstruction(
                {
                    project,
                    key,
                    characterModel: characterModelAddress,
                    authority: adminHC.identity().address,
                    payer: adminHC.identity().address,
                    vault: VAULT,
                    systemProgram: web3.SystemProgram.programId,
                    hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                    clock: web3.SYSVAR_CLOCK_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                },
                {
                    args: {
                    config: {
                        __kind: "Wrapped",
                        fields: [
                        [
                            {
                            __kind: "Collection",
                            fields: [collection],
                            },
                            ...(merkleTree
                            ? [
                                {
                                    __kind: "MerkleTree" as "MerkleTree",
                                    fields: [merkleTree] as [web3.PublicKey],
                                },
                                ]
                            : []),
                        ],
                        ],
                    },
                    attributes: {
                        __kind: "Null",
                    },
                    },
                }
                ),
            ]);
    
            await operation.send({ commitment: "processed" });
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));

        characterModel = await CharacterModel.fromAccountAddress(
            adminHC.connection,
            characterModelAddress,
            "processed"
        );

        console.log("Character Model", JSON.stringify(characterModel));
        console.log("Character model address:", characterModelAddress);
    });

    it.skip("Create/load character model's merkle tree", async () => {
        const trees = characterModel.merkleTrees.merkleTrees;
    
        if (Array.isArray(trees)) {
          const activeTreeIndex = characterModel.merkleTrees.active;
          activeCharactersTree = trees[activeTreeIndex];
        }
    
        if (!activeCharactersTree) {
            const merkleTreeKeypair = web3.Keypair.generate();
    
            const depthSizePair: ValidDepthSizePair = {
                maxDepth: 3,
                maxBufferSize: 8,
            };
            const space = getConcurrentMerkleTreeAccountSize(
                depthSizePair.maxDepth,
                depthSizePair.maxBufferSize,
                3
            );
            const lamports =
                await adminHC.connection.getMinimumBalanceForRentExemption(space);
            console.log("SOL", lamports / 1e9);
    
          const operation = new Operation(
            adminHC,
            [
              web3.SystemProgram.createAccount({
                newAccountPubkey: merkleTreeKeypair.publicKey,
                fromPubkey: adminHC.identity().address,
                space: space,
                lamports,
                programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
              }),
              createCreateNewCharactersTreeInstruction(
                {
                  project: characterModel.project,
                  characterModel: characterModelAddress,
                  merkleTree: merkleTreeKeypair.publicKey,
                  authority: adminHC.identity().address,
                  payer: adminHC.identity().address,
                  vault: VAULT,
                  systemProgram: web3.SystemProgram.programId,
                  compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                  logWrapper: SPL_NOOP_PROGRAM_ID,
                  clock: web3.SYSVAR_CLOCK_PUBKEY,
                  rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                  instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                },
                {
                  args: {
                    maxDepth: depthSizePair.maxDepth,
                    maxBufferSize: depthSizePair.maxBufferSize,
                  },
                }
              ),
            ],
            [merkleTreeKeypair]
          );
    
            const [{ signature }] = await operation.send();
    
            console.log("Created Characters Tree:", signature);
    
            activeCharactersTree = merkleTreeKeypair.publicKey;
        }
    
        console.log(`Character model's merkle tree: ${activeCharactersTree.toString()}`);
    });

    it.skip("Wrap cNFT(s) to character", async () => {
        const project = characterModel.project;
        const wallet = userHC.identity().address;

        const nfts = await fetchHeliusAssets(userHC.rpcEndpoint, {
                walletAddress: wallet,
                collectionAddress: collection,
            }).then((nfts) => nfts.filter((n) => !n.frozen && n.isCompressed));

        if (!nfts.length) throw new Error("No Nfts to wrap");

        for(let i = 0; i < numCharacters; i++) {
            const nftToWrap = nfts[i];

            console.log(nftToWrap);

            if (!nftToWrap.compression) continue;

            const [assetCustody] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("asset_custody"), nftToWrap.mint.toBuffer()],
                CHARACTER_MANAGER_PROGRAM_ID
            );
            
            const [treeAuthority, _bump] = web3.PublicKey.findProgramAddressSync(
                [nftToWrap.compression.tree.toBuffer()],
                BUBBLEGUM_PROGRAM_ID
            );

            const proof =
                nftToWrap.compression.proof ||
                (await fetchAssetProof(userHC.rpcEndpoint, nftToWrap.mint));

            const operation = new Operation(userHC, [
                createDepositCnftInstruction(
                    {
                        project,
                        characterModel: characterModelAddress,
                        assetCustody,
                        assetId: nftToWrap.mint,
                        treeAuthority,
                        merkleTree: nftToWrap.compression.tree,
                        wallet,
                        vault: VAULT,
                        systemProgram: web3.SystemProgram.programId,
                        hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                        bubblegum: BUBBLEGUM_PROGRAM_ID,
                        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                        logWrapper: SPL_NOOP_PROGRAM_ID,
                        clock: web3.SYSVAR_CLOCK_PUBKEY,
                        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                        anchorRemainingAccounts: proof.proof.map((p) => ({
                                pubkey: p,
                                isSigner: false,
                                isWritable: false,
                            })
                        ),
                    },
                    {
                        args: {
                            root: Array.from(proof.root.toBytes()),
                            dataHash: Array.from(nftToWrap.compression.dataHash.toBytes()),
                            creatorHash: Array.from(
                            nftToWrap.compression.creatorHash.toBytes()
                            ),
                            nonce: nftToWrap.compression.leafId,
                            index: nftToWrap.compression.leafId,
                        },
                    }
                ),
                createWrapCharacterInstruction(
                    {
                        project,
                        characterModel: characterModelAddress,
                        assetCustody,
                        merkleTree: activeCharactersTree,
                        wallet,
                        vault: VAULT,
                        systemProgram: web3.SystemProgram.programId,
                        hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                        logWrapper: SPL_NOOP_PROGRAM_ID,
                        clock: web3.SYSVAR_CLOCK_PUBKEY,
                        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                    }
                ),
            ]);
    
            await operation.send({ skipPreflight: true });
    
            await new Promise((resolve) => setTimeout(resolve, 10000));
    
            console.log("Wrapped CNFT:", JSON.stringify(nftToWrap));

            wrappedCharacterNfts.push(nftToWrap);
            const newCharacter: HplCharacter = await HplCharacter.fetchWithTreeAndLeaf(
                userHC.rpcEndpoint,
                activeCharactersTree,
                0
            );
    
            console.log("Character", JSON.stringify(newCharacter));
            characters.push(newCharacter);
        }
    });

    it.skip("Create mission pool", async () => {
        const name = "Test mission pool";
        const [mpPublicKey] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("mission_pool"),
                project.toBuffer(),
                Buffer.from(name)
            ],
            HPL_NECTAR_MISSIONS_PROGRAM_ID
        );

        const operation = new Operation(adminHC, 
            [
                createCreateMissionPoolInstruction(
                    {
                        project,
                        missionPool: mpPublicKey,
                        authority: admin.publicKey,
                        delegateAuthority: adminHC.identity().delegateAuthority()?.address || HPL_NECTAR_MISSIONS_PROGRAM_ID,
                        payer: admin.publicKey,
                        vault: VAULT,
                        systemProgram: web3.SystemProgram.programId,
                        hiveControl: new web3.PublicKey("Ha71K2v3q9wL3hDLbGx5mRnAXd6CdgzNx5GJHDbWvPRg"),
                        clockSysvar: web3.SYSVAR_CLOCK_PUBKEY,
                        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                    },
                    {
                        args: {
                            name,
                            factionsMerkleRoot: new Array(32).fill(0)
                        }
                    }
                )
            ],
        );

        await operation.send({ commitment: "processed" });

        console.log("Mission Pool:", mpPublicKey.toBase58());
        missionPool = mpPublicKey;
    });

    it.skip("Update the mission pool to allow the character model", async () => {
        const operation = new Operation(adminHC, [
            createUpdateMissionPoolInstruction(
                {
                    project,
                    missionPool,
                    characterModel: characterModelAddress,
                    authority: admin.publicKey,
                    payer: admin.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                    hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                    vault: VAULT,
                    delegateAuthority: adminHC.identity().delegateAuthority()?.address || HPL_NECTAR_MISSIONS_PROGRAM_ID,
                },
                {
                    args: {
                        factionsMerkleRoot: new Array(32).fill(0)
                    }
                }
            )
        ]);

        await operation.send({ commitment: "processed" });
    });

    it.skip("Create a currency", async () => {
        const currencyMintKeypair = web3.Keypair.generate();

        const [ metadataPublicKey ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                currencyMintKeypair.publicKey.toBuffer()
            ],
            METADATA_PROGRAM_ID
        );

        const [ currencyPublicKey ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("currency"),
                currencyMintKeypair.publicKey.toBuffer(),
            ],
            HPL_CURRENCY_MANAGER_PROGRAM_ID
        );

        const operation = new Operation(adminHC, [
                web3.ComputeBudgetProgram.setComputeUnitLimit(
                    {
                        units: 1_200_000
                    }
                ),
                createCreateCurrencyInstruction(
                    {
                        project,
                        currency: currencyPublicKey,
                        mint: currencyMintKeypair.publicKey,
                        metadata: metadataPublicKey,
                        delegateAuthority: adminHC.identity().delegateAuthority()?.address || HPL_CURRENCY_MANAGER_PROGRAM_ID,
                        authority: admin.publicKey,
                        payer: admin.publicKey,
                        vault: VAULT,
                        systemProgram: web3.SystemProgram.programId,
                        hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                        tokenMetadataProgram: METADATA_PROGRAM_ID,
                        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                        clockSysvar: web3.SYSVAR_CLOCK_PUBKEY,
                    },
                    {
                        args: {
                            name: "Test Currency",
                            symbol: "TSTCUR",
                            uri: "https://api.eboy.dev/",
                            decimals: 9,
                            kind: 0
                        }
                    }
                ),
            ],
            [ currencyMintKeypair ]
        );

        await operation.send({ commitment: "processed" });

        console.log("Currency:", currencyPublicKey.toBase58());
        console.log("Currency mint:", currencyMintKeypair.publicKey.toBase58());
        currency = currencyPublicKey;
        currencyMint = currencyMintKeypair.publicKey;

        adminHC.use(await HplCurrency.fromAddress(adminHC, currencyPublicKey, "processed"));
    });

    it.skip("Create a mission", async () => {
        const missionName = "Important mission";
        const [mPublicKey] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("mission"),
                missionPool.toBuffer(),
                Buffer.from(missionName)
            ],
            HPL_NECTAR_MISSIONS_PROGRAM_ID
        );

        const operation = new Operation(adminHC, [
            createCreateMissionInstruction(
                {
                    project,
                    missionPool,
                    mission: mPublicKey,
                    authority: admin.publicKey,
                    delegateAuthority: adminHC.identity().delegateAuthority()?.address || HPL_NECTAR_MISSIONS_PROGRAM_ID,
                    payer: admin.publicKey,
                    vault: VAULT,
                    systemProgram: web3.SystemProgram.programId,
                    hiveControl: new web3.PublicKey("Ha71K2v3q9wL3hDLbGx5mRnAXd6CdgzNx5GJHDbWvPRg"),
                    rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                },
                {
                    args: {
                        name: missionName,
                        minXp: 0,
                        cost: {
                            amount: 100,
                            address: currency
                        },
                        requirement: {
                            __kind: "Time",
                            duration: missionDuration
                        },
                        rewards: [
                            {
                                rewardType: {
                                    __kind: "Xp"
                                },
                                min: 50,
                                max: 100,
                            },
                            {
                                rewardType: {
                                    __kind: "Currency",
                                    address: currencyMint
                                },
                                min: 100,
                                max: 500,
                            }
                        ]
                    }
                }
            )
        ]);

        await operation.send({ commitment: "processed" });

        console.log("Mission:", mPublicKey.toBase58());
        mission = mPublicKey;
    });

    it.skip("Create holder account and mint", async () => {
        const holderAccount = await adminHC.currency().newHolderAccount(userHC.identity().address);

        await holderAccount.mint(1_000_000);
    });

    it("Create a global account", async () => {
        const env = "dev";
        const [ globalPK ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("global"),
                Buffer.from(env),
                HPL_HIVE_CONTROL_PROGRAM_ID.toBuffer()
            ],
            HPL_HIVE_CONTROL_PROGRAM_ID
        );

        const operation = new Operation(adminHC, [
            createInitGlobalInstruction(
                {
                    authority: adminHC.identity().address,
                    global: globalPubkey,
                    program: HPL_HIVE_CONTROL_PROGRAM_ID,
                    systemProgram: web3.SystemProgram.programId,
                    programData: new web3.PublicKey("542TkQQRG8dQhqfV4fytWZAQqB67ztV5XgADpfQhSRZQ"),
                },
                {
                    args: {
                        env,
                    }
                }
            )
        ]);

        await operation.send();

        globalPubkey = globalPK;
        console.log("Global:", globalPK.toBase58());
    });

    it("Create a user tree", async () => {
        // const global = await adminHC.global(undefined, true);
        const globalTwo = await Global.fromAccountAddress(
            adminHC.connection, 
            globalPubkey, 
            "processed"
        );
        console.log("Global:", globalTwo);
        // activeUsersTree = global.userTrees.merkleTrees[global.userTrees.active];

        // if (!activeUsersTree) {
        //     const merkleTreeKeypair = web3.Keypair.generate();
      
        //     const depthSizePair: ValidDepthSizePair = {
        //       maxDepth: 3,
        //       maxBufferSize: 8,
        //     };

        //     const space = getConcurrentMerkleTreeAccountSize(
        //       depthSizePair.maxDepth,
        //       depthSizePair.maxBufferSize,
        //       3
        //     );

        //     const lamports =
        //       await adminHC.connection.getMinimumBalanceForRentExemption(space);
      
        //     const operation = new Operation(
        //       adminHC,
        //       [
        //         web3.SystemProgram.createAccount({
        //           newAccountPubkey: merkleTreeKeypair.publicKey,
        //           fromPubkey: adminHC.identity().address,
        //           space: space,
        //           lamports,
        //           programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        //         }),
        //         createCreateNewUserTreeInstruction({
        //           global: adminHC.pda().hiveControl().global()[0],
        //           merkleTree: merkleTreeKeypair.publicKey,
        //           vault: adminHC.pda().hiveControl().vault()[0],
        //           payer: adminHC.identity().address,
        //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
        //           compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        //           logWrapper: SPL_NOOP_PROGRAM_ID,
        //           clock: web3.SYSVAR_CLOCK_PUBKEY,
        //         }),
        //       ],
        //       [merkleTreeKeypair]
        //     );
      
        //     const [{ signature }] = await operation.send();
      
        //     console.log("Created User Tree:", signature);
      
        //     activeUsersTree = merkleTreeKeypair.publicKey;
        // }

        // console.log(`User tree: ${activeUsersTree.toString()}`);
    });

    it.skip("Create a profile tree", async () => {
        const project = adminHC.project();
        activeProfilesTree = project.solita.profileTrees.merkleTrees[project.solita.profileTrees.active];

        if (!activeProfilesTree) {
            const merkleTreeKeypair = web3.Keypair.generate();
      
            const depthSizePair: ValidDepthSizePair = {
              maxDepth: 3,
              maxBufferSize: 8,
            };
            
            const space = getConcurrentMerkleTreeAccountSize(
              depthSizePair.maxDepth,
              depthSizePair.maxBufferSize,
              3
            );

            const lamports =
              await adminHC.connection.getMinimumBalanceForRentExemption(space);
      
            const operation = new Operation(
              adminHC,
              [
                web3.SystemProgram.createAccount({
                  newAccountPubkey: merkleTreeKeypair.publicKey,
                  fromPubkey: adminHC.identity().address,
                  space: space,
                  lamports,
                  programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                }),
                createCreateNewProfilesTreeInstruction(
                  {
                    project: project.address,
                    merkleTree: merkleTreeKeypair.publicKey,
                    vault: adminHC.pda().hiveControl().vault()[0],
                    payer: adminHC.identity().address,
                    rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                    logWrapper: SPL_NOOP_PROGRAM_ID,
                    clock: web3.SYSVAR_CLOCK_PUBKEY,
                    authority: adminHC.identity().address,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                    delegateAuthority: adminHC.programId,
                  },
                  {
                    args: {
                      maxDepth: depthSizePair.maxDepth,
                      maxBufferSize: depthSizePair.maxBufferSize,
                    },
                  }
                ),
              ],
              [merkleTreeKeypair]
            );
      
            const [{ signature }] = await operation.send();
      
            console.log("Created Profiles Tree:", signature);
      
            activeProfilesTree = merkleTreeKeypair.publicKey;
        }

        console.log(`Profile tree: ${activeProfilesTree.toString()}`);
    });

    it.skip("Create user", async () => {
        const info = {
            username: "BugsBunny",
            name: "Bugs Bunny",
            bio: "What's up Doc?",
            pfp: "https://www.thepromptmag.com/wp-content/uploads/2022/11/Screen-Shot-2022-11-26-at-4.54.44-PM.png",
        };
      
        const wallets = {
        shadow: userHC.identity().address,
        wallets: [userHC.identity().address],
        };
      
        const operation = new Operation(adminHC, [
            createNewUserInstruction(
                {
                    global: userHC.pda().hiveControl().global()[0],
                    merkleTree: activeUsersTree,
                    wallet: wallets.wallets[0],
                    authority: adminHC.identity().address,
                    shadowSigner: wallets.shadow,
                    vault: userHC.pda().hiveControl().vault()[0],
                    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                    logWrapper: SPL_NOOP_PROGRAM_ID,
                    clock: web3.SYSVAR_CLOCK_PUBKEY,
                    rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                },
                {
                    args: info,
                }
            ),
        ]);

        const [{ signature }] = await operation.send();

        console.log("Registered New User:", signature);
      
        const global = await adminHC.global(undefined, true);
      
        hiveControlUser = {
            id: global.totalUsers.toNumber() - 1,
            info,
            wallets,
            leafIndex: 0,
            merkleTree: activeUsersTree,
            proof: () =>
              client
                .fetchProofs({
                  leaves: [
                    {
                      tree: activeUsersTree.toString(),
                      index: "0",
                    },
                  ],
                })
                .then((x) => x.proof[0]!),
        };
    });

    it.skip("Create user profile", async () => {
        if (!user) throw new Error("User not created yet");

        const operation = new Operation(adminHC, [
            createNewProfileInstruction(
                {
                    project: adminHC.project().address,
                    merkleTree: activeProfilesTree,
                    authority: adminHC.identity().address,
                    vault: userHC.pda().hiveControl().vault()[0],
                    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                    logWrapper: SPL_NOOP_PROGRAM_ID,
                    clock: web3.SYSVAR_CLOCK_PUBKEY,
                    rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                },
                {
                    args: {
                        userId: hiveControlUser.id,
                        profileIdentity: null,
                        info: null,
                    },
                }
            ),
        ]);
        const [{ signature }] = await operation.send();
        console.log("Create new profile:", signature);

        hiveControlUserProfile = {
            id: 0,
            project: adminHC.project().address,
            userId: hiveControlUser.id,
            identity: "Main",
            info: {
                name: null,
                bio: null,
                pfp: null,
            },
            platformData: {
                custom: new Map(),
                xp: 0,
                achievements: [],
            },
            customData: new Map(),
            leafIndex: 0,
            merkleTree: activeProfilesTree,
            proof: () =>
                client
                .fetchProofs({
                    leaves: [
                    {
                        tree: activeProfilesTree.toString(),
                        index: "0",
                    },
                    ],
                })
                .then((x) => x.proof[0]!),
        };
    });

    it.skip("Participate in the mission", async () => {
        const tokenAccounts = await adminHC.connection.getTokenAccountsByOwner(
            userHC.identity().address,
            { mint: currencyMint }
        );

        const [ holderAccountPublicKey ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("holder_account"),
                userHC.identity().address.toBuffer(),
                currencyMint.toBuffer()
            ],
            HPL_CURRENCY_MANAGER_PROGRAM_ID
        );

        const proof: AssetProof = await fetchAssetProof(userHC.rpcEndpoint, wrappedCharacterNfts[0].mint);

        const proofSecond = await HplCharacter.fetchWithTreeAndLeaf(
            userHC.rpcEndpoint,
            activeCharactersTree,
            0
        );

        console.log("Proof:", JSON.stringify(proof));
        console.log("Proof second:", JSON.stringify(proofSecond));
        console.log("Source hash:", JSON.stringify(proofSecond.sourceHash));

        const operation = new Operation(userHC, [
            web3.ComputeBudgetProgram.setComputeUnitLimit(
                {
                    units: 1_200_000
                }
            ),
            // createParticipateInstruction(
            //     {
            //         project,
            //         missionPool,
            //         mission,
            //         characterModel: characterModelAddress,
            //         characterManager: CHARACTER_MANAGER_PROGRAM_ID,
            //         characterMerkleTree: activeCharactersTree,
            //         // Replace this with actual profile merkle tree
            //         profileMerkleTree: new web3.PublicKey(0),
            //         mint: currencyMint,
            //         currency,
            //         holderAccount: holderAccountPublicKey,
            //         tokenAccount: tokenAccounts.value[0].pubkey,
            //         wallet: userHC.identity().address,
            //         vault: VAULT,
            //         systemProgram: web3.SystemProgram.programId,
            //         compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            //         hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
            //         currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
            //         clock: web3.SYSVAR_CLOCK_PUBKEY,
            //         rentSysvar: web3.SYSVAR_RENT_PUBKEY,
            //         instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            //         logWrapper: SPL_NOOP_PROGRAM_ID,
            //         anchorRemainingAccounts: proof.proof.map((p) => ({
            //                 pubkey: p,
            //                 isSigner: false,
            //                 isWritable: false,
            //             })
            //         ),
            //     },
            //     {
            //         args: {
            //             characterRoot: Array.from(proof.root.toBytes()),
            //             characterLeafIdx: proofSecond.leafIdx,
            //             characterSourceHash: Array.from(proofSecond.sourceHash),

            //         }
            //     }
            // )
        ]);

        await operation.send({ skipPreflight: true });
    });

    it.skip("Collect rewards for participating in the mission", async () => {
        console.log("Waiting for mission to end...");
        await new Promise((resolve) => setTimeout(resolve, (missionDuration * 2) * 1000));

        console.log("Collecting rewards...");
        const tokenAccounts = await adminHC.connection.getTokenAccountsByOwner(
            userHC.identity().address,
            { mint: currencyMint }
        );

        const [ holderAccountPublicKey ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("holder_account"),
                userHC.identity().address.toBuffer(),
                currencyMint.toBuffer()
            ],
            HPL_CURRENCY_MANAGER_PROGRAM_ID
        );

        const proof: AssetProof = await fetchAssetProof(userHC.rpcEndpoint, wrappedCharacterNfts[0].mint);

        const proofSecond: HplCharacter = await HplCharacter.fetchWithTreeAndLeaf(
            userHC.rpcEndpoint,
            activeCharactersTree,
            0
        );

        console.log("Proof (collect rewards):", JSON.stringify(proof));
        console.log("Proof second (collect rewards):", JSON.stringify(proofSecond));
        console.log("Source hash (collect rewards):", JSON.stringify(proofSecond.sourceHash));

        if(proofSecond.usedBy.__kind === "Mission") {
            const operation = new Operation(userHC, [
                web3.ComputeBudgetProgram.setComputeUnitLimit(
                    {
                        units: 1_200_000
                    }
                ),
                // createCollectRewardsInstruction(
                //     {
                //         characterModel: characterModelAddress,
                //         project,
                //         missionPool,
                //         missionPoolDelegate: adminHC.identity().delegateAuthority()?.address || HPL_NECTAR_MISSIONS_PROGRAM_ID,
                //         mission,
                //         // profile: hiveControlUserProfile,
                //         mint: currencyMint,
                //         currency,
                //         characterManager: CHARACTER_MANAGER_PROGRAM_ID,
                //         holderAccount: holderAccountPublicKey,
                //         tokenAccount: tokenAccounts.value[0].pubkey,
                //         wallet: userHC.identity().address,
                //         vault: VAULT,
                //         characterMerkleTree: activeCharactersTree,
                //         // Replace this with actual profile merkle tree
                //         profileMerkleTree: new web3.PublicKey(0),
                //         systemProgram: web3.SystemProgram.programId,
                //         hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                //         currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
                //         compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                //         tokenProgram: TOKEN_PROGRAM_ID,
                //         rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                //         instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                //         logWrapper: SPL_NOOP_PROGRAM_ID,
                //         clock: web3.SYSVAR_CLOCK_PUBKEY,
                //         anchorRemainingAccounts: proof.proof.map((p) => ({
                //                 pubkey: p,
                //                 isSigner: false,
                //                 isWritable: false,
                //             })
                //         ),
                //     },
                //     {
                //         args: {
                //             characterRoot: Array.from(proof.root.toBytes()),
                //             characterLeafIdx: proofSecond.leafIdx,
                //             characterSourceHash: Array.from(proofSecond.sourceHash),
                //             characterUsedBy: {
                //                 __kind: "Mission",
                //                 endTime: proofSecond.usedBy.endTime,
                //                 id: proofSecond.usedBy.id,
                //                 rewards: proofSecond.usedBy.rewards,
                //                 rewardsCollected: proofSecond.usedBy.rewardsCollected,
                //             },
                //         },
                //     }
                // )
            ]);

            await operation.send({ skipPreflight: true });
        } else {
            throw new Error("Character is not used by a mission");
        }
    });

    it.skip("Recall character", async () => {
        console.log("Waiting before recalling character...");
        await new Promise((resolve) => setTimeout(resolve, (missionDuration * 2) * 1000));

        const proof: AssetProof = await fetchAssetProof(userHC.rpcEndpoint, wrappedCharacterNfts[0].mint);

        const proofSecond = await HplCharacter.fetchWithTreeAndLeaf(
            userHC.rpcEndpoint,
            activeCharactersTree,
            0
        );

        console.log("Proof (recall):", JSON.stringify(proof));
        console.log("Proof second (recall):", JSON.stringify(proofSecond));
        console.log("Source hash (recall):", JSON.stringify(proofSecond.sourceHash));

        if(proofSecond.usedBy.__kind === "Mission") {
            const operation = new Operation(userHC, [
                web3.ComputeBudgetProgram.setComputeUnitLimit(
                    {
                        units: 1_200_000
                    }
                ),
                createRecallInstruction(
                    {
                        characterModel: characterModelAddress,
                        project,
                        missionPool,
                        mission,
                        wallet: userHC.identity().address,
                        vault: VAULT,
                        merkleTree: activeCharactersTree,
                        systemProgram: web3.SystemProgram.programId,
                        hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                        characterManager: CHARACTER_MANAGER_PROGRAM_ID,
                        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                        clock: web3.SYSVAR_CLOCK_PUBKEY,
                        logWrapper: SPL_NOOP_PROGRAM_ID,
                        anchorRemainingAccounts: proof.proof.map((p) => ({
                                pubkey: p,
                                isSigner: false,
                                isWritable: false,
                            })
                        ),
                    },
                    {
                        args: {
                            root: Array.from(proof.root.toBytes()),
                            leafIdx: proofSecond.leafIdx,
                            sourceHash: Array.from(proofSecond.sourceHash),
                            usedBy: {
                                __kind: "Mission",
                                endTime: proofSecond.usedBy.endTime,
                                id: proofSecond.usedBy.id,
                                rewards: proofSecond.usedBy.rewards,
                                rewardsCollected: proofSecond.usedBy.rewardsCollected,
                            }
                        },
                    }
                )
            ]);

            await operation.send({ skipPreflight: true });
        } else {
            throw new Error("Character is not used by a mission");
        }
    });
});