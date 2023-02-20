import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
import { InitializeArgs } from '../types/InitializeArgs';
export type InitializeInstructionArgs = {
    args: InitializeArgs;
};
export declare const initializeStruct: beet.BeetArgsStruct<InitializeInstructionArgs & {
    instructionDiscriminator: number[];
}>;
export declare const initializeInstructionDiscriminator: number[];
export declare function createInitializeInstruction(args: InitializeInstructionArgs, programId?: web3.PublicKey): web3.TransactionInstruction;
