import { Metadata, Metaplex } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import { AvailableNft, StakedNft, TokenAccountInfo } from "../types";
import { NFT, StakingProject, Staker } from "../generated";
import { getStakerPda, getStakingProjectPda } from "../pdas";
import { createProjectPda, Project } from "@honeycomb-protocol/hive-control";

type FetchArgs = {
  connection: web3.Connection;
  commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig;
};

type FetchStakingProjectArgs = FetchArgs & { address: web3.PublicKey };
export const fetchStakingProject = (args: FetchStakingProjectArgs) =>
  StakingProject.fromAccountAddress(
    args.connection,
    args.address,
    args.commitmentOrConfig
  );

type FetchStakerArgs = FetchArgs & {
  stakingProjectAddress: web3.PublicKey;
  walletAddress: web3.PublicKey;
};
export const fetchStaker = (args: FetchStakerArgs) => {
  const [staker] = getStakerPda(args.stakingProjectAddress, args.walletAddress);
  return Staker.fromAccountAddress(
    args.connection,
    staker,
    args.commitmentOrConfig
  );
};

type FetchStakedNftsArgs = {
  metaplex: Metaplex;
  stakingProjectAddress: web3.PublicKey;
  walletAddress?: web3.PublicKey;
};
export const fetchStakedNfts = async ({
  metaplex: mx,
  ...args
}: FetchStakedNftsArgs) => {
  const gpa = NFT.gpaBuilder();
  gpa.addFilter("stakingProject", args.stakingProjectAddress);
  if (args.walletAddress) {
    const [staker] = getStakerPda(
      args.stakingProjectAddress,
      args.walletAddress
    );
    gpa.addFilter("staker", staker);
  }

  const nfts = await gpa
    .run(mx.connection)
    .then((nfts) => nfts.map(({ account }) => NFT.fromAccountInfo(account)[0]));

  const metaplexOut: StakedNft[] = await mx
    .nfts()
    .findAllByMintList({ mints: nfts.map((x) => x.mint) })
    .then((metaplexNfts) => {
      console.log("metaplexNfts", metaplexNfts);
      return (
        metaplexNfts.filter((x) => x.model == "metadata") as Metadata[]
      ).map(
        (nft) =>
          ({
            ...nft,
            ...nfts.find((x) => x.mint.equals(nft.mintAddress)),
          } as StakedNft)
      );
    });

  return metaplexOut;
};

type FetchAvailableNfts = {
  metaplex: Metaplex;
  project: Project;
  stakingProject: StakingProject;
  walletAddress?: web3.PublicKey;
  allowedMints?: web3.PublicKey[];
};
export const fetchAvailableNfts = async ({
  metaplex: mx,
  ...args
}: FetchAvailableNfts) => {
  const [projectAddress] = createProjectPda(args.project.key);
  if (!args.stakingProject.project.equals(projectAddress))
    throw new Error("StakingProject does not belong to the Project provided!");

  const ownedTokenAccounts: TokenAccountInfo[] = await mx.connection
    .getParsedTokenAccountsByOwner(
      args.walletAddress || mx.identity().publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    )
    .then((x) =>
      x.value
        .map((x) => ({
          ...x.account.data.parsed.info,
          tokenMint: new web3.PublicKey(x.account.data.parsed.info.mint),
        }))
        .filter((x) => x.tokenAmount.uiAmount > 0)
    );

  const ownedNfts = await mx
    .nfts()
    .findAllByMintList({
      mints: ownedTokenAccounts.map((x) => x.tokenMint),
    })
    .then((nfts) =>
      (nfts.filter((x) => x?.model == "metadata") as Metadata[])
        .map((x) => {
          return {
            ...x,
            ...ownedTokenAccounts.find(
              (y) => y.tokenMint.toString() === x.mintAddress.toString()
            ),
          } as AvailableNft;
        })
        .filter((x) => {
          if (
            x.tokenStandard &&
            x.tokenStandard === TokenStandard.ProgrammableNonFungible
          ) {
            return true;
          }
          return x.state !== "frozen";
        })
    );

  let filteredNfts: AvailableNft[] = [];
  if (args.stakingProject.allowedMints) {
    const [stakingProjectAddress] = getStakingProjectPda(
      args.stakingProject.project,
      args.stakingProject.key
    );

    const allowedMints: web3.PublicKey[] =
      args.allowedMints ||
      (await NFT.gpaBuilder()
        .addFilter("stakingProject", stakingProjectAddress)
        .addFilter("staker", web3.PublicKey.default)
        .run(mx.connection)
        .then((nfts) =>
          nfts.map(({ account }) => NFT.fromAccountInfo(account)[0].mint)
        ));

    filteredNfts = [
      ...filteredNfts,
      ...ownedNfts.filter(
        (nft) => nft.tokenMint && allowedMints.includes(nft.tokenMint)
      ),
    ];
  }

  const validCollections = !!args.stakingProject.collections.length
    ? args.project.collections.filter((_, i) =>
        args.stakingProject.collections.includes(i)
      )
    : [];
  const validCreators = !!args.stakingProject.creators
    ? args.project.creators.filter((_, i) =>
        args.stakingProject.creators.includes(i)
      )
    : [];

  console.log(
    "validCollections",
    validCollections.map((x) => x.toString()),
    "validCreators",
    validCreators.map((x) => x.toString())
  );

  filteredNfts = [
    ...filteredNfts,
    ...ownedNfts.filter(
      (nft) =>
        (nft.collection &&
          validCollections.length &&
          nft.collection.verified &&
          !!validCollections.find((x) => x.equals(nft.collection.address))) ||
        (!!nft.creators.length &&
          !!validCreators.length &&
          nft.creators.some(
            (creator) =>
              creator.verified &&
              validCreators.find((x) => x.equals(creator.address))
          ))
    ),
  ];

  console.log("filteredNfts", filteredNfts.length);

  filteredNfts = filteredNfts.filter(
    (nft, index, self) =>
      self.findIndex((t) => t.address.equals(nft.address)) === index
  );

  return filteredNfts;
};

type FetchAllArgs = FetchStakerArgs &
  FetchStakedNftsArgs & { project: Project; allowedMints?: web3.PublicKey[] };
export const fetchAll = async ({
  metaplex: mx,
  project,
  stakingProjectAddress,
  walletAddress,
  allowedMints,
}: FetchAllArgs) => {
  const stakingProject = await fetchStakingProject({
    connection: mx.connection,
    address: stakingProjectAddress,
  });

  return {
    stakingProject,
    staker: walletAddress
      ? await fetchStaker({
          connection: mx.connection,
          stakingProjectAddress,
          walletAddress,
        })
      : undefined,
    stakedNfts: await fetchStakedNfts({
      metaplex: mx,
      stakingProjectAddress,
      walletAddress,
    }),
    availableNfts: await fetchAvailableNfts({
      metaplex: mx,
      project,
      stakingProject,
      allowedMints,
      walletAddress,
    }),
  };
};
