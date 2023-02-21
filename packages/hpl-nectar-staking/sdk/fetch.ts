import { Metadata, Metaplex } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import web3 from "@solana/web3.js";
import { AvailableNft, StakedNft, TokenAccountInfo } from "../types";
import { NFT, StakingProject, Staker } from "../generated";
import { getStakerPda, getStakingProjectPda } from "../pdas";

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
  args.walletAddress && gpa.addFilter("staker", args.walletAddress);

  const nfts = await gpa
    .run(mx.connection)
    .then((nfts) => nfts.map(({ account }) => NFT.fromAccountInfo(account)[0]));

  //@ts-ignore
  const metaplexOut: StakedNft[] = await mx
    .nfts()
    .findAllByMintList({ mints: nfts.map((x) => x.mint) })
    .then((metaplexNfts) =>
      metaplexNfts.map((nft) => ({
        ...nft,
        //@ts-ignore
        ...nfts.find((x) => x.mint.equals(nft.mintAddress || nft.mint.address)),
      }))
    );

  return metaplexOut;
};

type FetchAvailableNfts = {
  metaplex: Metaplex;
  stakingProject: StakingProject;
  walletAddress?: web3.PublicKey;
  allowedMints?: web3.PublicKey[];
};
export const fetchAvailableNfts = async ({
  metaplex: mx,
  ...args
}: FetchAvailableNfts) => {
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
          tokenMint: new web3.PublicKey(x.account.data.parsed.info),
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

  if (args.stakingProject.collections.length) {
    filteredNfts = [
      ...filteredNfts,
      ...ownedNfts.filter(
        (nft) =>
          nft.collection &&
          nft.collection.verified &&
          args.stakingProject.collections.includes(nft.collection.address)
      ),
    ];
  }

  if (args.stakingProject.creators.length) {
    filteredNfts = [
      ...filteredNfts,
      ...ownedNfts.filter((nft) =>
        nft.creators.some(
          (creator) =>
            creator.verified &&
            args.stakingProject.creators.includes(creator.address)
        )
      ),
    ];
  }

  filteredNfts = filteredNfts.filter(
    (nft, index, self) =>
      self.findIndex((t) => t.address.equals(nft.address)) === index
  );

  return filteredNfts;
};

type FetchAllArgs = FetchStakedNftsArgs & { allowedMints?: web3.PublicKey[] };
export const fetchAll = async ({
  metaplex: mx,
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
      stakingProject,
      allowedMints,
      walletAddress,
    }),
  };
};
