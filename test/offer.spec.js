const fs = require("fs");

const OneTimeSwap = artifacts.require("OneTimeSwap");

const ERC20Mintable1 = artifacts.require("ERC20Mintable1");
const ERC20Mintable2 = artifacts.require("ERC20Mintable2");

const { toWei } = require("./general.support");

const FUNDS_NOT_ENOUGH = "funds not enough";

contract("OneTimeSwap", (accounts) => {
  const execDAO = accounts[2];
  const beneficiary = accounts[6];
  const investor = accounts[3];
  const investorBeneficiary = accounts[4];
  const observer = accounts[5];

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
      beneficiary,
      investor,
      dai.address,
      investorBeneficiary,
      price
    );
  });

  it("should be correctly configured", async () => {
    const offerer = await swap.offerer();
    const buyer = await swap.buyer();
    const offeredTokenRead = await swap.offeredToken();
    const payTokenRead = await swap.payToken();
    const offererBeneficiary = await swap.offererBeneficiary();
    const buyerBeneficiary = await swap.buyerBeneficiary();
    const priceRead = await swap.price();

    assert.equal(offerer, execDAO, "offerer");
    assert.equal(buyer, investor, "investor");
    assert.equal(offeredTokenRead, fdai.address, "offered token");
    assert.equal(payTokenRead, dai.address, "pay token");
    assert.equal(offererBeneficiary, beneficiary, "offerer");
    assert.equal(buyerBeneficiary, investorBeneficiary, "investor");
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

    const balanceOfferedOfferorBen0 = await fdai.balanceOf(beneficiary);
    const balancePayOfferorBen0 = await dai.balanceOf(beneficiary);

    const balanceOfferedBuyerBen0 = await fdai.balanceOf(investorBeneficiary);
    const balancePayBuyerBen0 = await dai.balanceOf(investorBeneficiary);

    await swap.swap({ from: observer });

    const balanceOfferedSwaper1 = await fdai.balanceOf(swap.address);
    const balancePaySwaper1 = await dai.balanceOf(swap.address);

    const balanceOfferedOfferorBen1 = await fdai.balanceOf(beneficiary);
    const balancePayOfferorBen1 = await dai.balanceOf(beneficiary);

    const balanceOfferedBuyerBen1 = await fdai.balanceOf(investorBeneficiary);
    const balancePayBuyerBen1 = await dai.balanceOf(investorBeneficiary);

    assert.equal(balanceOfferedSwaper1.toString(), "0", "swaper not drained");
    assert.equal(balancePaySwaper1.toString(), "0", "swaper not drained");

    assert.equal(
      balanceOfferedOfferorBen1.toString(),
      balanceOfferedOfferorBen0.toString(),
      "tbd"
    );

    assert.equal(
      balancePayOfferorBen1.toString(),
      balancePayOfferorBen0.add(balancePaySwaper0).toString(),
      "tbd"
    );

    assert.equal(
      balanceOfferedBuyerBen1.toString(),
      balanceOfferedBuyerBen0.add(balanceOfferedSwaper0).toString(),
      "tbd"
    );

    assert.equal(
      balancePayBuyerBen1.toString(),
      balancePayBuyerBen0.toString(),
      "tbd"
    );
  });
});
