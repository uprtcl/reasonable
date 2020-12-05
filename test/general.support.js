const getCallData = (contract, funcName, params) => {
  const funcJson = contract.abi.find(
    (e) => e.name === funcName && e.type === "function"
  );
  return web3.eth.abi.encodeFunctionCall(funcJson, params);
};

const numOf = (str) => {
  return str.replace(/\s/g, "");
};

const toWei = (str) => {
  return web3.utils.toBN(web3.utils.toWei(numOf(str)));
};

module.exports = {
  getCallData,
  numOf,
  toWei,
};
