import { entryPoint, walletContract } from "./common";

entryPoint.on(
  entryPoint.filters.UserOperationEvent(null, walletContract.address),
  (...args) => {
    const event = args[7];
    console.log(event.args);
  }
);
