// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/Punchcard.sol";

contract PunchcardHandler is Test {
    Punchcard public punchcard;

    address[] public shops;
    address[] public customers;
    uint256[] public programIds;

    uint256 public totalPendingAdded;
    uint256 public totalWithdrawn;

    constructor(Punchcard _punchcard) {
        punchcard = _punchcard;

        shops.push(address(0x1001));
        shops.push(address(0x1002));

        customers.push(address(0x2001));
        customers.push(address(0x2002));
        customers.push(address(0x2003));

        for (uint256 i = 0; i < shops.length; i++) {
            vm.deal(shops[i], 1000 ether);
        }
        for (uint256 i = 0; i < customers.length; i++) {
            vm.deal(customers[i], 100 ether);
        }
    }

    function createProgram(uint256 shopIndex, uint128 initialPool) external {
        if (programIds.length >= 4) return;
        address shop = shops[shopIndex % shops.length];
        initialPool = uint128(bound(initialPool, 0, 10 ether));

        vm.prank(shop);
        uint256 id = punchcard.create{value: initialPool}("Shop Prog", 3, 0.1 ether, 1 hours);
        programIds.push(id);
    }

    function fundProgram(uint256 progIndex, uint128 amount) external {
        if (programIds.length == 0) return;
        uint256 id = programIds[progIndex % programIds.length];
        amount = uint128(bound(amount, 0.01 ether, 5 ether));

        address funder = customers[0];
        vm.prank(funder);
        punchcard.fund{value: amount}(id);
    }

    function stampCustomer(uint256 progIndex, uint256 custIndex) external {
        if (programIds.length == 0) return;
        uint256 id = programIds[progIndex % programIds.length];
        address cust = customers[custIndex % customers.length];

        Punchcard.Program memory p = punchcard.programOf(id);
        Punchcard.Card memory c = punchcard.cardOf(id, cust);

        if (c.stamps >= p.needed) return;

        // Advance warp past cooldown
        if (c.lastStamp != 0) {
            vm.warp(uint256(c.lastStamp) + uint256(p.cooldown) + 1);
        }

        vm.prank(p.shop);
        punchcard.stamp(id, cust);
    }

    function redeemCard(uint256 progIndex, uint256 custIndex) external {
        if (programIds.length == 0) return;
        uint256 id = programIds[progIndex % programIds.length];
        address cust = customers[custIndex % customers.length];

        Punchcard.Program memory p = punchcard.programOf(id);
        Punchcard.Card memory c = punchcard.cardOf(id, cust);

        if (c.stamps != p.needed) return;
        if (p.pool < p.reward) return;

        vm.prank(cust);
        punchcard.redeem(id);
        totalPendingAdded += p.reward;
    }

    function releaseFreePool(uint256 progIndex, uint128 amount) external {
        if (programIds.length == 0) return;
        uint256 id = programIds[progIndex % programIds.length];

        Punchcard.Program memory p = punchcard.programOf(id);
        uint128 free = punchcard.freePool(id);
        if (free == 0) return;

        amount = uint128(bound(amount, 1, free));

        vm.prank(p.shop);
        punchcard.releaseFree(id, amount);
        totalPendingAdded += amount;
    }

    function withdrawPending(uint256 actorIndex) external {
        address actor;
        if (actorIndex % 2 == 0) {
            actor = shops[(actorIndex / 2) % shops.length];
        } else {
            actor = customers[(actorIndex / 2) % customers.length];
        }

        uint256 bal = punchcard.pending(actor);
        if (bal == 0) return;

        vm.prank(actor);
        punchcard.withdraw();
        totalWithdrawn += bal;
    }

    function getProgramIds() external view returns (uint256[] memory) {
        return programIds;
    }

    function getCustomers() external view returns (address[] memory) {
        return customers;
    }

    function getShops() external view returns (address[] memory) {
        return shops;
    }
}

contract PunchcardInvariantTest is Test {
    Punchcard public punchcard;
    PunchcardHandler public handler;

    function setUp() public {
        punchcard = new Punchcard();
        handler = new PunchcardHandler(punchcard);

        // Seed 1 initial program via handler
        handler.createProgram(0, 2 ether);

        targetContract(address(handler));
    }

    function invariant_SolvencyAlwaysHolds() public view {
        uint256 sumPools = 0;
        uint256 count = punchcard.programCount();
        for (uint256 i = 1; i <= count; i++) {
            sumPools += punchcard.programOf(i).pool;
        }

        uint256 sumPending = 0;
        address[] memory shops = handler.getShops();
        for (uint256 i = 0; i < shops.length; i++) {
            sumPending += punchcard.pending(shops[i]);
        }
        address[] memory customers = handler.getCustomers();
        for (uint256 i = 0; i < customers.length; i++) {
            sumPending += punchcard.pending(customers[i]);
        }

        assertEq(address(punchcard).balance, sumPools + sumPending);
    }

    function invariant_StampsNeverExceedNeeded() public view {
        uint256 count = punchcard.programCount();
        address[] memory customers = handler.getCustomers();

        for (uint256 i = 1; i <= count; i++) {
            Punchcard.Program memory p = punchcard.programOf(i);
            for (uint256 j = 0; j < customers.length; j++) {
                Punchcard.Card memory c = punchcard.cardOf(i, customers[j]);
                assertLe(c.stamps, p.needed);
            }
        }
    }

    function invariant_FreePoolMatchesReserved() public view {
        uint256 count = punchcard.programCount();
        for (uint256 i = 1; i <= count; i++) {
            Punchcard.Program memory p = punchcard.programOf(i);
            uint128 reserved = uint128(p.ready) * p.reward;
            uint128 free = punchcard.freePool(i);
            if (p.pool > reserved) {
                assertEq(free, p.pool - reserved);
            } else {
                assertEq(free, 0);
            }
        }
    }
}
