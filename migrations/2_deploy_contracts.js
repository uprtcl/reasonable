const Delay = artifacts.require("Delay");
const Pot = artifacts.require("Pot");
const Pool = artifacts.require("Pool");

/** for test purposes */
const ERC20Mintable1 = artifacts.require("ERC20Mintable1");
const ERC20Mintable2 = artifacts.require("ERC20Mintable2");
const TestSwitch = artifacts.require("TestSwitch");

const DELAY = web3.utils.toBN(600);

require("dotenv").config();

module.exports = function (deployer, _, accounts) {
  deployer.then(async () => {
    if (process.env.deploying !== "true") {
      const god = accounts[0];
      comDAO = accounts[1];
      execDAO = accounts[2];

      dai = await deployer.deploy(ERC20Mintable1, god, { from: god });
      gov = await deployer.deploy(ERC20Mintable2, god, { from: god });
    } else {
      comDAO = process.env.comDAOaddress;
      execDAO = process.env.execDAOaddress;
      dai = { address: process.env.daiAddress };
      gov = { address: process.env.govAddress };
    }

    const permissions = [comDAO, execDAO, comDAO, comDAO, comDAO];

    const delay = await deployer.deploy(Delay, DELAY, permissions, {
      from: comDAO,
    });

    const pool0 = await deployer.deploy(
      Pool,
      comDAO,
      dai.address,
      gov.address,
      delay.address
    );

    const pool1 = await deployer.deploy(
      Pool,
      pool0.address,
      dai.address,
      gov.address,
      delay.address
    );

    await deployer.deploy(Pot, pool1.address, dai.address, delay.address);
  });
};
