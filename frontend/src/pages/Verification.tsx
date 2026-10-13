import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'
import { kycApi, type KycStatus, type KycSubmissionStatus, type KycTier1Input, type KycTier2Input } from '../lib/api'
import { prepareAddressProof, prepareKycImage } from '../lib/kycFiles'
import { formatNgn } from '../components/dashboard/KycError'

const labels: Record<KycSubmissionStatus, string> = {
  NONE: 'Not submitted', PENDING: 'Under review', APPROVED: 'Approved', REJECTED: 'Rejected', NEEDS_MORE_INFO: 'More information needed',
}

export function Verification() {
  const [status, setStatus] = useState<KycStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setStatus(await kycApi.status()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load verification.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (status?.status !== 'PENDING') return
    let active = true
    const timer = setInterval(() => {
      kycApi.status().then(value => { if (active) setStatus(value) }).catch(() => { /* manual refresh remains available */ })
    }, 30_000)
    return () => { active = false; clearInterval(timer) }
  }, [status?.status])

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!status?.nextTier || busy || status.status === 'PENDING') return
    const form = event.currentTarget
    const values = new FormData(form)
    const text = (key: string) => String(values.get(key) ?? '').trim()
    const file = (key: string) => {
      const value = values.get(key)
      if (!(value instanceof File) || !value.size) throw new Error('Select all required documents.')
      return value
    }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = status.nextTier === 1
        ? await kycApi.submitTier1({
          firstName: text('firstName'), lastName: text('lastName'), dateOfBirth: text('dateOfBirth'), phone: text('phone'),
          idType: text('idType') as KycTier1Input['idType'], idNumber: text('idNumber'), country: 'NG',
        })
        : status.nextTier === 2
          ? await kycApi.submitTier2({
            idType: text('idType') as KycTier2Input['idType'],
            idFrontBase64: await prepareKycImage(file('front')),
            ...(values.get('back') instanceof File && (values.get('back') as File).size
              ? { idBackBase64: await prepareKycImage(file('back')) } : {}),
            selfieBase64: await prepareKycImage(file('selfie')),
          })
          : await (async () => {
            const proof = await prepareAddressProof(file('proof'))
            return kycApi.submitTier3({ address: text('address'), sourceOfFunds: text('sourceOfFunds'), addressProofBase64: proof.base64, addressProofMime: proof.mime })
          })()
      form.reset()
      setStatus(current => current ? { ...current, status: result.status } : current)
      setNotice(result.status === "PENDING" ? `Submission received. ${labels[result.status]}.` : `${labels[result.status]}.`)
      await load()
      window.dispatchEvent(new Event('kyc-status-updated'))
    } catch (e) { setError(e instanceof Error ? e.message : 'Verification could not be submitted.') }
    finally { setBusy(false) }
  }

  const input = (name: string, label: string, type = 'text') => <div key={name}>
    <label className="lp-label" htmlFor={`kyc-${name}`}>{label}</label>
    <input className="lp-input" id={`kyc-${name}`} name={name} type={type} required autoComplete="off"
      {...(type === 'date' ? { max: new Date().toISOString().slice(0, 10) } : {})} />
  </div>
  const upload = (name: string, label: string, required = true, pdf = false) => <div>
    <label className="lp-label" htmlFor={`kyc-${name}`}>{label}</label>
    <input className="lp-input" id={`kyc-${name}`} name={name} type="file" required={required}
      accept={pdf ? 'image/jpeg,image/png,application/pdf' : 'image/jpeg,image/png'} />
  </div>

  return <div className="dash-page">
    <div className="dash-ph"><div><h1>Verification</h1><p>Verify your identity to unlock higher transaction limits.</p></div>
      <button className="lp-btn" disabled={loading || busy} onClick={load}>{loading ? 'Loading…' : 'Refresh status'}</button>
    </div>
    {error && <div className="lp-error" role="alert">{error}</div>}
    {notice && <div className="dash-notice" role="status">{notice}</div>}
    {status && <>
      <section className="dash-card">
        <header><h2>Current tier: {status.tier}</h2><span className="dash-chip" style={{ minHeight: 0, cursor: 'default' }}>{labels[status.status]}</span></header>
        {status.status === 'PENDING' && <p className="dash-pad" role="status">Your submission is under review. You can refresh this page to check progress.</p>}
        {['REJECTED', 'NEEDS_MORE_INFO'].includes(status.status) && <div className="dash-pad">
          <p className="dash-red">{status.latestSubmission?.rejectionReason || labels[status.status]}</p>
          <p>You can update your information and resubmit.</p>
        </div>}
      </section>
      <section className="dash-card"><header><h2>Your limits (NGN)</h2></header><div className="dash-sum" style={{ borderTop: 0 }}>
        {[
          ['Per transaction', status.limits.perTx], ['Remaining today', status.limits.remainingDaily], ['Remaining this month', status.limits.remainingMonthly],
        ].map(([label, amount]) => <div key={label}><div className="lp-label">{label}</div><b className="dash-mono">{formatNgn(Number(amount))}</b></div>)}
      </div></section>
      {status.nextTier !== null ? <section className="dash-card">
        <header><h2>Verify for tier {status.nextTier}</h2></header>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {status.requirements.map((requirement, index) => <li className="dash-check" key={requirement.key}>
            <span className="m" aria-label={requirement.done ? 'Complete' : 'Incomplete'}>{requirement.done ? '✓' : index + 1}</span><span>{requirement.label}</span>
          </li>)}
        </ol>
        {status.status !== 'PENDING' && <form key={status.nextTier} className="dash-form dash-pad" onSubmit={submit} autoComplete="off">
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }} className="dash-form">
            {status.nextTier === 1 && <>
              {input('firstName', 'First name')}{input('lastName', 'Last name')}{input('dateOfBirth', 'Date of birth', 'date')}{input('phone', 'Phone number', 'tel')}
              <div><label className="lp-label" htmlFor="kyc-idType">Identity type</label><select className="lp-input" id="kyc-idType" name="idType"><option value="BVN">BVN</option><option value="NIN">NIN</option></select></div>
              {input('idNumber', 'Identity number')}<p className="dash-meta">Country: Nigeria</p>
            </>}
            {status.nextTier === 2 && <>
              <div><label className="lp-label" htmlFor="kyc-idType">Identity document</label><select className="lp-input" id="kyc-idType" name="idType"><option value="NIN">NIN</option><option value="PASSPORT">Passport</option><option value="DRIVERS_LICENSE">Driver’s license</option></select></div>
              {upload('front', 'ID front')}{upload('back', 'ID back (optional)', false)}{upload('selfie', 'Selfie')}
              <p className="dash-meta">JPEG or PNG. Images are resized and compressed to under 3 MB before upload. Keep all text clearly readable.</p>
            </>}
            {status.nextTier === 3 && <>
              {input('address', 'Residential address')}{input('sourceOfFunds', 'Source of funds')}{upload('proof', 'Proof of address', true, true)}
              <p className="dash-meta">JPEG, PNG or PDF. Images are resized and compressed before upload.</p>
            </>}
            <button type="submit" className="lp-btn solid">{busy ? 'Submitting…' : ['REJECTED', 'NEEDS_MORE_INFO'].includes(status.status) ? 'Resubmit verification' : 'Submit verification'}</button>
          </fieldset>
        </form>}
      </section> : <div className="dash-ok">You have reached the highest verification tier.</div>}
      <section className="dash-card"><header><h2>Verification tiers</h2></header><div className="dash-tablewrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr>{['Tier', 'Requirements', 'Allowed actions', 'Per transaction', 'Daily', 'Monthly'].map(label => <th key={label} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid var(--line)' }}>{label}</th>)}</tr></thead>
          <tbody>{status.tiers.map(tier => <tr key={tier.tier}>
            {[`${tier.tier} — ${tier.label}`, tier.requirements.join(', '), tier.allowedActions.join(', '), formatNgn(tier.perTxLimit), formatNgn(tier.dailyLimit), formatNgn(tier.monthlyLimit)].map((value, index) => <td key={index} style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div></section>
    </>}
  </div>
}
