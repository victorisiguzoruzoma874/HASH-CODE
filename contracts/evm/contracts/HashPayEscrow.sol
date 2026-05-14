// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title  HashPayEscrow
 * @notice EVM-side escrow contract for HashPay's crypto → fiat offramp.
 *
 * Flow:
 *   1. User calls deposit(token, amount) — funds locked in contract
 *   2. Backend listens for DepositReceived event
 *   3. Backend triggers NGN payout via Flutterwave
 *   4. On success: owner calls release(orderId) to move funds to treasury
 *   5. On failure: owner calls refund(orderId) to return funds to user
 *
 * Security:
 *   - ReentrancyGuard on all state-changing functions
 *   - Pausable for emergency stops
 *   - Ownable — only owner (treasury multisig) can release/refund
 *   - Idempotency via orderId mapping
 *   - SafeERC20 for token transfers
 */
contract HashPayEscrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ── Types ────────────────────────────────────────────────

    enum OrderStatus { NONE, PENDING, RELEASED, REFUNDED }

    struct Order {
        address user;
        address token;
        uint256 amount;
        OrderStatus status;
        uint256 createdAt;
        string  payoutRef;
    }

    // ── State ────────────────────────────────────────────────

    mapping(bytes32 => Order) public orders;
    mapping(address => bool)  public supportedTokens;

    uint256 public feeBps = 50;          // 0.5% platform fee
    uint256 public constant MAX_FEE = 500; // 5% max
    address public treasury;

    uint256 public totalDeposited;
    uint256 public totalReleased;
    uint256 public totalRefunded;

    // ── Events ───────────────────────────────────────────────

    event DepositReceived(
        bytes32 indexed orderId,
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 netAmount,
        uint256 fee,
        uint256 timestamp
    );

    event OrderReleased(
        bytes32 indexed orderId,
        address indexed user,
        string  payoutRef,
        uint256 timestamp
    );

    event OrderRefunded(
        bytes32 indexed orderId,
        address indexed user,
        string  reason,
        uint256 timestamp
    );

    event TokenSupported(address indexed token, bool supported);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ── Constructor ──────────────────────────────────────────

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    // ── User functions ───────────────────────────────────────

    /**
     * @notice Deposit ERC-20 tokens into escrow.
     * @param  token    ERC-20 token address (USDC, USDT, WETH, etc.)
     * @param  amount   Amount in token's native decimals
     * @param  orderId  Unique order ID (generated off-chain, prevents replay)
     */
    function deposit(
        address token,
        uint256 amount,
        bytes32 orderId
    ) external nonReentrant whenNotPaused {
        require(supportedTokens[token],          "Token not supported");
        require(amount > 0,                       "Amount must be > 0");
        require(orders[orderId].status == OrderStatus.NONE, "Order already exists");

        // Calculate fee
        uint256 fee       = (amount * feeBps) / 10_000;
        uint256 netAmount = amount - fee;

        // Transfer full amount from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Send fee to treasury immediately
        if (fee > 0) {
            IERC20(token).safeTransfer(treasury, fee);
        }

        // Record order
        orders[orderId] = Order({
            user:      msg.sender,
            token:     token,
            amount:    netAmount,
            status:    OrderStatus.PENDING,
            createdAt: block.timestamp,
            payoutRef: ""
        });

        totalDeposited += netAmount;

        emit DepositReceived(orderId, msg.sender, token, amount, netAmount, fee, block.timestamp);
    }

    /**
     * @notice Deposit native ETH into escrow.
     */
    function depositETH(bytes32 orderId) external payable nonReentrant whenNotPaused {
        require(msg.value > 0,                    "Amount must be > 0");
        require(orders[orderId].status == OrderStatus.NONE, "Order already exists");

        uint256 fee       = (msg.value * feeBps) / 10_000;
        uint256 netAmount = msg.value - fee;

        if (fee > 0) {
            (bool ok,) = treasury.call{value: fee}("");
            require(ok, "Fee transfer failed");
        }

        orders[orderId] = Order({
            user:      msg.sender,
            token:     address(0),  // address(0) = native ETH
            amount:    netAmount,
            status:    OrderStatus.PENDING,
            createdAt: block.timestamp,
            payoutRef: ""
        });

        totalDeposited += netAmount;

        emit DepositReceived(orderId, msg.sender, address(0), msg.value, netAmount, fee, block.timestamp);
    }

    // ── Owner functions ──────────────────────────────────────

    /**
     * @notice Release funds to treasury after confirmed fiat payout.
     * @param  orderId   The order to release
     * @param  payoutRef Flutterwave / Paystack reference for audit trail
     */
    function release(bytes32 orderId, string calldata payoutRef)
        external onlyOwner nonReentrant
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "Order not pending");

        order.status    = OrderStatus.RELEASED;
        order.payoutRef = payoutRef;
        totalReleased  += order.amount;

        if (order.token == address(0)) {
            (bool ok,) = treasury.call{value: order.amount}("");
            require(ok, "ETH transfer failed");
        } else {
            IERC20(order.token).safeTransfer(treasury, order.amount);
        }

        emit OrderReleased(orderId, order.user, payoutRef, block.timestamp);
    }

    /**
     * @notice Refund user if KYC fails or payout fails.
     * @param  orderId  The order to refund
     * @param  reason   Human-readable reason for audit trail
     */
    function refund(bytes32 orderId, string calldata reason)
        external onlyOwner nonReentrant
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PENDING, "Order not pending");

        order.status   = OrderStatus.REFUNDED;
        totalRefunded += order.amount;

        if (order.token == address(0)) {
            (bool ok,) = order.user.call{value: order.amount}("");
            require(ok, "ETH refund failed");
        } else {
            IERC20(order.token).safeTransfer(order.user, order.amount);
        }

        emit OrderRefunded(orderId, order.user, reason, block.timestamp);
    }

    // ── Admin ────────────────────────────────────────────────

    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    function setFeeBps(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        emit FeeUpdated(feeBps, newFee);
        feeBps = newFee;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── View ─────────────────────────────────────────────────

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getStats() external view returns (uint256, uint256, uint256) {
        return (totalDeposited, totalReleased, totalRefunded);
    }

    receive() external payable {}
}
