/// Unit tests for hashpay::escrow
#[test_only]
module hashpay::escrow_tests {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::account;
    use aptos_framework::aptos_coin::AptosCoin;
    use hashpay::escrow;

    // ── Test helpers ─────────────────────────────────────────

    fun setup_admin(aptos: &signer, admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        coin::register<AptosCoin>(admin);
        escrow::initialize<AptosCoin>(admin);
    }

    fun setup_user(aptos: &signer, user: &signer, amount: u64) {
        account::create_account_for_test(signer::address_of(user));
        coin::register<AptosCoin>(user);
        // Mint test coins to user
        let (burn_cap, mint_cap) = aptos_framework::aptos_coin::initialize_for_test(aptos);
        let coins = coin::mint<AptosCoin>(amount, &mint_cap);
        coin::deposit(signer::address_of(user), coins);
        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    // ── Tests ────────────────────────────────────────────────

    #[test(aptos = @aptos_framework, admin = @hashpay, user = @0xBEEF)]
    public fun test_deposit_success(aptos: signer, admin: signer, user: signer) {
        setup_admin(&aptos, &admin);
        setup_user(&aptos, &user, 1_000_000);

        let balance_before = escrow::vault_balance<AptosCoin>();
        assert!(balance_before == 0, 0);

        escrow::deposit<AptosCoin>(&user, 500_000, b"APT");

        let balance_after = escrow::vault_balance<AptosCoin>();
        assert!(balance_after == 500_000, 1);

        let (deposited, released, refunded) = escrow::vault_stats<AptosCoin>();
        assert!(deposited == 500_000, 2);
        assert!(released  == 0,       3);
        assert!(refunded  == 0,       4);
    }

    #[test(aptos = @aptos_framework, admin = @hashpay, user = @0xBEEF)]
    public fun test_refund_success(aptos: signer, admin: signer, user: signer) {
        setup_admin(&aptos, &admin);
        setup_user(&aptos, &user, 1_000_000);

        escrow::deposit<AptosCoin>(&user, 500_000, b"APT");

        let user_addr = signer::address_of(&user);
        let user_bal_before = coin::balance<AptosCoin>(user_addr);

        escrow::refund<AptosCoin>(&admin, user_addr, 500_000, b"APT", b"KYC_FAILED");

        let user_bal_after = coin::balance<AptosCoin>(user_addr);
        assert!(user_bal_after == user_bal_before + 500_000, 0);

        let vault_bal = escrow::vault_balance<AptosCoin>();
        assert!(vault_bal == 0, 1);
    }

    #[test(aptos = @aptos_framework, admin = @hashpay, user = @0xBEEF)]
    #[expected_failure(abort_code = 1)]  // E_NOT_ADMIN
    public fun test_refund_non_admin_fails(aptos: signer, admin: signer, user: signer) {
        setup_admin(&aptos, &admin);
        setup_user(&aptos, &user, 1_000_000);
        escrow::deposit<AptosCoin>(&user, 500_000, b"APT");

        // User tries to refund themselves — should fail
        escrow::refund<AptosCoin>(&user, signer::address_of(&user), 500_000, b"APT", b"HACK");
    }

    #[test(aptos = @aptos_framework, admin = @hashpay, user = @0xBEEF)]
    #[expected_failure(abort_code = 5)]  // E_ZERO_AMOUNT
    public fun test_deposit_zero_fails(aptos: signer, admin: signer, user: signer) {
        setup_admin(&aptos, &admin);
        setup_user(&aptos, &user, 1_000_000);
        escrow::deposit<AptosCoin>(&user, 0, b"APT");
    }
}
