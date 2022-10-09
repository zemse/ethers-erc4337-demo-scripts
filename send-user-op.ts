import { ethers, Wallet } from "ethers";
import {
  arrayify,
  defaultAbiCoder,
  joinSignature,
  keccak256,
  parseEther,
  parseUnits,
} from "ethers/lib/utils";
import { entryPoint, provider, walletContract, eoa } from "./common";
import { UserOperationStruct } from "./typechain/EntryPoint";

(async () => {
  entryPoint;

  walletContract;

  const { data } = await walletContract.populateTransaction.execFromEntryPoint(
    ethers.constants.AddressZero,
    parseEther("0.000001"),
    "0x"
  );

  let userOp: UserOperationStruct = {
    sender: walletContract.address,
    nonce: await walletContract.nonce(),
    initCode: "0x",
    callData: data!,
    callGasLimit: 100_000,
    verificationGasLimit: 100_000,
    preVerificationGas: 100_000,
    maxFeePerGas: parseUnits("10", "gwei"),
    maxPriorityFeePerGas: parseUnits("10", "gwei"),
    paymasterAndData: "0x",
    signature: "0x",
  };

  if (
    (await provider.getBalance(walletContract.address)).lt(parseEther("0.01"))
  ) {
    const tx = await eoa.sendTransaction({
      to: walletContract.address,
      value: parseEther("1"),
    });
    await tx.wait();
  }

  userOp = await signUserOp(
    userOp,
    eoa,
    entryPoint.address,
    provider.network.chainId
  );

  const tx = await entryPoint.handleOps([userOp], eoa.address);
  console.log(tx.hash);
})();

export async function signUserOp(
  op: UserOperationStruct,
  signer: Wallet,
  entryPoint: string,
  chainId: number
): Promise<UserOperationStruct> {
  const message = await getRequestId(op, entryPoint, chainId);
  const msg1 = Buffer.concat([
    Buffer.from("\x19Ethereum Signed Message:\n32", "ascii"),
    Buffer.from(arrayify(message)),
  ]);

  const signature = signer._signingKey().signDigest(keccak256(msg1));
  // that's equivalent of:  await signer.signMessage(message);
  // (but without "async"

  return {
    ...op,
    signature: joinSignature(signature),
  };
}

export async function getRequestId(
  op: UserOperationStruct,
  entryPoint: string,
  chainId: number
): Promise<string> {
  const userOpHash = keccak256(await packUserOp(op, true));
  const enc = defaultAbiCoder.encode(
    ["bytes32", "address", "uint256"],
    [userOpHash, entryPoint, chainId]
  );
  return keccak256(enc);
}

export async function packUserOp(
  op: UserOperationStruct,
  forSignature = true
): Promise<string> {
  if (forSignature) {
    // lighter signature scheme (must match UserOperation#pack): do encode a zero-length signature, but strip afterwards the appended zero-length value
    const userOpType = {
      components: [
        { type: "address", name: "sender" },
        { type: "uint256", name: "nonce" },
        { type: "bytes", name: "initCode" },
        { type: "bytes", name: "callData" },
        { type: "uint256", name: "callGasLimit" },
        { type: "uint256", name: "verificationGasLimit" },
        { type: "uint256", name: "preVerificationGas" },
        { type: "uint256", name: "maxFeePerGas" },
        { type: "uint256", name: "maxPriorityFeePerGas" },
        { type: "bytes", name: "paymasterAndData" },
        { type: "bytes", name: "signature" },
      ],
      name: "userOp",
      type: "tuple",
    };
    let encoded = defaultAbiCoder.encode(
      [userOpType as any],
      [{ ...op, signature: "0x" }]
    );
    // remove leading word (total length) and trailing word (zero-length signature)
    encoded = "0x" + encoded.slice(66, encoded.length - 64);
    return encoded;
  }
  const typevalues = [
    { type: "address", val: await op.sender },
    { type: "uint256", val: await op.nonce },
    { type: "bytes", val: await op.initCode },
    { type: "bytes", val: await op.callData },
    { type: "uint256", val: await op.callGasLimit },
    { type: "uint256", val: await op.verificationGasLimit },
    { type: "uint256", val: await op.preVerificationGas },
    { type: "uint256", val: await op.maxFeePerGas },
    { type: "uint256", val: await op.maxPriorityFeePerGas },
    { type: "bytes", val: await op.paymasterAndData },
  ];
  if (!forSignature) {
    // for the purpose of calculating gas cost, also hash signature
    typevalues.push({ type: "bytes", val: await op.signature });
  }
  return encode(typevalues, forSignature);
}

function encode(
  typevalues: Array<{ type: string; val: any }>,
  forSignature: boolean
): string {
  const types = typevalues.map((typevalue) =>
    typevalue.type === "bytes" && forSignature ? "bytes32" : typevalue.type
  );
  const values = typevalues.map((typevalue) =>
    typevalue.type === "bytes" && forSignature
      ? keccak256(typevalue.val)
      : typevalue.val
  );
  return defaultAbiCoder.encode(types, values);
}
