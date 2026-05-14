/// Price keeper script — called by backend every 30s
/// aptos move run-script --function-id hashpay::oracle_price::update_prices \
///   --args u64:3516000000 u64:65000000000 u64:9000000 u64:1000000 u64:1565000000
script {
    use hashpay::oracle_price;

    fun update_prices(
        admin:    &signer,
        eth_usd:  u64,   // price * 10^6  e.g. 3516_000000 = $3,516.00
        btc_usd:  u64,
        apt_usd:  u64,
        usdc_usd: u64,
        ngn_usd:  u64,   // NGN per USD * 10^6  e.g. 1565_000000 = ₦1,565
    ) {
        oracle_price::update_prices(admin, eth_usd, btc_usd, apt_usd, usdc_usd, ngn_usd);
    }
}
