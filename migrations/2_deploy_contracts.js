const Delay = artifacts.require("Delay");
const Pot = artifacts.require("Pot");

const Pool2 = artifacts.require("Pool2");
const Pool1 = artifacts.require("Pool1");
const Pool0 = artifacts.require("Pool0");

const ERC20Mintable1 = artifacts.require("ERC20Mintable1");
const ERC20Mintable2 = artifacts.require("ERC20Mintable2");
const TestSwitch = artifacts.require("TestSwitch");

let DELAY;
if (process.env.deploying !== "true") {
  DELAY = web3.utils.toBN(600);
} else {
  DELAY = web3.utils.toBN(345600);
}

require("dotenv").config();

module.exports = function (deployer, _, accounts) {
  deployer.then(async () => {
    const god = accounts[0];

    let comDAO;
    let execDAO;
    let dai;
    let gov;

    if (process.env.deploying !== "true") {
      console.log("------------------");
      console.log("------------------");
      console.log("DEPLOYING FOR TEST");
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

    const permissions = [execDAO, execDAO, comDAO, comDAO, comDAO];

    const delay = await deployer.deploy(Delay, DELAY, permissions, {
      from: god,
    });

    if (process.env.deploying !== "true") {
      await deployer.deploy(TestSwitch, delay.address, { from: god });
    }

    const pool0 = await deployer.deploy(
      Pool0,
      comDAO,
      dai.address,
      gov.address,
      delay.address,
      {
        from: god,
      }
    );

    const pool1 = await deployer.deploy(
      Pool1,
      pool0.address,
      dai.address,
      gov.address,
      delay.address,
      {
        from: god,
      }
    );

    const pool2 = await deployer.deploy(
      Pool2,
      pool1.address,
      dai.address,
      gov.address,
      delay.address,
      {
        from: god,
      }
    );

    await deployer.deploy(Pot, pool2.address, dai.address, delay.address);
  });
};
