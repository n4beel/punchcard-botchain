// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Punchcard
 * @notice Customer loyalty stamp card that pays out in BOT from a shop-funded pool.
 * @dev Spec: 21-punchcard.md (Archetype Z · Card stack).
 */
contract Punchcard {
    // --- Limits ---
    uint32 public constant MIN_NEEDED = 2;
    uint32 public constant MAX_NEEDED = 30;
    uint32 public constant MIN_COOLDOWN = 1 hours; // 3600 seconds
    uint32 public constant MAX_COOLDOWN = 7 days;  // 604800 seconds
    uint256 public constant MAX_NAME_BYTES = 40;
    uint256 public constant MAX_BATCH_VIEW = 50;

    // --- Structs ---
    struct Program {
        address shop;
        uint128 reward;
        uint32 needed;         // stamps required, 2..30
        uint32 cooldown;       // seconds between stamps for one customer, 1 hour..7 days
        uint32 ready;          // customers at `needed` and not yet redeemed
        uint32 redeemedCount;
        uint128 pool;          // BOT held for rewards
        string name;           // <= 40 bytes
    }

    struct Card {
        uint32 stamps;
        uint64 lastStamp;
    }

    // --- State ---
    mapping(uint256 => Program) private _programs;
    mapping(uint256 => mapping(address => Card)) private _cards;
    mapping(address => uint256[]) private _byShop;
    mapping(address => uint256) public pending;
    uint256 public programCount;

    // Reentrancy guard state
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // --- Events ---
    event Created(
        uint256 indexed id,
        address indexed shop,
        string name,
        uint32 needed,
        uint128 reward,
        uint32 cooldown,
        uint128 pool
    );
    event Funded(uint256 indexed id, address indexed from, uint256 amount);
    event Stamped(uint256 indexed id, address indexed customer, uint32 stamps);
    event Redeemed(uint256 indexed id, address indexed customer, uint128 reward);
    event Released(uint256 indexed id, uint128 amount);
    event Withdrawn(address indexed recipient, uint256 amount);

    // --- Custom Errors ---
    error NoSuchProgram();
    error EmptyName();
    error NameTooLong();
    error BadNeeded();
    error ZeroReward();
    error BadCooldown();
    error ZeroCustomer();
    error NotShop();
    error SelfStamp();
    error CardFull();
    error TooSoon(uint256 readyAt);
    error NotFull();
    error PoolEmpty(uint128 pool, uint128 reward);
    error Reserved(uint128 free);
    error ZeroAmount();
    error NothingToWithdraw();
    error TransferFailed();
    error ReentrantCall();

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    constructor() {
        _reentrancyStatus = _NOT_ENTERED;
    }

    // --- Core Functions ---

    /**
     * @notice Creates a new loyalty programme.
     * @param name Descriptive title (1..40 bytes)
     * @param needed Number of stamps required to redeem (2..30)
     * @param reward BOT payout per full card (> 0)
     * @param cooldown Minimum seconds between stamps for a customer (1 hour..7 days)
     */
    function create(
        string calldata name,
        uint32 needed,
        uint128 reward,
        uint32 cooldown
    ) external payable returns (uint256 id) {
        bytes memory nameBytes = bytes(name);
        if (nameBytes.length == 0) revert EmptyName();
        if (nameBytes.length > MAX_NAME_BYTES) revert NameTooLong();
        if (needed < MIN_NEEDED || needed > MAX_NEEDED) revert BadNeeded();
        if (reward == 0) revert ZeroReward();
        if (cooldown < MIN_COOLDOWN || cooldown > MAX_COOLDOWN) revert BadCooldown();

        id = ++programCount;
        _programs[id] = Program({
            shop: msg.sender,
            reward: reward,
            needed: needed,
            cooldown: cooldown,
            ready: 0,
            redeemedCount: 0,
            pool: uint128(msg.value),
            name: name
        });

        _byShop[msg.sender].push(id);

        emit Created(id, msg.sender, name, needed, reward, cooldown, uint128(msg.value));
    }

    /**
     * @notice Adds BOT to a programme's reward pool.
     * @param id The programme ID
     */
    function fund(uint256 id) external payable {
        if (id == 0 || id > programCount) revert NoSuchProgram();
        if (msg.value == 0) revert ZeroAmount();

        _programs[id].pool += uint128(msg.value);
        emit Funded(id, msg.sender, msg.value);
    }

    /**
     * @notice Shop stamps a customer's card.
     * @param id The programme ID
     * @param customer The customer's address
     */
    function stamp(uint256 id, address customer) external {
        if (id == 0 || id > programCount) revert NoSuchProgram();
        Program storage p = _programs[id];

        if (msg.sender != p.shop) revert NotShop();
        if (customer == address(0)) revert ZeroCustomer();
        if (customer == p.shop) revert SelfStamp();

        Card storage c = _cards[id][customer];
        if (c.stamps >= p.needed) revert CardFull();

        if (c.lastStamp != 0) {
            uint256 readyAt = uint256(c.lastStamp) + uint256(p.cooldown);
            if (block.timestamp < readyAt) revert TooSoon(readyAt);
        }

        c.stamps++;
        c.lastStamp = uint64(block.timestamp);

        if (c.stamps == p.needed) {
            p.ready++;
        }

        emit Stamped(id, customer, c.stamps);
    }

    /**
     * @notice Customer cashes in a completed card.
     * @param id The programme ID
     */
    function redeem(uint256 id) external {
        if (id == 0 || id > programCount) revert NoSuchProgram();
        Program storage p = _programs[id];
        Card storage c = _cards[id][msg.sender];

        if (c.stamps != p.needed) revert NotFull();
        if (p.pool < p.reward) revert PoolEmpty(p.pool, p.reward);

        p.pool -= p.reward;
        pending[msg.sender] += p.reward;
        c.stamps = 0;
        p.ready--;
        p.redeemedCount++;

        emit Redeemed(id, msg.sender, p.reward);
    }

    /**
     * @notice Shop releases and reclaims unreserved funds from the reward pool.
     * @dev Free pool = pool - ready * reward. Reclaimed funds move to pending[shop].
     * @param id The programme ID
     * @param amount The amount to release
     */
    function releaseFree(uint256 id, uint128 amount) external {
        if (id == 0 || id > programCount) revert NoSuchProgram();
        Program storage p = _programs[id];

        if (msg.sender != p.shop) revert NotShop();
        if (amount == 0) revert ZeroAmount();

        uint128 reserved = uint128(p.ready) * p.reward;
        uint128 free = p.pool > reserved ? p.pool - reserved : 0;
        if (amount > free) revert Reserved(free);

        p.pool -= amount;
        pending[p.shop] += amount;

        emit Released(id, amount);
    }

    /**
     * @notice Pull payment withdrawal for earned rewards or released pool funds.
     */
    function withdraw() external nonReentrant {
        uint256 bal = pending[msg.sender];
        if (bal == 0) revert NothingToWithdraw();

        pending[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: bal}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, bal);
    }

    // --- View Functions ---

    function programOf(uint256 id) external view returns (Program memory) {
        if (id == 0 || id > programCount) revert NoSuchProgram();
        return _programs[id];
    }

    function cardOf(uint256 id, address who) external view returns (Card memory) {
        if (id == 0 || id > programCount) revert NoSuchProgram();
        return _cards[id][who];
    }

    function freePool(uint256 id) external view returns (uint128) {
        if (id == 0 || id > programCount) revert NoSuchProgram();
        Program storage p = _programs[id];
        uint128 reserved = uint128(p.ready) * p.reward;
        return p.pool > reserved ? p.pool - reserved : 0;
    }

    function byShop(address shop) external view returns (uint256[] memory) {
        return _byShop[shop];
    }

    function latest(uint256 offset, uint256 count)
        external
        view
        returns (Program[] memory progs, uint256[] memory ids)
    {
        if (count > MAX_BATCH_VIEW) count = MAX_BATCH_VIEW;
        if (programCount == 0 || offset >= programCount) {
            return (new Program[](0), new uint256[](0));
        }

        uint256 maxAvailable = programCount - offset;
        uint256 n = count < maxAvailable ? count : maxAvailable;

        progs = new Program[](n);
        ids = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            uint256 currentId = programCount - offset - i;
            ids[i] = currentId;
            progs[i] = _programs[currentId];
        }
    }
}
