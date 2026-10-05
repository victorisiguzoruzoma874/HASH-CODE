import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { QRCode } from '../ui/QRCode'
import { useApiStore } from '../../store/useApiStore'
import { walletApi, type WalletBalance } from '../../lib/api'

interface ReceiveModalProps { isOpen: boolean; onClose: () => void }

type Tab = 'hashpay' | 'bank' | 'crypto'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <button type="button" className="lp-btn small" onClick={handle} style={{ flex: 'none' }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="lp-label">{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div className="lp-input dash-mono" style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
        <CopyButton text={value} />
      </div>
    </div>
  )
}

/** QR codes stay black on white in both themes so they remain scannable */
const QrBox: React.FC<{ value: string; size?: number }> = ({ value, size = 172 }) => (
  <div style={{ background: '#fff', padding: 12, border: '1px solid var(--line)', display: 'inline-block' }}>
    <QRCode value={value} size={size} fgColor="#000000" bgColor="#ffffff" />
  </div>
)

export const ReceiveModal: React.FC<ReceiveModalProps> = ({ isOpen, onClose }) => {
  const user = useApiStore(s => s.user)
  const [tab, setTab]               = useState<Tab>('hashpay')
  const [walletData, setWalletData] = useState<WalletBalance | null>(null)
  const [loading, setLoading]       = useState(false)
  const [creating, setCreating]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [chain, setChain]           = useState<'evm' | 'sui' | 'aptos'>('evm')

  // Only chains the user actually has an address for
  const cryptoChains = ([
    { key: 'evm',   label: 'EVM',   address: user?.evmAddress },
    { key: 'sui',   label: 'Sui',   address: user?.suiAddress },
    { key: 'aptos', label: 'Aptos', address: user?.aptosAddress },
  ] as const).filter(c => !!c.address)

  const activeChain   = cryptoChains.find(c => c.key === chain) ?? cryptoChains[0]
  const activeAddress = activeChain?.address ?? ''

  useEffect(() => {
    if (!isOpen) return
    setLoading(true); setError(null)
    walletApi.getBalance()
      .then(r => setWalletData(r.data))
      .catch(() => setError('Your wallet could not be loaded. Close this window and try again.'))
      .finally(() => setLoading(false))
  }, [isOpen])

  const createVirtualAccount = async () => {
    setCreating(true); setError(null)
    try {
      await walletApi.createVirtualAccount()
      const r = await walletApi.getBalance()
      setWalletData(r.data)
    } catch (e: any) {
      setError(e.message ?? 'The account could not be created. Try again.')
    } finally {
      setCreating(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'hashpay', label: 'HashPay ID' },
    { key: 'bank',    label: 'Bank account' },
    { key: 'crypto',  label: 'Crypto' },
  ]

  const accountNumber = walletData?.hashpayAccountNumber ?? null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive money"
      subtitle="Share your HashPay ID or bank account to get paid." width="max-w-[460px]">
      <div className="dash-form">

        <div className="dash-tabs" role="tablist" style={{ width: '100%' }}>
          {tabs.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} style={{ flex: 1, padding: 0 }}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="lp-error" role="alert">{error}</div>}

        {loading ? (
          <p className="dash-empty" style={{ padding: '24px 0' }}>Loading your wallet…</p>
        ) : (
          <>
            {/* ── HashPay ID ── */}
            {tab === 'hashpay' && (
              <>
                <div className="dash-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="lp-label" style={{ marginBottom: 0 }}>HashPay account</div>
                  {accountNumber && <QrBox value={accountNumber} />}
                  <div className="dash-big" style={{ fontSize: 28, letterSpacing: '0.08em' }}>
                    {accountNumber ? accountNumber.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : '—'}
                  </div>
                  <div className="dash-grey">{user?.fullName ?? ''}</div>
                </div>

                {accountNumber && <AccountRow label="Account number" value={accountNumber} />}

                <div className="dash-notice">
                  Share your HashPay ID with other HashPay users. Transfers between HashPay accounts are instant and free.
                </div>

                {typeof navigator.share === 'function' && accountNumber && (
                  <button type="button" className="lp-btn"
                    onClick={() => navigator.share({ title: 'My HashPay ID', text: `Send me money on HashPay: ${accountNumber}` }).catch(() => {})}>
                    Share HashPay ID
                  </button>
                )}
              </>
            )}

            {/* ── Bank account ── */}
            {tab === 'bank' && (
              walletData?.virtualAccount ? (
                <>
                  <div className="dash-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <QrBox value={walletData.virtualAccount.accountNumber} size={160} />
                    <div className="dash-big" style={{ fontSize: 26, letterSpacing: '0.08em' }}>{walletData.virtualAccount.accountNumber}</div>
                    <div className="dash-grey">{walletData.virtualAccount.bankName ?? 'Bank account'}</div>
                  </div>
                  <AccountRow label="Account number" value={walletData.virtualAccount.accountNumber} />
                  <AccountRow label="Bank name" value={walletData.virtualAccount.bankName ?? ''} />
                  <AccountRow label="Account name" value={user?.fullName ?? ''} />
                  <div className="dash-notice">
                    Anyone can send naira to this account by bank transfer. Deposits are added to your HashPay naira balance.
                  </div>
                </>
              ) : (
                <div className="dash-form" style={{ alignItems: 'stretch' }}>
                  <div>
                    <b>You don't have a bank account number yet</b>
                    <p className="dash-grey" style={{ marginTop: 4 }}>
                      Create a dedicated Nigerian bank account number to receive transfers from anyone. This requires identity (KYC) verification.
                    </p>
                  </div>
                  <button type="button" className="lp-btn solid" onClick={createVirtualAccount} disabled={creating}>
                    {creating ? 'Creating account…' : 'Create bank account number'}
                  </button>
                </div>
              )
            )}

            {/* ── Crypto ── */}
            {tab === 'crypto' && (
              cryptoChains.length === 0 ? (
                <p className="dash-empty" style={{ padding: '24px 0' }}>
                  No crypto wallet is linked to your account yet. Connect a wallet at login to see its address here.
                </p>
              ) : (
                <>
                  {cryptoChains.length > 1 && (
                    <div className="dash-tabs" role="tablist" style={{ width: '100%' }}>
                      {cryptoChains.map(c => (
                        <button key={c.key} role="tab" aria-selected={activeChain?.key === c.key} style={{ flex: 1, padding: 0 }}
                          onClick={() => setChain(c.key)}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="dash-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="lp-label" style={{ marginBottom: 0 }}>{activeChain?.label} wallet address</div>
                    <QrBox value={activeAddress} />
                    <div className="dash-mono" style={{ fontSize: 13, wordBreak: 'break-all' }}>{activeAddress}</div>
                  </div>

                  <AccountRow label={`${activeChain?.label} address`} value={activeAddress} />

                  <div className="lp-error">
                    Only send supported {activeChain?.label} tokens to this address. Sending unsupported assets can mean permanent loss.
                  </div>
                </>
              )
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
