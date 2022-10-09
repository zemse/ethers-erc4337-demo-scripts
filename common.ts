// import { ERC4337EthersSigner } from "@account-abstraction/sdk";
// new ERC4337EthersSigner();

import { ethers, Wallet } from "ethers";
import { EntryPoint__factory } from "./typechain/factories/EntryPoint__factory";
import { SimpleWalletWithSession__factory } from "./typechain/factories/SimpleWalletWithSession__factory";
import { UserOperationStruct } from "./typechain/EntryPoint";
import { config } from "dotenv";
import {
  ERC4337EthersProvider,
  ERC4337EthersSigner,
} from "@account-abstraction/sdk";
config();

export const provider = new ethers.providers.AlchemyProvider("goerli");

if (process.env.PRIVATE_KEY === undefined) {
  throw new Error("PRIVATE_KEY is not defined");
}

export const eoa = new Wallet(process.env.PRIVATE_KEY!, provider);

const entryPointAddress = "0x2167fA17BA3c80Adee05D98F0B55b666Be6829d6";

export const entryPoint = EntryPoint__factory.connect(entryPointAddress, eoa);

export const walletContract = SimpleWalletWithSession__factory.connect(
  "0xEa9dD2d8C1ff805dA17c94d729A4E32237A88081",
  eoa
);

// const e4337Provider = new ERC4337EthersProvider()
// const e4337Signer = new ERC4337EthersSigner({}, eoa, )
