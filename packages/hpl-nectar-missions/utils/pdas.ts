import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../generated";

export const missionPoolPda = (
  project: PublicKey,
  name: string,
  programId = PROGRAM_ID
) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("mission_pool"), project.toBuffer(), Buffer.from(name)],
    programId
  );

export const missionPda = (
  missionPool: PublicKey,
  name: string,
  programId = PROGRAM_ID
) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("mission"), missionPool.toBuffer(), Buffer.from(name)],
    programId
  );

export const participationPda = (nft: PublicKey, programId = PROGRAM_ID) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("participation"), nft.toBuffer()],
    programId
  );
