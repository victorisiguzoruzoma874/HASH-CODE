#[test_only]
module hashpay::oracle_tests {
    use hashpay::oracle_price;
    use aptos_framework::timestamp;

    fun setup(aptos: &signer, admin: &signer) {
        timestamp::set_time_has_started_for_testing(aptos);
        oracle_price::initialize(admin);
    }

    #[test(aptos = @aptos_framework, admin = @hashpay)]
    public fun test_quote_out_basic(aptos: signer, admin: signer) {
        setup(&aptos, &admin);
        // 1 ETH at $3,516 with 0.5% fee
        // amount_in = 1_000_000 (1 USDC in 6 decimals)
        // price     = 3516_000000
        // fee_bps   = 50
        let result = oracle_price::quote_out(1_000_000, 3516_000000, 50);
        // gross = 1_000_000 * 3516_000000 / 1_000_000 = 3_516_000_000
        // fee   = 3_516_000_000 * 50 / 10_000 = 17_580_000
        // net   = 3_516_000_000 - 17_580_000 = 3_498_420_000
        assert!(result == 3_498_420_000, 0);
    }

    #[test(aptos = @aptos_framework, admin = @hashpay)]
    public fun test_slippage_passes(aptos: signer, admin: signer) {
        setup(&aptos, &admin);
        // expected=1000, actual=990, max_slippage=200bps (2%) → should pass
        oracle_price::assert_slippage(1000, 990, 200);
    }

    #[test(aptos = @aptos_framework, admin = @hashpay)]
    #[expected_failure(abort_code = 203)]
    public fun test_slippage_fails(aptos: signer, admin: signer) {
        setup(&aptos, &admin);
        // expected=1000, actual=970, max_slippage=200bps (2%) → should fail
        oracle_price::assert_slippage(1000, 970, 200);
    }

    #[test(aptos = @aptos_framework, admin = @hashpay)]
    public fun test_update_prices(aptos: signer, admin: signer) {
        setup(&aptos, &admin);
        oracle_price::update_prices(&admin, 4000_000000, 70000_000000, 10_000000, 1_000000, 1600_000000);
        let eth = oracle_price::get_eth_usd();
        assert!(eth == 4000_000000, 0);
    }

    #[test(aptos = @aptos_framework, admin = @hashpay)]
    #[expected_failure(abort_code = 201)]
    public fun test_stale_price_reverts(aptos: signer, admin: signer) {
        setup(&aptos, &admin);
        // Fast-forward time past staleness threshold (120s)
        timestamp::fast_forward_seconds(200);
        oracle_price::get_eth_usd();  // should abort with E_STALE_PRICE
    }
}
