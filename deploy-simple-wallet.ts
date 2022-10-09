import { entryPoint, eoa } from "./common";
import { SimpleWalletWithSession__factory } from "./typechain/factories/SimpleWalletWithSession__factory";

(async () => {
  const factory = new SimpleWalletWithSession__factory(eoa);
  const contract = await factory.deploy(entryPoint.address, eoa.address);
  console.log("wallet contract address", contract.address);
})();
