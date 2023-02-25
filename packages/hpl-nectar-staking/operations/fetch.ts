import { Metadata, Metaplex } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import { AvailableNft, StakedNft, TokenAccountInfo } from "../types";
import { NFT, Staker } from "../generated";
import { getStakerPda } from "../pdas";
import { Honeycomb } from "@honeycomb-protocol/hive-control";

type FetchStakerArgs = {
  walletAddress?: web3.PublicKey;
  programId?: web3.PublicKey;
};
export const fetchStaker = (honeycomb: Honeycomb, args: FetchStakerArgs) => {
  const [staker] = getStakerPda(
    honeycomb.staking().poolAddress,
    args?.walletAddress || honeycomb.identity().publicKey,
    args?.programId
  );
  return Staker.fromAccountAddress(honeycomb.connection, staker);
};

type FetchStakedNftsArgs = {
  walletAddress?: web3.PublicKey;
  programId?: web3.PublicKey;
};
export const fetchStakedNfts = async (
  honeycomb: Honeycomb,
  args?: FetchStakedNftsArgs
) => {
  const nfts = await honeycomb
    .staking()
    .fetch()
    .nftsByWallet(args.walletAddress);
  const mx = new Metaplex(honeycomb.connection);
  const metaplexOut: StakedNft[] = await mx
    .nfts()
    .findAllByMintList({ mints: nfts.map((x) => x.mint) })
    .then((metaplexNfts) => {
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
  walletAddress?: web3.PublicKey;
  allowedMints?: web3.PublicKey[];
  programId?: web3.PublicKey;
};
export const fetchAvailableNfts = async (
  honeycomb: Honeycomb,
  args?: FetchAvailableNfts
) => {
  const ownedTokenAccounts: TokenAccountInfo[] = await honeycomb.connection
    .getParsedTokenAccountsByOwner(
      args?.walletAddress || honeycomb.identity().publicKey,
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

  const mx = new Metaplex(honeycomb.connection);

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
  if (honeycomb.staking().allowedMints) {
    const allowedMints: web3.PublicKey[] =
      args?.allowedMints ||
      (await NFT.gpaBuilder(args.programId)
        .addFilter("stakingPool", honeycomb.staking().poolAddress)
        .addFilter("staker", web3.PublicKey.default)
        .run(honeycomb.connection)
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

  const validCollections = !!honeycomb.staking().collections.length
    ? honeycomb.collections.filter((_, i) =>
        honeycomb.staking().collections.includes(i)
      )
    : [];
  const validCreators = !!honeycomb.staking().creators
    ? honeycomb.creators.filter((_, i) =>
        honeycomb.staking().creators.includes(i)
      )
    : [];

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

  filteredNfts = filteredNfts.filter(
    (nft, index, self) =>
      self.findIndex((t) => t.address.equals(nft.address)) === index
  );

  return filteredNfts;
};
