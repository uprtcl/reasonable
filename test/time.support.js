const advanceBlockTime = (time) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
};

const mineOneBlock = async (id) => {
  return new Promise((resolve) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: id || new Date().getTime(),
      },
      () => resolve()
    );
  });
};

const advanceTimeAndBlock = async (blockTime) => {
  await advanceBlockTime(blockTime);
  await mineOneBlock();
};

const advanceTime = async (time, blockTime) => {
  const nBlocks = Math.floor(time / blockTime) + 1;
  for (let i = 0; i < nBlocks; i++) {
    await advanceTimeAndBlock(blockTime);
  }
};

const mineSnapshop = async (id) => {
  return mineOneBlock(id);
};

const revertToSnapShot = (id) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_revert",
        params: [id],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
};

module.exports = {
  advanceTime,
  mineSnapshop,
  revertToSnapShot,
};
