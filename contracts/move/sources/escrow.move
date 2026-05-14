/// hashpay::escrow
///
/// Holds user funds in a resource account until the backend confirms
/// fiat settlement, then releases or refunds.
///
/// Security properties:
///   - Only the @hashpay admin signer can call refund() or release()
///   - Deposits are atomic — either the full amount is locked or the tx reverts
///   - Events are emitted for every state change (backend listens via Indexer)
///   - No reentrancy possible (Move's linear type system prevents it)
module hashpay::escrow {
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;

    // ── Error codes ──────────────────────────────────────────
    const E_NOT_ADMIN:        u64 = 1;
    const E_VAULT_EXISTS:     u64 = 2;
    const E_VAULT_NOT_FOUND:  u64 = 3;
    const E_INSUFFICIENT_BAL: u64 = 4;
    const E_ZERO_AMOUNT:      u64 = 5;

    // ── Events ───────────────────────────────────────────────

    struct DepositReceived has drop, store {
        user:       address,
        amount:     u64,
        asset:      String,
        tx_hash:    vector<u8>,
        timestamp:  u64,
    }

    struct RefundIssued has drop, store {
        user:      address,
        amount:    u64,
        asset:     String,
        reason:    String,
        timestamp: u64,
    }

    struct ReleaseConfirmed has drop, store {
        user:       address,
        amount:     u64,
        asset:      String,
        payout_ref: String,
        timestamp:  u64,
    }

    // ── Vault resource ───────────────────────────────────────

    struct EscrowVault<phantom CoinType> has key {
        balance:          Coin<CoinType>,
        deposit_events:   EventHandle<DepositReceived>,
        refund_events:    EventHandle<RefundIssued>,
        release_events:   EventHandle<ReleaseConfirmed>,
        total_deposited:  u64,
        total_released:   u64,
        total_refunded:   u64,
    }

    // ── Admin capability ─────────────────────────────────────

    struct AdminCap has key, store {}

    // ── Initialise ───────────────────────────────────────────

    /// Called once during deployment. Creates the vault and grants AdminCap.
    public entry fun initialize<CoinType>(admin: &signer) {
        let addr = signer::address_of(admin);
        assert!(addr == @hashpay, E_NOT_ADMIN);
        assert!(!exists<EscrowVault<CoinType>>(addr), E_VAULT_EXISTS);

        move_to(admin, EscrowVault<CoinType> {
            balance:         coin::zero<CoinType>(),
            deposit_events:  account::new_event_handle<DepositReceived>(admin),
            refund_events:   account::new_event_handle<RefundIssued>(admin),
            release_events:  account::new_event_handle<ReleaseConfirmed>(admin),
            total_deposited: 0,
            total_released:  0,
            total_refunded:  0,
        });

        move_to(admin, AdminCap {});
    }

    // ── Deposit ──────────────────────────────────────────────

    /// User deposits CoinType into the escrow vault.
    /// Emits DepositReceived — backend listens and triggers NGN payout.
    public entry fun deposit<CoinType>(
        user:    &signer,
        amount:  u64,
        asset:   vector<u8>,
    ) acquires EscrowVault {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<EscrowVault<CoinType>>(@hashpay), E_VAULT_NOT_FOUND);

        let coin_in = coin::withdraw<CoinType>(user, amount);
        let vault   = borrow_global_mut<EscrowVault<CoinType>>(@hashpay);

        coin::merge(&mut vault.balance, coin_in);
        vault.total_deposited = vault.total_deposited + amount;

        event::emit_event(&mut vault.deposit_events, DepositReceived {
            user:      signer::address_of(user),
            amount,
            asset:     string::utf8(asset),
            tx_hash:   b"",   // filled by indexer
            timestamp: timestamp::now_seconds(),
        });
    }

    // ── Refund ───────────────────────────────────────────────

    /// Admin-only. Returns funds to user if KYC fails or payout fails.
    public entry fun refund<CoinType>(
        admin:  &signer,
        user:   address,
        amount: u64,
        asset:  vector<u8>,
        reason: vector<u8>,
    ) acquires EscrowVault {
        assert!(signer::address_of(admin) == @hashpay, E_NOT_ADMIN);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let vault = borrow_global_mut<EscrowVault<CoinType>>(@hashpay);
        assert!(coin::value(&vault.balance) >= amount, E_INSUFFICIENT_BAL);

        let refund_coin = coin::extract(&mut vault.balance, amount);
        coin::deposit(user, refund_coin);
        vault.total_refunded = vault.total_refunded + amount;

        event::emit_event(&mut vault.refund_events, RefundIssued {
            user,
            amount,
            asset:     string::utf8(asset),
            reason:    string::utf8(reason),
            timestamp: timestamp::now_seconds(),
        });
    }

    // ── Release (treasury withdrawal) ────────────────────────

    /// Admin-only. Releases funds from vault to treasury after confirmed payout.
    public entry fun release<CoinType>(
        admin:      &signer,
        user:       address,
        amount:     u64,
        asset:      vector<u8>,
        payout_ref: vector<u8>,
    ) acquires EscrowVault {
        assert!(signer::address_of(admin) == @hashpay, E_NOT_ADMIN);

        let vault = borrow_global_mut<EscrowVault<CoinType>>(@hashpay);
        assert!(coin::value(&vault.balance) >= amount, E_INSUFFICIENT_BAL);

        // Move to treasury (admin address)
        let released = coin::extract(&mut vault.balance, amount);
        coin::deposit(@hashpay, released);
        vault.total_released = vault.total_released + amount;

        event::emit_event(&mut vault.release_events, ReleaseConfirmed {
            user,
            amount,
            asset:      string::utf8(asset),
            payout_ref: string::utf8(payout_ref),
            timestamp:  timestamp::now_seconds(),
        });
    }

    // ── View functions ───────────────────────────────────────

    #[view]
    public fun vault_balance<CoinType>(): u64 acquires EscrowVault {
        coin::value(&borrow_global<EscrowVault<CoinType>>(@hashpay).balance)
    }

    #[view]
    public fun vault_stats<CoinType>(): (u64, u64, u64) acquires EscrowVault {
        let v = borrow_global<EscrowVault<CoinType>>(@hashpay);
        (v.total_deposited, v.total_released, v.total_refunded)
    }
}
