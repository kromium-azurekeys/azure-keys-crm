'use client'

import { useState } from 'react'
import { Sun, CloudRain, AlertTriangle, TrendingUp } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface SeasonalIntelProps { profile: any }

export default function SeasonalIntel({ profile }: SeasonalIntelProps) {
  const isMobile = useIsMobile()
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12

  // Caribbean High Season: Nov (11) - Apr (4)
  const isHighSeason = month >= 11 || month <= 4
  // Hurricane Season: June (6) - Nov (30)
  const isHurricaneSeason = month >= 6 && month <= 11
  const hurricanePeak = month >= 8 && month <= 10 // Aug-Oct is peak

  const daysUntilHighSeason = () => {
    if (isHighSeason) return 'Active now'
    const nextNov = new Date(now.getFullYear(), 10, 1) // Nov 1
    if (now > nextNov) nextNov.setFullYear(nextNov.getFullYear() + 1)
    const diff = Math.ceil((nextNov.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return `${diff} days`
  }

  const SEASONAL_CAMPAIGNS = [
    { name: 'High Season Launch', trigger: 'November 1', desc: 'Email blast to all active buyer leads with new listings and open house invites', status: isHighSeason ? 'Active' : 'Upcoming', statusClass: isHighSeason ? 'badge-green' : 'badge-gold' },
    { name: 'Hurricane Prep Alert', trigger: 'June 1', desc: 'Property management check-in: storm shutters, generator, drainage, insurance review', status: isHurricaneSeason ? 'Active' : 'Scheduled', statusClass: isHurricaneSeason ? 'badge-orange' : 'badge-gray' },
    { name: 'Off-Season Price Review', trigger: 'May 1 & October 1', desc: 'Automated flag for agents to review pricing strategy for slower sales months', status: !isHighSeason && !isHurricaneSeason ? 'Active' : 'Scheduled', statusClass: 'badge-blue' },
    { name: 'Peak Rental Handover', trigger: 'October 15', desc: 'Contact all rental clients to confirm management handover before high season starts', status: 'Scheduled', statusClass: 'badge-gray' },
    { name: 'CBI Investment Window', trigger: 'September – November', desc: 'Target HNW buyer segment with CBI programme listings before year-end', status: month >= 9 && month <= 11 ? 'Active' : 'Upcoming', statusClass: month >= 9 && month <= 11 ? 'badge-purple' : 'badge-gray' },
  ]

  const AIRBNB_DATA = [
    { month: 'Jan', occupancy: 82, rate: '$2,400/night' },
    { month: 'Feb', occupancy: 88, rate: '$2,800/night' },
    { month: 'Mar', occupancy: 85, rate: '$2,600/night' },
    { month: 'Apr', occupancy: 78, rate: '$2,200/night' },
    { month: 'May', occupancy: 55, rate: '$1,600/night' },
    { month: 'Jun', occupancy: 42, rate: '$1,200/night' },
    { month: 'Jul', occupancy: 48, rate: '$1,400/night' },
    { month: 'Aug', occupancy: 38, rate: '$1,100/night' },
    { month: 'Sep', occupancy: 35, rate: '$1,000/night' },
    { month: 'Oct', occupancy: 44, rate: '$1,300/night' },
    { month: 'Nov', occupancy: 72, rate: '$2,000/night' },
    { month: 'Dec', occupancy: 90, rate: '$3,200/night' },
  ]

  const currentMonthData = AIRBNB_DATA[month - 1]

  return (
    <div className="animate-fade-up">
      <div style={{ padding: isMobile ? '16px' : '28px 32px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p className="page-label">Caribbean Intelligence</p>
        <h1 className="page-title">Seasonal <em>Intelligence</em></h1>
        <p className="page-sub">Hurricane season tracking, market seasonality & automated campaign triggers</p>
      </div>

      {/* Season status banners */}
      <div style={{ padding: isMobile ? '16px' : '20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Current season status */}
        <div style={{
          padding: '16px 20px', borderRadius: 10,
          background: isHighSeason ? 'linear-gradient(135deg, #0d1f3c, #1a4a7a)' : 'linear-gradient(135deg, #1a3c1a, #2d5a2d)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 32 }}>{isHighSeason ? '🌞' : '🌿'}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 2 }}>
              {isHighSeason ? '🏖️ HIGH SEASON ACTIVE — November to April' : '🌿 OFF-SEASON — May to October'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              {isHighSeason
                ? 'Peak selling season. Maximize viewings, open houses, and premium pricing. International buyer traffic is highest now.'
                : `Off-season. Focus on pipeline building, referral outreach, and pre-listing preparation. Next high season in: ${daysUntilHighSeason()}`
              }
            </p>
          </div>
          <span style={{ background: isHighSeason ? 'rgba(201,168,76,0.25)' : 'rgba(74,180,74,0.25)', color: isHighSeason ? '#d4af6a' : '#6ee7b7', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {isHighSeason ? 'High Season' : 'Off-Season'}
          </span>
        </div>

        {/* Hurricane status */}
        <div style={{
          padding: '16px 20px', borderRadius: 10,
          background: hurricanePeak ? '#3c1a1a' : isHurricaneSeason ? '#3c2a1a' : 'var(--surface)',
          border: `1px solid ${hurricanePeak ? '#8c2a2a' : isHurricaneSeason ? '#8c5a1a' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 28 }}>{hurricanePeak ? '🌀' : isHurricaneSeason ? '⚠️' : '✅'}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: hurricanePeak ? '#ff8080' : isHurricaneSeason ? '#fbb04c' : 'var(--text)', marginBottom: 2 }}>
              Hurricane Season: June 1 – November 30
              {hurricanePeak && ' — PEAK PERIOD (Aug–Oct)'}
            </p>
            <p style={{ fontSize: 13, color: hurricanePeak ? 'rgba(255,200,200,0.8)' : isHurricaneSeason ? 'rgba(255,180,100,0.8)' : 'var(--text-3)' }}>
              {hurricanePeak
                ? 'Peak hurricane risk period. Ensure all managed properties have storm shutters deployed, generators fueled, and drainage cleared.'
                : isHurricaneSeason
                ? 'Hurricane season active. Schedule property inspections and confirm insurance coverage with all managed property clients.'
                : 'No active hurricane risk. Caribbean enjoys stable weather from December through May.'}
            </p>
          </div>
          <span className={`badge ${hurricanePeak ? 'badge-red' : isHurricaneSeason ? 'badge-orange' : 'badge-green'}`}>
            {hurricanePeak ? 'High Risk' : isHurricaneSeason ? 'Active Season' : 'Clear'}
          </span>
        </div>
      </div>

      <div style={{ padding: isMobile ? '0 16px 24px' : '0 32px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24 }}>
        {/* Airbnb occupancy data */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Barbados Airbnb Occupancy Data</p>
              <span className="badge badge-gold">Current: {currentMonthData.occupancy}%</span>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {/* Visual bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AIRBNB_DATA.map((d, i) => (
                <div key={d.month} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: i + 1 === month ? 700 : 400,
                    color: i + 1 === month ? 'var(--gold)' : 'var(--text-3)',
                    width: 28, flexShrink: 0
                  }}>{d.month}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, width: `${d.occupancy}%`,
                      background: d.occupancy >= 75 ? 'var(--gold)' : d.occupancy >= 55 ? 'var(--orange)' : 'var(--border-strong)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: i + 1 === month ? 700 : 400, color: i + 1 === month ? 'var(--gold)' : 'var(--text-4)', width: 32, textAlign: 'right' }}>{d.occupancy}%</span>
                  <span style={{ fontSize: 11, color: 'var(--text-4)', width: 80, textAlign: 'right' }}>{d.rate}</span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-4)' }}>Source: Barbados Tourism Authority market data. High season avg occupancy 85%.</p>
          </div>
        </div>

        {/* Automated campaigns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Seasonal Campaign Schedule</p>
            </div>
            <div>
              {SEASONAL_CAMPAIGNS.map((camp, i) => (
                <div key={i} style={{ padding: '14px 20px', borderBottom: i < SEASONAL_CAMPAIGNS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{camp.name}</p>
                    <span className={`badge ${camp.statusClass}`}>{camp.status}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, marginBottom: 3 }}>Trigger: {camp.trigger}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{camp.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hurricane property checklist */}
          {isHurricaneSeason && (
            <div className="card" style={{ border: '1px solid var(--orange-border)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--orange-border)', background: 'var(--orange-pale)' }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--orange)' }}>⚠️ Hurricane Season Property Checklist</p>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'Storm shutters installed & operational',
                    'Generator fueled & tested',
                    'Roof drainage & gutters cleared',
                    'Outdoor furniture secured or stored',
                    'Insurance policy reviewed & current',
                    'Emergency contact list updated',
                    'Evacuation routes documented',
                    'Property management on speed-dial'
                  ].map(item => (
                    <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: 14, height: 14, accentColor: 'var(--gold)' }} />
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
