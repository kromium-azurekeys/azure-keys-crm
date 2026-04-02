'use client'

import { useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface YieldCalculatorProps { profile: any }

export default function YieldCalculator({ profile }: YieldCalculatorProps) {
  const isMobile = useIsMobile()
  const [inputs, setInputs] = useState({
    purchasePrice: 4500000, peakNightlyRate: 2800, offPeakNightlyRate: 1400,
    peakOccupancy: 85, offPeakOccupancy: 45, peakMonths: 5,
    managementFee: 20, annualCosts: 85000, appreciationRate: 4,
  })

  const calc = () => {
    const peakDays = inputs.peakMonths * 30 * (inputs.peakOccupancy / 100)
    const offPeakDays = (12 - inputs.peakMonths) * 30 * (inputs.offPeakOccupancy / 100)
    const grossIncome = (peakDays * inputs.peakNightlyRate) + (offPeakDays * inputs.offPeakNightlyRate)
    const mgmtFee = grossIncome * (inputs.managementFee / 100)
    const netIncome = grossIncome - mgmtFee - inputs.annualCosts
    const grossYield = (grossIncome / inputs.purchasePrice) * 100
    const netYield = (netIncome / inputs.purchasePrice) * 100
    const projection = Array.from({ length: 10 }, (_, i) => {
      const year = i + 1
      return {
        year,
        income: netIncome * Math.pow(1.05, year - 1),
        propValue: inputs.purchasePrice * Math.pow(1 + inputs.appreciationRate / 100, year),
        cumulative: netIncome * (Math.pow(1.05, year) - 1) / 0.05,
      }
    })
    return { grossIncome, netIncome, grossYield, netYield, projection }
  }

  const r = calc()
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  const set = (k: string, v: number) => setInputs(prev => ({ ...prev, [k]: v }))

  const Field = ({ label, field, prefix = '', suffix = '' }: { label: string; field: string; prefix?: string; suffix?: string }) => (
    <div>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', fontSize: 13 }}>{prefix}</span>}
        <input type="number" className="crm-input" value={(inputs as any)[field]} onChange={e => set(field, Number(e.target.value))}
          style={{ paddingLeft: prefix ? 22 : 12, paddingRight: suffix ? 28 : 12 }} />
        {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  )

  const p = isMobile ? '16px' : '28px 32px'

  return (
    <div className="animate-fade-up">
      <div style={{ padding: isMobile ? '16px' : '28px 32px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p className="page-label">Caribbean Intelligence</p>
        <h1 className="page-title">Rental Yield <em>Calculator</em></h1>
        <p className="page-sub">Model investment returns — built for the Caribbean market</p>
      </div>

      <div style={{ padding: p, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: 20, alignItems: 'start' }}>
        {/* Inputs */}
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: 'var(--text)' }}>Property Parameters</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Purchase Price" field="purchasePrice" prefix="$" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Peak Nightly Rate" field="peakNightlyRate" prefix="$" />
              <Field label="Off-Peak Rate" field="offPeakNightlyRate" prefix="$" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Peak Occupancy" field="peakOccupancy" suffix="%" />
              <Field label="Off-Peak Occupancy" field="offPeakOccupancy" suffix="%" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Peak Season Months" field="peakMonths" />
              <Field label="Management Fee" field="managementFee" suffix="%" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Annual Costs" field="annualCosts" prefix="$" />
              <Field label="Appreciation p/a" field="appreciationRate" suffix="%" />
            </div>
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', borderRadius: 8, fontSize: 12, color: 'var(--gold)', lineHeight: 1.6 }}>
            Tip: Barbados peak season: Nov–Apr. Airbnb occupancy: 85% peak, 45% off-peak.
          </div>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--navy)', borderRadius: 12, padding: isMobile ? 16 : 20, color: '#fff' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Gross Annual</p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.4rem' : '1.8rem', color: 'var(--gold-light)', fontWeight: 400 }}>{fmt(r.grossIncome)}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Yield: {r.grossYield.toFixed(1)}%</p>
            </div>
            <div style={{ background: '#1a5c3a', borderRadius: 12, padding: isMobile ? 16 : 20, color: '#fff' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Net Annual</p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.4rem' : '1.8rem', color: '#6ee7b7', fontWeight: 400 }}>{fmt(r.netIncome)}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Yield: {r.netYield.toFixed(1)}%</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Gross Yield', value: `${r.grossYield.toFixed(2)}%` },
              { label: 'Net Yield', value: `${r.netYield.toFixed(2)}%` },
              { label: 'Mgmt Fees', value: fmt(r.grossIncome * inputs.managementFee / 100) },
            ].map(m => (
              <div key={m.label} className="metric-card" style={{ padding: 12, textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--text)', fontWeight: 600 }}>{m.value}</p>
                <p style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{m.label}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, fontSize: 13 }}>10-Year Projection</p>
            </div>
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr><th>Year</th><th>Net Income</th><th>Prop Value</th><th>Total Return</th></tr>
                </thead>
                <tbody>
                  {r.projection.map(row => (
                    <tr key={row.year}>
                      <td style={{ fontWeight: 500 }}>Yr {row.year}</td>
                      <td style={{ color: 'var(--green)' }}>{fmt(row.income)}</td>
                      <td style={{ color: 'var(--gold)' }}>{fmt(row.propValue)}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(row.cumulative + (row.propValue - inputs.purchasePrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
