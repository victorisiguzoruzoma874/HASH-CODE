/// Deployment script — run with:
///   aptos move run-script --compiled-script-path build/hashpay/bytecode_scripts/deploy.mv
///
/// This initialises all HashPay modules in the correct order on Aptos.
script {
    use hashpay::escrow;
    use hashpay::swap_manager;
    use hashpay::oracle_price;
    use aptos_framework::aptos_coin::AptosCoin;

    // Import USDC / USDT coin types from their respective modules
    // Replace with actual coin type addresses on mainnet
    // use 0x1::coin::USDC;

    fun deploy(admin: &signer) {
        // 1. Initialise oracle price store with seed prices
        oracle_price::initialize(admin);

        // 2. Initialise escrow vault for APT (native coin)
        escrow::initialize<AptosCoin>(admin);

        // 3. Initialise swap manager
        swap_manager::initialize(admin);

        // NOTE: After deployment, call oracle_price::update_prices()
        // from your backend keeper every 30 seconds to keep prices fresh.
    }
}
