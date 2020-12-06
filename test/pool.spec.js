const fs = require("fs");

const Delay = artifacts.require("Delay");
const Pot = artifacts.require("Pot");
const Pool0 = artifacts.require("Pool0");
const Pool1 = artifacts.require("Pool1");
const Pool2 = artifacts.require("Pool2");

const ERC20Mintable1 = artifacts.require("ERC20Mintable1");
const ERC20Mintable2 = artifacts.require("ERC20Mintable2");
const TestSwitch = artifacts.require("TestSwitch");

const { mineSnapshop, revertToSnapShot } = require("./time.support");
const { exec } = require("./delay.support");
const { getCallData, toWei } = require("./general.support");

const seedrandom = require("seedrandom");
const rng = seedrandom("randomseed");
const ZERO_ADDRESS = "0x" + new Array(40).fill("0").join("");

const OWNER_ERROR = "Ownable: caller is not the owner";
const DELAY_PERMISSION_ERROR = "msg sender not authorized";
const DELAY_CAN_NOT_EXECUTE = "DELAY_CAN_NOT_EXECUTE";
const DELAY_NO_SCRIPT = "DELAY_NO_SCRIPT";
const POT_NOT_FULL = "not enough funds";
const POOL_NOT_FULL = "balance of base token is not enough";
const POOL_STILL_OPEN = "token pool is still open";

const POOL_MINTED_SNAP = "POOL_MINTED";
const BLOCK_TIME = 5;
const DELAY = 600;

contract("Reasonable", (accounts) => {
  const comDAO = accounts[1];
  const execDAO = accounts[2];
  const investor = accounts[3];
  const observer = accounts[4];

  let delay;
  let pot;
  let pool2;
  let pool1;
  let pool0;
  let pool;
  let dai;
  let gov;
  let switchContract;

  /** profit after 1M is in the pot */
  const limit = toWei("1 000 000");

  const execOk = async (contract, funcName, pars) => {
    const calldata = getCallData(contract, funcName, pars);
    return exec(
      delay,
      BLOCK_TIME,
      execDAO,
      undefined,
      observer,
      undefined,
      DELAY + 50,
      contract.address,
      calldata,
      0
    );
  };

  it("should get contract instances", async () => {
    delay = await Delay.deployed();
    pot = await Pot.deployed();
    pool0 = await Pool0.deployed();
    pool1 = await Pool1.deployed();
    pool2 = await Pool2.deployed();
    pool = pool0;
    dai = await ERC20Mintable1.deployed();
    gov = await ERC20Mintable2.deployed();
    switchContract = await TestSwitch.deployed();
  });

  it("delay should be correctly configured", async () => {
    const permissionSet = await delay.permissions(
      web3.utils.keccak256("SET_DELAY_ROLE")
    );
    const permissionDelay = await delay.permissions(
      web3.utils.keccak256("DELAY_EXECUTION_ROLE")
    );
    const permissionPause = await delay.permissions(
      web3.utils.keccak256("PAUSE_EXECUTION_ROLE")
    );
    const permissionResume = await delay.permissions(
      web3.utils.keccak256("RESUME_EXECUTION_ROLE")
    );
    const permissionCancel = await delay.permissions(
      web3.utils.keccak256("CANCEL_EXECUTION_ROLE")
    );

    assert.equal(permissionSet, execDAO);
    assert.equal(permissionDelay, execDAO);
    assert.equal(permissionPause, comDAO);
    assert.equal(permissionResume, comDAO);
    assert.equal(permissionCancel, comDAO);
  });

  it("delay should not be creatable by other than execDAO", async () => {
    let failed;

    failed = false;
    await switchContract.switchValue({ from: observer }).catch((error) => {
      assert.equal(error.reason, OWNER_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "switched");

    const calldata = getCallData(switchContract, "switchValue", []);

    /** only execDAO can create actions */
    failed = false;
    await exec(
      delay,
      BLOCK_TIME,
      observer,
      undefined,
      observer,
      undefined,
      DELAY + 50,
      switchContract.address,
      calldata,
      0
    ).catch((error) => {
      assert.equal(error.reason, DELAY_PERMISSION_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "switched");

    failed = false;
    await exec(
      delay,
      BLOCK_TIME,
      comDAO,
      undefined,
      observer,
      undefined,
      DELAY + 50,
      switchContract.address,
      calldata,
      0
    ).catch((error) => {
      assert.equal(error.reason, DELAY_PERMISSION_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "switched");
  });

  it("it should not be executale before time", async () => {
    let failed;

    const calldata = getCallData(switchContract, "switchValue", []);

    failed = false;
    await exec(
      delay,
      BLOCK_TIME,
      execDAO,
      undefined,
      observer,
      undefined,
      DELAY / 2,
      switchContract.address,
      calldata,
      0
    ).catch((error) => {
      assert.equal(error.reason, DELAY_CAN_NOT_EXECUTE, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "switched");
  });

  it("it should not be cancellable by others than comDAO", async () => {
    let failed;

    const calldata = getCallData(switchContract, "switchValue", []);

    failed = false;
    await exec(
      delay,
      BLOCK_TIME,
      execDAO,
      observer,
      observer,
      DELAY / 2,
      DELAY / 2 + 50,
      switchContract.address,
      calldata,
      0
    ).catch((error) => {
      assert.equal(error.reason, DELAY_PERMISSION_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "switched");

    failed = false;
    await exec(
      delay,
      BLOCK_TIME,
      execDAO,
      execDAO,
      observer,
      DELAY / 2,
      DELAY / 2 + 50,
      switchContract.address,
      calldata,
      0
    ).catch((error) => {
      assert.equal(error.reason, DELAY_PERMISSION_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "switched");
  });

  it("it should be cancellable by the comDAO", async () => {
    const valueBefore = await switchContract.value();

    let failed;

    const calldata = getCallData(switchContract, "switchValue", []);

    failed = false;
    await exec(
      delay,
      BLOCK_TIME,
      execDAO,
      comDAO,
      observer,
      DELAY / 2,
      DELAY / 2 + 50,
      switchContract.address,
      calldata,
      0
    ).catch((error) => {
      assert.equal(error.reason, DELAY_NO_SCRIPT, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "switched");

    const valueAfter = await switchContract.value();

    assert.equal(valueBefore.toString(), valueAfter.toString(), "switched");
  });

  it("it should delay if not blocked", async () => {
    const valueBefore = await switchContract.value();

    const calldata = getCallData(switchContract, "switchValue", []);

    await exec(
      delay,
      BLOCK_TIME,
      execDAO,
      undefined,
      observer,
      undefined,
      DELAY + 50,
      switchContract.address,
      calldata,
      0
    );
    const valueAfter = await switchContract.value();
    assert.notEqual(valueBefore.toString(), valueAfter.toString(), "switched");
  });

  // POOL
  it("pool2 should be correctly configured", async () => {
    assert.equal(await pool2.owner(), delay.address, "owner");
    assert.equal((await pool2.totalSupply()).toString(), "0", "base token");
    assert.equal(await pool2.baseToken(), dai.address, "base token");
    assert.equal(await pool2.govToken(), gov.address, "gov token");
    assert.equal((await pool2.status()).toString(), "1", "status");
    assert.equal(await pool2.beneficiary(), pool1.address, "beneficiary");
  });

  it("pool1 should be correctly configured", async () => {
    assert.equal(await pool1.owner(), delay.address, "owner");
    assert.equal((await pool1.totalSupply()).toString(), "0", "base token");
    assert.equal(await pool.baseToken(), dai.address, "base token");
    assert.equal(await pool1.govToken(), gov.address, "gov token");
    assert.equal((await pool1.status()).toString(), "1", "status");
    assert.equal(await pool1.beneficiary(), pool0.address, "beneficiary");
  });

  it("pool1 should be correctly configured", async () => {
    assert.equal(await pool0.owner(), delay.address, "owner");
    assert.equal((await pool0.totalSupply()).toString(), "0", "base token");
    assert.equal(await pool.baseToken(), dai.address, "base token");
    assert.equal(await pool0.govToken(), gov.address, "gov token");
    assert.equal((await pool0.status()).toString(), "1", "status");
    assert.equal(await pool0.beneficiary(), comDAO, "beneficiary");
  });

  it("pool mint should be protected", async () => {
    const amount = toWei("100 000");

    let failed = false;
    await pool.mint(observer, amount, { from: observer }).catch((error) => {
      assert.equal(error.reason, OWNER_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "set limit");
  });

  it("pool owner should mint", async () => {
    const amount = toWei("2 500 000");
    const supply0 = await pool.totalSupply();
    const balanceInvestor0 = await pool.balanceOf(investor);

    await execOk(pool, "mint", [investor, amount.toString()]);

    const supply1 = await pool.totalSupply();
    const balanceInvestor1 = await pool.balanceOf(investor);

    assert.equal(supply1.toString(), supply0.add(amount).toString(), "minted");
    assert.equal(
      balanceInvestor1.toString(),
      balanceInvestor0.add(amount).toString(),
      "minted"
    );

    await mineSnapshop(POOL_MINTED_SNAP);
  });

  it("pool should be closable by outsider", async () => {
    let failed = false;
    await pool.close({ from: observer }).catch((error) => {
      assert.equal(error.reason, POOL_NOT_FULL, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "set limit");
  });

  it("pool investor should not get payback before closed", async () => {
    let failed = false;
    await pool.payback(investor, { from: investor }).catch((error) => {
      assert.equal(error.reason, POOL_STILL_OPEN, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "set limit");
  });

  it("pool should be closable once fool", async () => {
    await dai.mint(pool.address, toWei("2 500 000"));
    await pool.close({ from: observer });
    const status = await pool.status();

    assert.equal(status.toString(), "0", "not closed");
  });

  it("pool should block minting after closed", async () => {
    const status = await pool.status();
    assert.equal(status.toString(), "0", "not closed");

    const amount = toWei("10 000");
    const balance0 = await pool.balanceOf(investor);

    let failed = false;
    await execOk(pool, "mint", [investor, amount.toString()]).catch((error) => {
      assert.equal(
        error.message,
        "script execution failed",
        "unexpected reason"
      );
      failed = true;
    });

    assert.isTrue(failed, "mint didn't fail");

    const balance1 = await pool.balanceOf(investor);
    assert.equal(balance1.toString(), balance0.toString(), "investor got FDAI");
  });

  it("pool investor should get paid back after closed", async () => {
    const balance0 = await dai.balanceOf(investor);
    const poolBalance0 = await dai.balanceOf(pool.address);
    const supply0 = await pool.totalSupply();

    await pool.payback(investor, { from: investor });

    const balance1 = await dai.balanceOf(investor);
    const poolBalance1 = await dai.balanceOf(pool.address);
    const supply1 = await pool.totalSupply();

    assert.equal(
      balance1.toString(),
      balance0.add(toWei("2 500 000")).toString(),
      "investor not paid"
    );

    assert.equal(
      poolBalance1.toString(),
      poolBalance0.sub(toWei("2 500 000")).toString(),
      "investor not paid"
    );

    assert.equal(
      supply1.toString(),
      supply0.sub(toWei("2 500 000")).toString(),
      "investor not paid"
    );
  });

  it("pool revenue should go to the beneficiary", async () => {
    const supply = await pool.totalSupply();
    assert.equal(supply.toString(), "0", "not fully paid");

    const amount = toWei("100 000");
    await dai.mint(pool.address, amount);

    const benBalance0 = await dai.balanceOf(comDAO);
    const poolBalance0 = await dai.balanceOf(pool.address);

    const available = poolBalance0;

    await pool.withdraw({ from: observer });

    const benBalance1 = await dai.balanceOf(comDAO);
    const poolBalance1 = await dai.balanceOf(pool.address);

    assert.equal(
      benBalance1.toString(),
      benBalance0.add(available).toString(),
      "beneficary didn't received revenue"
    );

    assert.equal(poolBalance1.toString(), "0", "pool didn't loose revenue");
  });

  // POT
  it("pot should be correctly configured", async () => {
    const owner = await pot.owner();
    const limit = await pot.limit();
    const beneficiary = await pot.beneficiary();

    assert.equal(owner, delay.address, "pot owner");
    assert.equal(beneficiary, pool2.address, "pot beneficiary");
    assert.equal(limit.toString(), "0", "pot limit");
  });

  it("pot should change limit", async () => {
    const currentLimit = await pot.limit();
    assert.equal(currentLimit.toString(), "0", "limit non zero");

    let failed = false;
    await pot.setLimit(limit, { from: observer }).catch((error) => {
      assert.equal(error.reason, OWNER_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "set limit");

    await execOk(pot, "setLimit", [limit.toString()]);

    const newLimit = await pot.limit();

    assert.equal(newLimit.toString(), limit.toString(), "limit wrong");
  });

  it("pot should receive dai", async () => {
    let balance = await dai.balanceOf(pot.address);
    assert.equal(balance.toString(), "0", "balance");

    const amount = toWei("100 000");
    dai.mint(pot.address, amount);

    balance = await dai.balanceOf(pot.address);
    assert.equal(balance.toString(), amount.toString(), "balance");
  });

  it("pot should be protected", async () => {
    const amount = toWei("10 000");

    let failed = false;
    await pot.transfer(observer, amount, { from: observer }).catch((error) => {
      assert.equal(error.reason, OWNER_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "set limit");
  });

  it("pot should transfer assets by delay", async () => {
    let balancePot0 = await dai.balanceOf(pot.address);
    let balanceObserver0 = await dai.balanceOf(observer);

    const amount = toWei("10 000");

    await execOk(pot, "transfer", [observer, amount.toString()]);

    let balancePot1 = await dai.balanceOf(pot.address);
    let balanceObserver1 = await dai.balanceOf(observer);

    assert.equal(
      balanceObserver1.toString(),
      balanceObserver0.add(amount).toString(),
      "did not transferred"
    );

    assert.equal(
      balancePot1.toString(),
      balancePot0.sub(amount).toString(),
      "did not transferred"
    );
  });

  it("profit should not be withdrawable if not enough balance", async () => {
    let failed = false;
    await pot.withdraw({ from: observer }).catch((error) => {
      assert.equal(error.reason, POT_NOT_FULL, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "set limit");
  });

  it("should withdraw profits", async () => {
    const beneficiaryBalance0 = await dai.balanceOf(pool2.address);

    let balancePot0 = await dai.balanceOf(pot.address);
    const minProfit = toWei("10 000");
    const superavit = balancePot0.add(minProfit);

    await dai.mint(pot.address, limit.add(minProfit));

    await pot.withdraw({ from: observer });

    const beneficiaryBalance1 = await dai.balanceOf(pool2.address);

    assert.equal(
      beneficiaryBalance1.toString(),
      beneficiaryBalance0.add(superavit).toString(),
      "did not received"
    );

    let failed = false;
    await pot.withdraw({ from: observer }).catch((error) => {
      assert.equal(error.reason, POT_NOT_FULL, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "set limit");
  });
});
