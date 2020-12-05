const { advanceTime } = require("./time.support");

const exec = async (
  delayContract,
  blockTime,
  creator,
  blocker,
  executor,
  waitBlock,
  waitExec,
  on,
  data,
  value
) => {
  const txCreate = await delayContract.delayExecution(on, data, value, {
    from: creator,
  });
  const scriptId = txCreate.receipt.logs[0].args[0];

  if (blocker !== undefined) {
    await advanceTime(waitBlock, blockTime);
    await delayContract.cancelExecution(scriptId, {
      from: blocker,
    });
  }

  await advanceTime(waitExec, blockTime);

  const txExec = await delayContract.execute(scriptId, {
    from: executor,
  });

  const success = txExec.receipt.logs[0].args._success;
  if (!success) {
    throw new Error("script execution failed");
  }
};

module.exports = {
  exec,
};
