import * as web3 from "@solana/web3.js";
import { 
    Metaplex,
    keypairIdentity,
} from "@metaplex-foundation/js";
import {
    PROGRAM_ID as BUBBLEGUM_PROGRAM_ID
} from "@metaplex-foundation/mpl-bubblegum";
import {
    HPL_HIVE_CONTROL_PROGRAM as HPL_HIVE_CONTROL_PROGRAM_ID,
    Honeycomb,
    HoneycombProject,
    METADATA_PROGRAM_ID,
    Operation,
    VAULT,
    createCreateProfileInstruction,
    createInitializeUserInstruction,
} from "@honeycomb-protocol/hive-control";
import {
    HPL_EVENTS_PROGRAM
} from "@honeycomb-protocol/events";
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
    createCreateHolderAccountInstruction,
} from "@honeycomb-protocol/currency-manager";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

jest.setTimeout(300000);

describe("Nectar Missions Tests", () => {
    const numCnfts = 1;
    const numCharacters = 1;

    let admin: web3.Keypair; 
    let adminHC: Honeycomb;
    let delegate: web3.Keypair;
    let delegateHC: Honeycomb;
    let user: web3.Keypair;
    let userHC: Honeycomb;
    let metaplex: Metaplex;
    
    let project: web3.PublicKey;
    let collection: web3.PublicKey;
    let merkleTree: web3.PublicKey;
    let characterModelAddress: web3.PublicKey;
    let missionPool: web3.PublicKey;
    let characterModel: CharacterModel;
    let activeCharactersTree: web3.PublicKey;
    let wrappedCharacterNfts: Asset[] = [];
    let characters: HplCharacter[] = [];

    let hiveControlUser: web3.PublicKey;
    let hiveControlUserProfile: web3.PublicKey;

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
                tree: treeKeypair,
                collection: collection,
            });
        }

        if(!project) {
            const name = "Test project";
            adminHC.use(
                await HoneycombProject.new(adminHC, {
                    name,
                    expectedMintAddresses: 0,
                    profileDataConfigs: [],
                })
            );
            console.log("Project: ", adminHC.project().address.toBase58());
            project = adminHC.project().address;
        }
    });

    it("Create/load character model", async () => {
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
                    hplEvents: HPL_EVENTS_PROGRAM,
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

    it("Create/load character model's merkle tree", async () => {
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
                    hplEvents: HPL_EVENTS_PROGRAM,
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

    it("Wrap cNFT(s) to character", async () => {
        const project = characterModel.project;
        const wallet = userHC.identity().address;

        const nfts = await fetchHeliusAssets(userHC.rpcEndpoint, {
                walletAddress: wallet,
                collectionAddress: collection,
            }).then((nfts) => nfts.filter((n) => !n.frozen && n.isCompressed));

        if (!nfts.length) throw new Error("No Nfts to wrap");

        for(let i = 0; i < numCharacters; i++) {
            const nftToWrap = nfts[i];

            // console.log(nftToWrap);

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
                i
            );
    
            console.log("Character", JSON.stringify(newCharacter));
            characters.push(newCharacter);
        }
    });

    it("Create mission pool", async () => {
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
                        hplEvents: HPL_EVENTS_PROGRAM,
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

    it("Update the mission pool to allow the character model", async () => {
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
                    guildKit: HPL_NECTAR_MISSIONS_PROGRAM_ID,
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

    it("Create a currency", async () => {
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
                        hplEvents: HPL_EVENTS_PROGRAM,
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

    it("Create a mission", async () => {
        const missionName = "Important mission";
        const [mpPublicKey] = web3.PublicKey.findProgramAddressSync(
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
                    mission: mpPublicKey,
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
                            }
                        ]
                    }
                }
            )
        ]);

        await operation.send({ commitment: "processed" });

        console.log("Mission:", mpPublicKey.toBase58());
        mission = mpPublicKey;
    });

    it("Create holder account and mint", async () => {
        const holderAccount = await adminHC.currency().newHolderAccount(userHC.identity().address);

        await holderAccount.mint(1_000_000_000);
    });

    it("Create user", async () => {
        const username = "TestUser";
        const [ userPublicKey ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("user"),
                Buffer.from(username)
            ],
            HPL_HIVE_CONTROL_PROGRAM_ID
        );

        const [ walletResolverPublicKey ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("wallet_resolver"),
                userHC.identity().address.toBuffer()
            ],
            HPL_HIVE_CONTROL_PROGRAM_ID
        );

        const operation = new Operation(userHC, [
            createInitializeUserInstruction(
                {
                    user: userPublicKey,
                    walletResolver: walletResolverPublicKey,
                    wallet: userHC.identity().address,
                    systemProgram: web3.SystemProgram.programId,
                    hplEvents: HPL_EVENTS_PROGRAM,
                    clock: web3.SYSVAR_CLOCK_PUBKEY,
                    rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                },
                {
                    args: {
                        username,
                        name: "Test User",
                        bio: "This user account is used for testing",
                        pfp: "https://lh3.googleusercontent.com/yTzqJcgQ4VNQuq5BXjEefj88NvmY6uqmq9UEM6nGUF9Vs68LPsTYocXR9vJ4yhvl-LlXeXgdXkm5Y5lz9p3LQqbEifbKHV5xtLc",
                    }
                }
            )
        ])

        await operation.send({ commitment: "processed" });

        hiveControlUser = userPublicKey;
        console.log("User:", userPublicKey.toBase58());
    });

    it("Create user profile", async () => {
        const [ userProfilePublicKey ] = web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("profile"),
                project.toBuffer(),
                hiveControlUser.toBuffer(),
                Buffer.from("main"),
            ],
            HPL_HIVE_CONTROL_PROGRAM_ID
        );

        const operation = new Operation(userHC, [
            createCreateProfileInstruction(
                {
                    user: hiveControlUser,
                    project,
                    profile: userProfilePublicKey,
                    wallet: userHC.identity().address,
                    rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                    systemProgram: web3.SystemProgram.programId,
                    hplEvents: HPL_EVENTS_PROGRAM,
                    clock: web3.SYSVAR_CLOCK_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                    vault: VAULT,
                },
                {
                    args: {
                        identity: {
                            __kind: "Main",
                        },
                        pfp: "https://lh3.googleusercontent.com/UjE0kuudxuDzQ0QezywU99TzM49_QbNKHvmE8A8rC9o76W84YU1TmT0M78WJZz5bcu1VMud5RfYSoYZuv5Pa52PpO_bchLkiQQ",
                        bio: "This is the main profile",
                        name: "Test User",
                    }
                }
            )
        ]);

        await operation.send({ commitment: "processed" });

        hiveControlUserProfile = userProfilePublicKey;
        console.log("User profile:", userProfilePublicKey.toBase58());
    });

    it("Participate in the mission", async () => {
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

        const operation = new Operation(userHC, [
            web3.ComputeBudgetProgram.setComputeUnitLimit(
                {
                    units: 1_200_000
                }
            ),
            createParticipateInstruction(
                {
                    project,
                    missionPool,
                    mission,
                    characterModel: characterModelAddress,
                    characterManager: CHARACTER_MANAGER_PROGRAM_ID,
                    merkleTree: activeCharactersTree,
                    mint: currencyMint,
                    currency,
                    profile: hiveControlUserProfile,
                    holderAccount: holderAccountPublicKey,
                    tokenAccount: tokenAccounts.value[0].pubkey,
                    wallet: userHC.identity().address,
                    vault: VAULT,
                    systemProgram: web3.SystemProgram.programId,
                    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                    hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                    currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
                    hplEvents: HPL_EVENTS_PROGRAM,
                    clock: web3.SYSVAR_CLOCK_PUBKEY,
                    rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                    instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
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
                    }
                }
            )
        ]);

        await operation.send({ skipPreflight: true });
    });

    // to be tested
    it("Collect rewards for participating in the mission", async () => {
        console.log("Waiting for mission to end...");
        await new Promise((resolve) => setTimeout(resolve, missionDuration * 1000)); // seconds converted to milliseconds

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

        if(proofSecond.usedBy.__kind === "Mission") {
            const operation = new Operation(userHC, [
                web3.ComputeBudgetProgram.setComputeUnitLimit(
                    {
                        units: 1_200_000
                    }
                ),
                createCollectRewardsInstruction(
                    {
                        characterModel: characterModelAddress,
                        project,
                        missionPool,
                        missionPoolDelegate: adminHC.identity().delegateAuthority()?.address || HPL_NECTAR_MISSIONS_PROGRAM_ID,
                        mission,
                        profile: hiveControlUserProfile,
                        mint: currencyMint,
                        currency,
                        characterManager: CHARACTER_MANAGER_PROGRAM_ID,
                        holderAccount: holderAccountPublicKey,
                        tokenAccount: tokenAccounts.value[0].pubkey,
                        wallet: userHC.identity().address,
                        vault: VAULT,
                        merkleTree: activeCharactersTree,
                        systemProgram: web3.SystemProgram.programId,
                        hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
                        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
                        hplEvents: HPL_EVENTS_PROGRAM,
                        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
                        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                        logWrapper: SPL_NOOP_PROGRAM_ID,
                        clock: web3.SYSVAR_CLOCK_PUBKEY,
                        anchorRemainingAccounts: proofDetails.proof.map((p) => ({
                                pubkey: p,
                                isSigner: false,
                                isWritable: false,
                            })
                        ),
                    },
                    {
                        args: {
                            root: Array.from(proofDetails.root.toBytes()),
                            leafIdx: wrappedCharacterNfts[0].compression!.leafId,
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

    // to be tested
    it.skip("Recall character", async () => {
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

        // if(proofSecond.usedBy.__kind === "Mission") {
        //     const operation = new Operation(userHC, [
        //         web3.ComputeBudgetProgram.setComputeUnitLimit(
        //             {
        //                 units: 1_200_000
        //             }
        //         ),
        //         createRecallInstruction(
        //             {
        //                 characterModel: characterModelAddress,
        //                 project,
        //                 missionPool,
        //                 mission,
        //                 wallet: userHC.identity().address,
        //                 vault: VAULT,
        //                 merkleTree: activeCharactersTree,
        //                 systemProgram: web3.SystemProgram.programId,
        //                 hiveControl: HPL_HIVE_CONTROL_PROGRAM_ID,
        //                 characterManager: CHARACTER_MANAGER_PROGRAM_ID,
        //                 hplEvents: HPL_EVENTS_PROGRAM,
        //                 compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        //                 instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        //                 clock: web3.SYSVAR_CLOCK_PUBKEY,
        //                 logWrapper: SPL_NOOP_PROGRAM_ID,
        //                 anchorRemainingAccounts: proof.proof.map((p) => ({
        //                         pubkey: p,
        //                         isSigner: false,
        //                         isWritable: false,
        //                     })
        //                 ),
        //             },
        //             {
        //                 args: {
        //                     root: Array.from(proof.root.toBytes()),
        //                     leafIdx: proofSecond.leafIdx,
        //                     sourceHash: Array.from(proofSecond.sourceHash),
        //                     usedBy: {
        //                         __kind: "Mission",
        //                         endTime: proofSecond.usedBy.endTime,
        //                         id: proofSecond.usedBy.id,
        //                         rewards: proofSecond.usedBy.rewards,
        //                         rewardsCollected: proofSecond.usedBy.rewardsCollected,
        //                     }
        //                 },
        //             }
        //         )
        //     ]);
        // } else {
        //     throw new Error("Character is not used by a mission");
        // }
    });
});