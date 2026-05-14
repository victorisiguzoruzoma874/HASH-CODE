/// hashpay::quote_manager  (Sui Move)
///
/// Manages rate quotes for the crypto → fiat conversion.
/// Quotes are signed off-chain by the backend and verified on-chain.
///
/// This prevents MEV: the rate is locked at quote time and cannot
/// be changed between when the user sees the quote and when the
/// transaction executes on-chain.
///
/// Supported currency pairs:
///   USDC/NGN, USDC/GHS, USDC/KES, USDC/XOF, USDC/XAF
///   ETH/NGN,  ETH/GHS,  ETH/KES
///   USDT/NGN, USDT/GHS
module hashpay::quote_manager {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::ecdsa_k1;
    use sui::bcs;
    use std::vector;
    use std::string::{Self, String};

    // ── Error codes ──────────────────────────────────────────
    const E_NOT_ADMIN:         u64 = 300;
    const E_QUOTE_EXPIRED:     u64 = 301;
    const E_INVALID_SIGNATURE: u64 = 302;
    const E_RATE_ZERO:         u64 = 303;
    const E_SLIPPAGE_EXCEEDED: u64 = 304;
    const E_STALE_RATE:        u64 = 305;

    // ── Rate store ───────────────────────────────────────────

    /// Shared object holding the latest rates pushed by the backend keeper.
    /// Rates are stored as: 1 unit of base = rate * 10^6 units of quote
    /// e.g. usdc_ngn = 1565_000000 means 1 USDC = ₦1,565.00
    public struct RateStore has key {
        id:              UID,
        usdc_ngn:        u64,   // ₦ per USDC  * 10^6
        usdc_ghs:        u64,   // GHS per USDC * 10^6
        usdc_kes:        u64,   // KES per USDC * 10^6
        usdc_xof:        u64,   // XOF per USDC * 10^6
        usdc_xaf:        u64,   // XAF per USDC * 10^6
        eth_ngn:         u64,   // ₦ per ETH   * 10^6
        eth_ghs:         u64,
        eth_kes:         u64,
        usdt_ngn:        u64,
        usdt_ghs:        u64,
        updated_epoch:   u64,
        staleness_limit: u64,   // epochs before rates are considered stale
        backend_pubkey:  vector<u8>,  // secp256k1 compressed public key (33 bytes)
    }

    /// Admin capability for updating rates and config.
    public struct QuoteAdminCap has key, store {
        id: UID,
    }

    // ── Events ───────────────────────────────────────────────

    public struct RatesUpdated has copy, drop {
        usdc_ngn:      u64,
        usdc_ghs:      u64,
        usdc_kes:      u64,
        updated_epoch: u64,
    }

    public struct QuoteVerified has copy, drop {
        order_id:    vector<u8>,
        coin_in:     String,
        currency_out: String,
        amount_in:   u64,
        amount_out:  u64,
        rate:        u64,
    }

    // ── Initialise ───────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let admin_cap = QuoteAdminCap { id: object::new(ctx) };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        // Create shared RateStore with seed values
        let store = RateStore {
            id:              object::new(ctx),
            usdc_ngn:        1565_000000,
            usdc_ghs:        14_500000,
            usdc_kes:        130_000000,
            usdc_xof:        620_000000,
            usdc_xaf:        620_000000,
            eth_ngn:         5_510_000_000000,
            eth_ghs:         51_000_000000,
            eth_kes:         458_000_000000,
            usdt_ngn:        1562_000000,
            usdt_ghs:        14_400000,
            updated_epoch:   0,
            staleness_limit: 200,   // ~16 hours on Sui mainnet
            backend_pubkey:  vector::empty(),
        };
        transfer::share_object(store);
    }

    // ── Admin: update rates ──────────────────────────────────

    /// Called by the backend price keeper every ~30 epochs.
    public entry fun update_rates(
        _cap:      &QuoteAdminCap,
        store:     &mut RateStore,
        usdc_ngn:  u64,
        usdc_ghs:  u64,
        usdc_kes:  u64,
        usdc_xof:  u64,
        usdc_xaf:  u64,
        eth_ngn:   u64,
        eth_ghs:   u64,
        eth_kes:   u64,
        usdt_ngn:  u64,
        usdt_ghs:  u64,
        ctx:       &mut TxContext,
    ) {
        assert!(usdc_ngn > 0, E_RATE_ZERO);
        assert!(usdc_ghs > 0, E_RATE_ZERO);

        store.usdc_ngn      = usdc_ngn;
        store.usdc_ghs      = usdc_ghs;
        store.usdc_kes      = usdc_kes;
        store.usdc_xof      = usdc_xof;
        store.usdc_xaf      = usdc_xaf;
        store.eth_ngn       = eth_ngn;
        store.eth_ghs       = eth_ghs;
        store.eth_kes       = eth_kes;
        store.usdt_ngn      = usdt_ngn;
        store.usdt_ghs      = usdt_ghs;
        store.updated_epoch = tx_context::epoch(ctx);

        event::emit(RatesUpdated {
            usdc_ngn,
            usdc_ghs,
            usdc_kes,
            updated_epoch: store.updated_epoch,
        });
    }

    /// Update the backend public key used for signature verification.
    public entry fun set_backend_pubkey(
        _cap:   &QuoteAdminCap,
        store:  &mut RateStore,
        pubkey: vector<u8>,
        _ctx:   &mut TxContext,
    ) {
        store.backend_pubkey = pubkey;
    }

    // ── verify_and_compute_quote ─────────────────────────────

    /// Verifies a backend-signed quote and returns the locked fiat amount.
    ///
    /// The backend signs: order_id || BCS(amount_in) || BCS(amount_out) || BCS(expiry)
    /// This function verifies the signature and checks:
    ///   1. Quote has not expired
    ///   2. Rates are not stale
    ///   3. amount_out matches what the current rate would produce (within slippage)
    ///
    /// Returns the verified amount_out.
    public fun verify_and_compute_quote(
        store:        &RateStore,
        order_id:     &vector<u8>,
        coin_in:      vector<u8>,    // b"USDC" | b"USDT" | b"ETH"
        currency_out: vector<u8>,    // b"NGN"  | b"GHS"  | b"KES" | b"XOF" | b"XAF"
        amount_in:    u64,
        amount_out:   u64,           // the amount the backend quoted
        expiry:       u64,
        signature:    vector<u8>,
        max_slippage_bps: u64,       // e.g. 100 = 1%
        ctx:          &TxContext,
    ): u64 {
        let epoch = tx_context::epoch(ctx);

        // 1. Expiry check
        assert!(epoch < expiry, E_QUOTE_EXPIRED);

        // 2. Staleness check
        assert!(
            epoch - store.updated_epoch <= store.staleness_limit,
            E_STALE_RATE
        );

        // 3. Signature verification
        let msg = build_quote_message(order_id, amount_in, amount_out, expiry);
        assert!(
            ecdsa_k1::secp256k1_verify(&signature, &store.backend_pubkey, &msg, 0),
            E_INVALID_SIGNATURE
        );

        // 4. Compute expected output from on-chain rate
        let rate = get_rate(store, &coin_in, &currency_out);
        let expected_out = compute_out(amount_in, rate);

        // 5. Slippage check: amount_out must be >= expected * (1 - slippage)
        let min_acceptable = (expected_out as u128)
            * (10_000 - (max_slippage_bps as u128))
            / 10_000;
        assert!((amount_out as u128) >= min_acceptable, E_SLIPPAGE_EXCEEDED);

        event::emit(QuoteVerified {
            order_id:     *order_id,
            coin_in:      string::utf8(coin_in),
            currency_out: string::utf8(currency_out),
            amount_in,
            amount_out,
            rate,
        });

        amount_out
    }

    // ── View: get current rate ───────────────────────────────

    public fun get_rate(
        store:        &RateStore,
        coin_in:      &vector<u8>,
        currency_out: &vector<u8>,
    ): u64 {
        let pair = build_pair_key(coin_in, currency_out);

        if      (pair == b"USDC_NGN")  { store.usdc_ngn  }
        else if (pair == b"USDC_GHS")  { store.usdc_ghs  }
        else if (pair == b"USDC_KES")  { store.usdc_kes  }
        else if (pair == b"USDC_XOF")  { store.usdc_xof  }
        else if (pair == b"USDC_XAF")  { store.usdc_xaf  }
        else if (pair == b"ETH_NGN")   { store.eth_ngn   }
        else if (pair == b"ETH_GHS")   { store.eth_ghs   }
        else if (pair == b"ETH_KES")   { store.eth_kes   }
        else if (pair == b"USDT_NGN")  { store.usdt_ngn  }
        else if (pair == b"USDT_GHS")  { store.usdt_ghs  }
        else { 0 }
    }

    public fun is_stale(store: &RateStore, ctx: &TxContext): bool {
        tx_context::epoch(ctx) - store.updated_epoch > store.staleness_limit
    }

    // ── Internal ─────────────────────────────────────────────

    /// amount_in (6 decimals) * rate (6 decimals) / 10^6 = fiat amount
    fun compute_out(amount_in: u64, rate: u64): u64 {
        (((amount_in as u128) * (rate as u128)) / 1_000_000) as u64
    }

    fun build_quote_message(
        order_id:   &vector<u8>,
        amount_in:  u64,
        amount_out: u64,
        expiry:     u64,
    ): vector<u8> {
        let msg = vector::empty<u8>();
        vector::append(&mut msg, *order_id);
        vector::append(&mut msg, bcs::to_bytes(&amount_in));
        vector::append(&mut msg, bcs::to_bytes(&amount_out));
        vector::append(&mut msg, bcs::to_bytes(&expiry));
        msg
    }

    fun build_pair_key(coin_in: &vector<u8>, currency_out: &vector<u8>): vector<u8> {
        let key = vector::empty<u8>();
        vector::append(&mut key, *coin_in);
        vector::append(&mut key, b"_");
        vector::append(&mut key, *currency_out);
        key
    }
}
