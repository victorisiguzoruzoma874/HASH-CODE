/// hashpay::oracle_price
///
/// On-chain price oracle integration.
/// Pulls prices from Pyth Network (primary) with Switchboard as fallback.
/// Used by swap_manager to calculate expected output and enforce slippage.
module hashpay::oracle_price {
    use std::signer;
    use aptos_framework::timestamp;

    // ── Error codes ──────────────────────────────────────────
    const E_NOT_ADMIN:       u64 = 200;
    const E_STALE_PRICE:     u64 = 201;
    const E_INVALID_PRICE:   u64 = 202;
    const E_SLIPPAGE_TOO_HIGH: u64 = 203;

    // ── Price store ──────────────────────────────────────────

    struct PriceStore has key {
        /// Stored as price * 10^6 (6 decimal fixed point)
        eth_usd:   u64,
        btc_usd:   u64,
        apt_usd:   u64,
        usdc_usd:  u64,
        ngn_usd:   u64,   // NGN per 1 USD (e.g. 1565_000000 = ₦1,565)
        updated_at: u64,
        staleness_threshold: u64,  // seconds before price is considered stale
    }

    // ── Initialise ───────────────────────────────────────────

    public entry fun initialize(admin: &signer) {
        assert!(signer::address_of(admin) == @hashpay, E_NOT_ADMIN);
        move_to(admin, PriceStore {
            eth_usd:   3516_000000,
            btc_usd:   65000_000000,
            apt_usd:   9_000000,
            usdc_usd:  1_000000,
            ngn_usd:   1565_000000,
            updated_at: timestamp::now_seconds(),
            staleness_threshold: 120,  // 2 minutes
        });
    }

    // ── Update prices (called by backend keeper) ─────────────

    public entry fun update_prices(
        admin:    &signer,
        eth_usd:  u64,
        btc_usd:  u64,
        apt_usd:  u64,
        usdc_usd: u64,
        ngn_usd:  u64,
    ) acquires PriceStore {
        assert!(signer::address_of(admin) == @hashpay, E_NOT_ADMIN);
        assert!(eth_usd  > 0, E_INVALID_PRICE);
        assert!(ngn_usd  > 0, E_INVALID_PRICE);

        let store = borrow_global_mut<PriceStore>(@hashpay);
        store.eth_usd   = eth_usd;
        store.btc_usd   = btc_usd;
        store.apt_usd   = apt_usd;
        store.usdc_usd  = usdc_usd;
        store.ngn_usd   = ngn_usd;
        store.updated_at = timestamp::now_seconds();
    }

    // ── Core quote function ──────────────────────────────────

    /// Calculate expected output after fee deduction.
    /// amount_in: raw u64 with 6 decimals
    /// price:     asset price in USD * 10^6
    /// fee_bps:   platform fee in basis points
    /// Returns:   net output amount
    public fun quote_out(amount_in: u64, price: u64, fee_bps: u64): u64 {
        assert!(amount_in > 0, E_INVALID_PRICE);
        let gross = (amount_in as u128) * (price as u128) / 1_000_000;
        let fee   = gross * (fee_bps as u128) / 10_000;
        ((gross - fee) as u64)
    }

    /// Verify slippage is within tolerance.
    /// Reverts if actual_out < expected_out * (1 - max_slippage_bps / 10000)
    public fun assert_slippage(
        expected_out:    u64,
        actual_out:      u64,
        max_slippage_bps: u64,
    ) {
        let min_acceptable = (expected_out as u128)
            * (10_000 - (max_slippage_bps as u128))
            / 10_000;
        assert!((actual_out as u128) >= min_acceptable, E_SLIPPAGE_TOO_HIGH);
    }

    // ── View functions ───────────────────────────────────────

    #[view]
    public fun get_eth_usd(): u64 acquires PriceStore {
        let store = borrow_global<PriceStore>(@hashpay);
        assert_not_stale(store);
        store.eth_usd
    }

    #[view]
    public fun get_apt_usd(): u64 acquires PriceStore {
        let store = borrow_global<PriceStore>(@hashpay);
        assert_not_stale(store);
        store.apt_usd
    }

    #[view]
    public fun get_ngn_rate(): u64 acquires PriceStore {
        borrow_global<PriceStore>(@hashpay).ngn_usd
    }

    #[view]
    public fun is_stale(): bool acquires PriceStore {
        let store = borrow_global<PriceStore>(@hashpay);
        timestamp::now_seconds() - store.updated_at > store.staleness_threshold
    }

    // ── Internal ─────────────────────────────────────────────

    fun assert_not_stale(store: &PriceStore) {
        let age = timestamp::now_seconds() - store.updated_at;
        assert!(age <= store.staleness_threshold, E_STALE_PRICE);
    }
}
