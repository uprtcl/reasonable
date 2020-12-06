# Reasonable

A legal and technological framework for creating and growing reasonable companies. Companies that reward the founders and investors, but that are, in the long-term, community-owned and governed.

## Overview

![](https://docs.google.com/drawings/d/e/2PACX-1vRfAPLh5_amW6mYeetQzB-wSgWtMpq-KNOj8D1eS9eE9X7h1XA9eXFax_YBE4ClC6TUJIo2mjqUtkSG/pub?w=2055&h=1288)

## Smart Contracts

- [Pool.sol](https://github.com/uprtcl/reasonable/blob/main/contracts/Pool.sol) is a mintable ERC20 token pegged 1:1 to another base tokens. Once the balance of base token is equal to the total supply of the mintable token, token holders dan redeem their tokens in exchange for the corresponding base token.
- [Delay.sol](https://github.com/uprtcl/reasonable/blob/main/contracts/Delay.sol) is a fork of [Aragon Delay App](https://github.com/1Hive/delay-app) used as a veto engine. An executor can trigger any call on any other contract through the delay, but the call is executed only after fixed time delay, during which, a "vetoer" can cancel this action execution.
- [Pot.sol](https://github.com/uprtcl/reasonable/blob/main/contracts/Pot.sol) is a ERC20 pot with a limit. Everything over the limit is send to a benficiary address.
- [OneTimeSwap.sol](https://github.com/uprtcl/reasonable/blob/main/contracts/OneTimeSwap.sol) A one-time token swap contract between two parties with a fixed price and the option for the parts to change their minds of not executed.
