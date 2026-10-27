// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Punchcard.sol";

contract MaliciousRecipient {
    Punchcard public punchcard;
    bytes public lastRevertData;

    constructor(Punchcard _punchcard) {
        punchcard = _punchcard;
    }

    receive() external payable {
        // Attempt reentrancy and record exact revert error
        try punchcard.withdraw() {} catch (bytes memory reason) {
            lastRevertData = reason;
        }
    }
}

contract PunchcardTest is Test {
    Punchcard public punchcard;

    address public shop = address(0x1111);
    address public alice = address(0x2222);
    address public bob = address(0x3333);
    address public charlie = address(0x4444);

    uint32 public constant DEFAULT_NEEDED = 5;
    uint128 public constant DEFAULT_REWARD = 0.1 ether;
    uint32 public constant DEFAULT_COOLDOWN = 1 hours;

    function setUp() public {
        punchcard = new Punchcard();
        vm.deal(shop, 10000 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 10000 ether);
    }

    function test_CreateProgramme() public {
        vm.startPrank(shop);
        uint256 id = punchcard.create{value: 1 ether}(
            "Corner Coffee Club",
            DEFAULT_NEEDED,
            DEFAULT_REWARD,
            DEFAULT_COOLDOWN
        );
        vm.stopPrank();

        assertEq(id, 1);
        Punchcard.Program memory p = punchcard.programOf(1);
        assertEq(p.shop, shop);
        assertEq(p.name, "Corner Coffee Club");
        assertEq(p.needed, DEFAULT_NEEDED);
        assertEq(p.reward, DEFAULT_REWARD);
        assertEq(p.cooldown, DEFAULT_COOLDOWN);
        assertEq(p.pool, 1 ether);
        assertEq(p.ready, 0);
        assertEq(p.redeemedCount, 0);

        uint256[] memory shopProgs = punchcard.byShop(shop);
        assertEq(shopProgs.length, 1);
        assertEq(shopProgs[0], 1);
    }

    function test_InputValidations() public {
        vm.startPrank(shop);

        // Empty name
        vm.expectRevert(Punchcard.EmptyName.selector);
        punchcard.create("", 5, 0.1 ether, 3600);

        // Name too long (> 40 bytes)
        vm.expectRevert(Punchcard.NameTooLong.selector);
        punchcard.create("12345678901234567890123456789012345678901", 5, 0.1 ether, 3600);

        // Bad needed (< 2 or > 30)
        vm.expectRevert(Punchcard.BadNeeded.selector);
        punchcard.create("Shop", 1, 0.1 ether, 3600);
        vm.expectRevert(Punchcard.BadNeeded.selector);
        punchcard.create("Shop", 31, 0.1 ether, 3600);

        // Zero reward
        vm.expectRevert(Punchcard.ZeroReward.selector);
        punchcard.create("Shop", 5, 0, 3600);

        // Bad cooldown (< 3600 or > 604800)
        vm.expectRevert(Punchcard.BadCooldown.selector);
        punchcard.create("Shop", 5, 0.1 ether, 3599);
        vm.expectRevert(Punchcard.BadCooldown.selector);
        punchcard.create("Shop", 5, 0.1 ether, 604801);

        vm.stopPrank();
    }

    function test_BoundariesValid() public {
        vm.startPrank(shop);

        // Exactly 40 bytes name, needed 2, cooldown 3600
        string memory name40 = "1234567890123456789012345678901234567890";
        uint256 id1 = punchcard.create(name40, 2, 1, 3600);
        assertEq(punchcard.programOf(id1).needed, 2);

        // Exactly needed 30, cooldown 604800
        uint256 id2 = punchcard.create("Max 30", 30, 1 ether, 604800);
        assertEq(punchcard.programOf(id2).needed, 30);

        vm.stopPrank();
    }

    function test_StampIncrements() public {
        vm.prank(shop);
        uint256 id = punchcard.create{value: 1 ether}("Coffee", 3, 0.1 ether, 1 hours);

        vm.prank(shop);
        punchcard.stamp(id, alice);

        Punchcard.Card memory c = punchcard.cardOf(id, alice);
        assertEq(c.stamps, 1);
        assertEq(c.lastStamp, block.timestamp);
        assertEq(punchcard.programOf(id).ready, 0);

        // Advance past cooldown
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, alice);

        c = punchcard.cardOf(id, alice);
        assertEq(c.stamps, 2);

        // Third stamp completes card
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, alice);

        c = punchcard.cardOf(id, alice);
        assertEq(c.stamps, 3);
        assertEq(punchcard.programOf(id).ready, 1);
    }

    function test_OnlyShopStamps() public {
        vm.prank(shop);
        uint256 id = punchcard.create("Coffee", 3, 0.1 ether, 1 hours);

        vm.prank(alice);
        vm.expectRevert(Punchcard.NotShop.selector);
        punchcard.stamp(id, alice);
    }

    function test_CooldownEnforced_ArgsReadyAt() public {
        vm.prank(shop);
        uint256 id = punchcard.create("Coffee", 3, 0.1 ether, 1 hours);

        vm.prank(shop);
        punchcard.stamp(id, alice);

        // Stamping too soon: should revert with expected readyAt
        uint256 expectedReadyAt = block.timestamp + 1 hours;
        vm.prank(shop);
        vm.expectRevert(abi.encodeWithSelector(Punchcard.TooSoon.selector, expectedReadyAt));
        punchcard.stamp(id, alice);

        // Advance 3599 seconds: still too soon
        vm.warp(block.timestamp + 3599);
        vm.prank(shop);
        vm.expectRevert(abi.encodeWithSelector(Punchcard.TooSoon.selector, expectedReadyAt));
        punchcard.stamp(id, alice);

        // Advance exactly 1 second more: ready
        vm.warp(expectedReadyAt);
        vm.prank(shop);
        punchcard.stamp(id, alice);
        assertEq(punchcard.cardOf(id, alice).stamps, 2);
    }

    function test_SelfStampReverts() public {
        vm.prank(shop);
        uint256 id = punchcard.create("Coffee", 3, 0.1 ether, 1 hours);

        vm.prank(shop);
        vm.expectRevert(Punchcard.SelfStamp.selector);
        punchcard.stamp(id, shop);
    }

    function test_FullCardCannotBeStampedMore() public {
        vm.prank(shop);
        uint256 id = punchcard.create{value: 1 ether}("Coffee", 2, 0.1 ether, 1 hours);

        vm.prank(shop);
        punchcard.stamp(id, alice);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, alice);

        // Card is now at 2 (needed == 2)
        assertEq(punchcard.cardOf(id, alice).stamps, 2);

        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        vm.expectRevert(Punchcard.CardFull.selector);
        punchcard.stamp(id, alice);
    }

    function test_RedeemPaysAndResets() public {
        vm.prank(shop);
        uint256 id = punchcard.create{value: 1 ether}("Coffee", 2, 0.1 ether, 1 hours);

        // Alice completes card
        vm.prank(shop);
        punchcard.stamp(id, alice);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, alice);

        assertEq(punchcard.programOf(id).ready, 1);
        assertEq(punchcard.programOf(id).pool, 1 ether);

        // Alice redeems
        vm.prank(alice);
        punchcard.redeem(id);

        // Card stamps reset to 0
        assertEq(punchcard.cardOf(id, alice).stamps, 0);
        // Ready count decremented
        assertEq(punchcard.programOf(id).ready, 0);
        // Redeemed count incremented
        assertEq(punchcard.programOf(id).redeemedCount, 1);
        // Pool decremented
        assertEq(punchcard.programOf(id).pool, 0.9 ether);
        // Pending credited
        assertEq(punchcard.pending(alice), 0.1 ether);

        // Alice withdraws
        uint256 beforeBal = alice.balance;
        vm.prank(alice);
        punchcard.withdraw();
        assertEq(alice.balance - beforeBal, 0.1 ether);
        assertEq(punchcard.pending(alice), 0);
    }

    function test_RedeemRevertsWhenPoolEmpty_KeepsCard() public {
        // Pool initially 0
        vm.prank(shop);
        uint256 id = punchcard.create("Coffee", 2, 0.1 ether, 1 hours);

        vm.prank(shop);
        punchcard.stamp(id, alice);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, alice);

        // Attempt redeem with empty pool
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Punchcard.PoolEmpty.selector, 0, 0.1 ether));
        punchcard.redeem(id);

        // Card retains full status
        assertEq(punchcard.cardOf(id, alice).stamps, 2);
        assertEq(punchcard.programOf(id).ready, 1);

        // Shop funds pool
        vm.prank(shop);
        punchcard.fund{value: 0.1 ether}(id);

        // Now Alice redeems successfully
        vm.prank(alice);
        punchcard.redeem(id);
        assertEq(punchcard.cardOf(id, alice).stamps, 0);
        assertEq(punchcard.pending(alice), 0.1 ether);
    }

    function test_ReleaseFreeRespectsReserved() public {
        // Pool 0.5 BOT, reward 0.1 BOT, needed 2
        vm.prank(shop);
        uint256 id = punchcard.create{value: 0.5 ether}("Coffee", 2, 0.1 ether, 1 hours);

        // Alice gets 2 stamps (ready = 1, reserved = 0.1 BOT, free = 0.4 BOT)
        vm.prank(shop);
        punchcard.stamp(id, alice);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, alice);

        assertEq(punchcard.freePool(id), 0.4 ether);

        // Bob gets 2 stamps (ready = 2, reserved = 0.2 BOT, free = 0.3 BOT)
        vm.prank(shop);
        punchcard.stamp(id, bob);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, bob);

        assertEq(punchcard.freePool(id), 0.3 ether);

        // Shop attempts to release 0.31 BOT (exceeds free pool of 0.3 BOT)
        vm.startPrank(shop);
        vm.expectRevert(abi.encodeWithSelector(Punchcard.Reserved.selector, 0.3 ether));
        punchcard.releaseFree(id, 0.31 ether);

        // Shop successfully releases 0.2 BOT
        punchcard.releaseFree(id, 0.2 ether);
        assertEq(punchcard.freePool(id), 0.1 ether);
        assertEq(punchcard.programOf(id).pool, 0.3 ether);
        assertEq(punchcard.pending(shop), 0.2 ether);

        vm.stopPrank();
    }

    function test_ReleaseExactFreePool() public {
        vm.prank(shop);
        uint256 id = punchcard.create{value: 1 ether}("Coffee", 2, 0.1 ether, 1 hours);

        assertEq(punchcard.freePool(id), 1 ether);

        // Releasing exactly 1 ether (amount == free) must succeed
        vm.prank(shop);
        punchcard.releaseFree(id, 1 ether);

        assertEq(punchcard.freePool(id), 0);
        assertEq(punchcard.programOf(id).pool, 0);
        assertEq(punchcard.pending(shop), 1 ether);
    }

    function test_FundByAnyone() public {
        vm.prank(shop);
        uint256 id = punchcard.create("Coffee", 2, 0.1 ether, 1 hours);

        vm.prank(charlie);
        punchcard.fund{value: 0.5 ether}(id);

        assertEq(punchcard.programOf(id).pool, 0.5 ether);
        assertEq(punchcard.freePool(id), 0.5 ether);
    }

    function test_ReentrantWithdrawBlocked() public {
        MaliciousRecipient mal = new MaliciousRecipient(punchcard);
        address malAddr = address(mal);

        // Fund program and complete card for malAddr
        vm.prank(shop);
        uint256 id = punchcard.create{value: 1 ether}("Coffee", 2, 0.1 ether, 1 hours);

        vm.prank(shop);
        punchcard.stamp(id, malAddr);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(shop);
        punchcard.stamp(id, malAddr);

        vm.prank(malAddr);
        punchcard.redeem(id);
        assertEq(punchcard.pending(malAddr), 0.1 ether);

        // Attempt reentrant withdraw
        vm.prank(malAddr);
        punchcard.withdraw();

        assertEq(bytes4(mal.lastRevertData()), Punchcard.ReentrantCall.selector);
    }

    function test_WithdrawEmptyBalanceReverts() public {
        vm.prank(alice);
        vm.expectRevert(Punchcard.NothingToWithdraw.selector);
        punchcard.withdraw();
    }

    function test_LatestQuery() public {
        vm.startPrank(shop);
        punchcard.create("P1", 2, 0.1 ether, 1 hours);
        punchcard.create("P2", 3, 0.2 ether, 2 hours);
        punchcard.create("P3", 4, 0.3 ether, 3 hours);
        vm.stopPrank();

        (Punchcard.Program[] memory progs, uint256[] memory ids) = punchcard.latest(0, 2);
        assertEq(progs.length, 2);
        assertEq(ids[0], 3);
        assertEq(ids[1], 2);
        assertEq(progs[0].name, "P3");
        assertEq(progs[1].name, "P2");

        (Punchcard.Program[] memory p2, uint256[] memory ids2) = punchcard.latest(2, 5);
        assertEq(p2.length, 1);
        assertEq(ids2[0], 1);
        assertEq(p2[0].name, "P1");
    }

    // --- Fuzz Tests ---

    function testFuzz_BalanceConservation(uint128 pool1, uint128 fundAmount) public {
        vm.assume(pool1 <= 50 ether);
        vm.assume(fundAmount <= 50 ether);

        vm.prank(shop);
        uint256 id = punchcard.create{value: pool1}("Fuzz", 2, 0.05 ether, 1 hours);

        vm.prank(charlie);
        if (fundAmount > 0) {
            punchcard.fund{value: fundAmount}(id);
        }

        assertEq(address(punchcard).balance, uint256(pool1) + uint256(fundAmount));
    }

    function testFuzz_ReservedNeverReleased(uint8 readyCount, uint128 reward) public {
        vm.assume(readyCount >= 1 && readyCount <= 10);
        vm.assume(reward >= 1 ether && reward <= 10 ether);

        uint128 initialPool = uint128(readyCount) * reward + 5 ether;

        vm.prank(shop);
        uint256 id = punchcard.create{value: initialPool}("Fuzz", 2, reward, 1 hours);

        // Manually simulate readyCount users becoming ready
        for (uint8 i = 0; i < readyCount; i++) {
            address cust = address(uint160(0x9000 + i));
            vm.prank(shop);
            punchcard.stamp(id, cust);
            vm.warp(block.timestamp + 1 hours);
            vm.prank(shop);
            punchcard.stamp(id, cust);
        }

        uint128 free = punchcard.freePool(id);
        assertEq(free, 5 ether);

        // Attempting to release more than free should always revert
        vm.prank(shop);
        vm.expectRevert(abi.encodeWithSelector(Punchcard.Reserved.selector, free));
        punchcard.releaseFree(id, free + 1);
    }
}
