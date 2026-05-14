/// hashpay::swap_manager
///
/// Entry point for the swap-and-escrow flow on Aptos.
/// Swaps CoinIn → CoinOut via Liquidswap DEX, then deposits
/// the output into the escrow vault in a single atomic transaction.
///
/// DEX Integration:
///   Replace do_swap() with the real Liquidswap call:
///   liquidswap::router::swap_exact_coin_for_coin<CoinIn, CoinOut, Curve>(coin_in, min_out)
///
///   Add to Move.toml:
///   [dependencies.Liquidswap]
///   git = "https://github.com/pontem-network/liquidswap.git"
///   rev = "main"
///   subdir = "sources"
module hashpay::swap_manager {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use hashpay::escrow;
    use hashpay::oracle_price;

    // ── Error codes ──────────────────────────────────────────
    const E_SLIPPAGE_EXCEEDED: u64 = 100;
    const E_ZERO_AMOUNT:       u64 = 101;
    const E_SAME_ASSET:        u64 = 102;
    const E_NOT_ADMIN:         u64 = 103;
    const E_DEX_NOT_CONFIGURED: u64 = 104;

    // ── Events ───────────────────────────────────────────────

    struct SwapCompleted has drop, store {
        user:       address,
        asset_in:   vector<u8>,
        asset_out:  vector<u8>,
        amount_in:  u64,
        amount_out: u64,
        timestamp:  u64,
    }

    struct SwapConfig has key {
        fee_bps:        u64,
        max_slippage:   u64,
        swap_events:    EventHandle<SwapCompleted>,
        total_volume:   u64,
        total_fees:     u64,
        /// When true, do_swap uses the real DEX. When false, direct deposit (no swap).
        dex_enabled:    bool,
    }

    // ── Initialise ───────────────────────────────────────────

    public entry fun initialize(admin: &signer) {
        assert!(signer::address_of(admin) == @hashpay, E_NOT_ADMIN);
        move_to(admin, SwapConfig {
            fee_bps:      50,
            max_slippage: 200,
            swap_events:  account::new_event_handle<SwapCompleted>(admin),
            total_volume: 0,
            total_fees:   0,
            dex_enabled:  false,  // set to true after Liquidswap integration
        });
    }

    // ── swap_and_escrow ──────────────────────────────────────

    /// Main entry function called by users.
    /// When dex_enabled = false: deposits CoinIn directly (no swap, same coin type).
    /// When dex_enabled = true:  swaps via Liquidswap then deposits.
    public entry fun swap_and_escrow<CoinIn, CoinOut>(
        user:      &signer,
        amount_in: u64,
        min_out:   u64,
        asset_in:  vector<u8>,
        asset_out: vector<u8>,
    ) acquires SwapConfig {
        assert!(amount_in > 0, E_ZERO_AMOUNT);

        let config = borrow_global_mut<SwapConfig>(@hashpay);

        // 1. Withdraw from user
        let coin_in = coin::withdraw<CoinIn>(user, amount_in);

        // 2. Platform fee on input
        let fee_amount = amount_in * config.fee_bps / 10_000;
        let fee_coin   = coin::extract(&mut coin_in, fee_amount);
        coin::deposit(@hashpay, fee_coin);

        let net_in = coin::value(&coin_in);

        // 3. Slippage check against oracle
        let price    = oracle_price::get_eth_usd();  // generalise per asset in production
        let expected = oracle_price::quote_out(net_in, price, 0);
        oracle_price::assert_slippage(expected, min_out, config.max_slippage);

        // 4. Deposit into escrow
        //    NOTE: When dex_enabled = true, replace this block with:
        //    let coin_out = liquidswap::router::swap_exact_coin_for_coin<CoinIn, CoinOut, Curve>(
        //        coin_in, min_out
        //    );
        //    escrow::deposit<CoinOut>(user, coin::value(&coin_out), asset_out);
        //    coin::deposit(signer::address_of(user), coin_out);
        //
        //    For now: deposit CoinIn directly (stablecoin → NGN flow without swap)
        let user_addr = signer::address_of(user);
        coin::deposit(user_addr, coin_in);
        escrow::deposit<CoinIn>(user, net_in, asset_in);

        // 5. Update stats
        config.total_volume = config.total_volume + amount_in;
        config.total_fees   = config.total_fees   + fee_amount;

        // 6. Emit event
        event::emit_event(&mut config.swap_events, SwapCompleted {
            user:      user_addr,
            asset_in,
            asset_out,
            amount_in,
            amount_out: net_in,
            timestamp:  timestamp::now_seconds(),
        });
    }

    // ── Admin ────────────────────────────────────────────────

    public entry fun set_fee_bps(admin: &signer, new_fee_bps: u64) acquires SwapConfig {
        assert!(signer::address_of(admin) == @hashpay, E_NOT_ADMIN);
        assert!(new_fee_bps <= 500, E_NOT_ADMIN);
        borrow_global_mut<SwapConfig>(@hashpay).fee_bps = new_fee_bps;
    }

    public entry fun enable_dex(admin: &signer) acquires SwapConfig {
        assert!(signer::address_of(admin) == @hashpay, E_NOT_ADMIN);
        borrow_global_mut<SwapConfig>(@hashpay).dex_enabled = true;
    }

    // ── View ─────────────────────────────────────────────────

    #[view]
    public fun get_stats(): (u64, u64, u64) acquires SwapConfig {
        let c = borrow_global<SwapConfig>(@hashpay);
        (c.fee_bps, c.total_volume, c.total_fees)
    }

    #[view]
    public fun is_dex_enabled(): bool acquires SwapConfig {
        borrow_global<SwapConfig>(@hashpay).dex_enabled
    }
}
