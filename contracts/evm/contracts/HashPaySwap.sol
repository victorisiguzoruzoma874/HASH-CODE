// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  HashPaySwap
 * @notice Routes token swaps through Uniswap V3 and deposits output
 *         into HashPayEscrow in a single atomic transaction.
 *
 * This is the EVM equivalent of swap_manager.move on Aptos.
 */

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);
}

interface IHashPayEscrow {
    function deposit(address token, uint256 amount, bytes32 orderId) external;
}

contract HashPaySwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISwapRouter     public immutable uniswapRouter;
    IHashPayEscrow  public immutable escrow;

    uint24  public constant POOL_FEE = 3000;  // 0.3% Uniswap pool
    uint256 public feeBps = 50;               // 0.5% HashPay fee
    address public treasury;

    event SwapAndEscrowed(
        bytes32 indexed orderId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );

    constructor(
        address _router,
        address _escrow,
        address _treasury
    ) Ownable(msg.sender) {
        uniswapRouter = ISwapRouter(_router);
        escrow        = IHashPayEscrow(_escrow);
        treasury      = _treasury;
    }

    /**
     * @notice Swap tokenIn → tokenOut via Uniswap V3, then deposit
     *         the output into HashPayEscrow — all in one tx.
     *
     * @param tokenIn       Input token address
     * @param tokenOut      Output token address (usually USDC)
     * @param amountIn      Amount of tokenIn to swap
     * @param amountOutMin  Minimum acceptable output (slippage guard)
     * @param orderId       Unique order ID for escrow
     */
    function swapAndEscrow(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        bytes32 orderId
    ) external nonReentrant {
        require(amountIn > 0,       "Amount must be > 0");
        require(tokenIn != tokenOut, "Same token");

        // 1. Pull tokenIn from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // 2. Approve Uniswap router
        IERC20(tokenIn).safeIncreaseAllowance(address(uniswapRouter), amountIn);

        // 3. Swap via Uniswap V3
        uint256 amountOut = uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               POOL_FEE,
                recipient:         address(this),
                amountIn:          amountIn,
                amountOutMinimum:  amountOutMin,
                sqrtPriceLimitX96: 0
            })
        );

        // 4. Deduct HashPay fee
        uint256 fee       = (amountOut * feeBps) / 10_000;
        uint256 netAmount = amountOut - fee;

        if (fee > 0) {
            IERC20(tokenOut).safeTransfer(treasury, fee);
        }

        // 5. Approve escrow and deposit
        IERC20(tokenOut).safeIncreaseAllowance(address(escrow), netAmount);
        escrow.deposit(tokenOut, netAmount, orderId);

        emit SwapAndEscrowed(orderId, msg.sender, tokenIn, tokenOut, amountIn, netAmount, fee);
    }

    function setFeeBps(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Fee too high");
        feeBps = newFee;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid");
        treasury = newTreasury;
    }
}
