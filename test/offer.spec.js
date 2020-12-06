const fs = require("fs");

const OneTimeSwap = artifacts.require("OneTimeSwap");

const ERC20Mintable1 = artifacts.require("ERC20Mintable1");
const ERC20Mintable2 = artifacts.require("ERC20Mintable2");

const { toWei } = require("./general.support");

const FUNDS_NOT_ENOUGH = "funds not enough";

contract.skip("OneTimeSwap", (accounts) => {
  const execDAO = accounts[2];
  const investor = accounts[3];
  const observer = accounts[4];

  let swap;
  let dai;
  let fdai;

  /** profit after 1M is in the pot */
  const offered = toWei("2 500 000");
  const price = toWei("25 000");

  it("should get contract instances", async () => {
    dai = await ERC20Mintable1.deployed();
    fdai = await ERC20Mintable2.deployed();
  });

  it("should deploy", async () => {
    swap = await OneTimeSwap.new(
      execDAO,
      fdai.address,
      investor,
      dai.address,
      price
    );
  });

  it("should be correctly configured", async () => {
    const offerer = await swap.offerer();
    const buyer = await swap.buyer();
    const offeredTokenRead = await swap.offeredToken();
    const payTokenRead = await swap.payToken();
    const priceRead = await swap.price();

    assert.equal(offerer, execDAO, "offerer");
    assert.equal(buyer, investor, "investor");
    assert.equal(offeredTokenRead, fdai.address, "offered token");
    assert.equal(payTokenRead, dai.address, "pay token");
    assert.equal(priceRead.toString(), price.toString(), "price");
  });

  it("should not swap if not paid", async () => {
    await fdai.mint(swap.address, offered);
    await dai.mint(swap.address, price.sub(toWei("1")));

    let failed = false;
    await swap.swap({ from: observer }).catch((error) => {
      assert.equal(error.reason, FUNDS_NOT_ENOUGH, "unexpected reason");
      failed = true;
    });
    assert.isTrue(failed, "swap didn't fail");
  });

  it("should swap if paid", async () => {
    // add just enought funds to buy
    await dai.mint(swap.address, toWei("1"));

    const balanceOfferedSwaper0 = await fdai.balanceOf(swap.address);
    const balancePaySwaper0 = await dai.balanceOf(swap.address);

    assert.equal(
      balanceOfferedSwaper0.toString(),
      offered.toString(),
      "swaper balance"
    );

    assert.equal(
      balancePaySwaper0.toString(),
      price.toString(),
      "swaper balance"
    );

    const balanceOfferedOfferor0 = await fdai.balanceOf(execDAO);
    const balancePayOfferor0 = await dai.balanceOf(execDAO);

    const balanceOfferedBuyer0 = await fdai.balanceOf(investor);
    const balancePayBuyer0 = await dai.balanceOf(investor);

    await swap.swap({ from: observer });

    const balanceOfferedSwaper1 = await fdai.balanceOf(swap.address);
    const balancePaySwaper1 = await dai.balanceOf(swap.address);

    const balanceOfferedOfferor1 = await fdai.balanceOf(execDAO);
    const balancePayOfferor1 = await dai.balanceOf(execDAO);

    const balanceOfferedBuyer1 = await fdai.balanceOf(investor);
    const balancePayBuyer1 = await dai.balanceOf(investor);

    assert.equal(balanceOfferedSwaper1.toString(), "0", "swaper not drained");
    assert.equal(balancePaySwaper1.toString(), "0", "swaper not drained");

    assert.equal(
      balanceOfferedOfferor1.toString(),
      balanceOfferedOfferor0.toString(),
      "tbd"
    );

    assert.equal(
      balancePayOfferor1.toString(),
      balancePayOfferor0.add(balancePaySwaper0).toString(),
      "tbd"
    );

    assert.equal(
      balanceOfferedBuyer1.toString(),
      balanceOfferedBuyer0.add(balanceOfferedSwaper0).toString(),
      "tbd"
    );

    assert.equal(
      balancePayBuyer1.toString(),
      balancePayBuyer0.toString(),
      "tbd"
    );
  });
});
