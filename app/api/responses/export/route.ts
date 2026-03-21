import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthUser } from '@server/auth-helper'
import { insforge } from '@server/insforge'
import * as XLSX from 'xlsx'

// ── HELPERS ──────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  US:'United States', IN:'India', GB:'United Kingdom', DE:'Germany',
  FR:'France', AU:'Australia', CA:'Canada', SG:'Singapore',
  AE:'UAE', SA:'Saudi Arabia', JP:'Japan', KR:'South Korea',
  BR:'Brazil', MX:'Mexico', ZA:'South Africa', NG:'Nigeria',
  NL:'Netherlands', SE:'Sweden', NO:'Norway', DK:'Denmark',
  PL:'Poland', IT:'Italy', ES:'Spain', PT:'Portugal',
  TR:'Turkey', EG:'Egypt', TH:'Thailand', ID:'Indonesia',
  PH:'Philippines', MY:'Malaysia', VN:'Vietnam', PK:'Pakistan',
}

const STATUS_LABEL: Record<string, string> = {
  complete:   'Complete',
  terminate:  'Disqualified',
  quota_full: 'Quota Full',
  security:   'Security Block',
  started:    'In Progress',
}

const handler = async (req: NextRequest, _user: AuthUser) => {
  try {
    const { searchParams } = new URL(req.url)
    const project_code  = searchParams.get('project_code')  || ''
    const supplier_code = searchParams.get('supplier_code') || ''
    const status        = searchParams.get('status')        || ''
    const date_from     = searchParams.get('date_from')     || ''
    const date_to       = searchParams.get('date_to')       || ''
    const country_code  = searchParams.get('country_code')  || ''
    const fake_only     = searchParams.get('fake_only')     === 'true'
    const export_mode   = searchParams.get('export_mode')   || 'all'

    // Fetch data from InsForge
    let query = insforge.database.from('respondents').select(`
      id, supplier_rid, supplier_name, supplier_code,
      client_rid, project_code, country_code,
      ip_address, device_type, browser, os, user_agent,
      status, s2s_token, s2s_verified, s2s_verified_at,
      s2s_verified_ip, s2s_payload, is_fake_suspected, fake_reason,
      oi_session, started_at, completed_at
    `).order('started_at', { ascending: false }).limit(20000)

    if (project_code)  query = query.eq('project_code',    project_code)
    if (supplier_code) query = query.eq('supplier_code',   supplier_code)
    if (status)        query = query.eq('status',          status)
    if (country_code)  query = query.eq('country_code',    country_code)
    if (date_from)     query = query.gte('started_at',     date_from)
    if (date_to)       query = query.lte('started_at',     date_to + 'T23:59:59')
    if (fake_only)     query = query.eq('is_fake_suspected', true)

    const { data, error } = await query
    if (error) throw error

    const rows = data || []
    const total      = rows.length
    const complete   = rows.filter((r: any) => r.status === 'complete').length
    const security   = rows.filter((r: any) => r.status === 'security').length
    const fake       = rows.filter((r: any) => r.is_fake_suspected).length
    const verified   = rows.filter((r: any) => r.s2s_verified).length
    const ir         = total > 0 ? ((complete / total) * 100).toFixed(1) + '%' : '0%'
    const now        = new Date()

    const wb = XLSX.utils.book_new()
    wb.Props = {
      Title: 'Enterprise Response Export',
      Author: 'OpinionInsights Admin',
      CreatedDate: now,
    }

    // SHEET 1 — COVER
    const coverData = [
      ['OPINIONINSIGHTS ENTERPRISE REPORT'],
      ['Generated On:', now.toLocaleString()],
      ['Export Mode:', export_mode.toUpperCase()],
      ['Records:', total],
      ['Completes:', complete],
      ['S2S Verified:', verified],
      ['Fraud Suspected:', fake],
      [],
      ['CONFIDENTIAL - INTERNAL USE ONLY']
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(coverData), 'Cover')

    // SHEET 2 — SUMMARY
    const supMap: Record<string, any> = {}
    rows.forEach((r: any) => {
      const k = r.supplier_code || 'Unknown'
      if (!supMap[k]) supMap[k] = { name: r.supplier_name || r.supplier_code, total: 0, complete: 0, fake: 0 }
      supMap[k].total++
      if (r.status === 'complete') supMap[k].complete++
      if (r.is_fake_suspected) supMap[k].fake++
    })
    const summaryRows = [['Rank', 'Supplier', 'Total', 'Complete', 'IR', 'Fraud Rate']]
    Object.entries(supMap).sort((a:any, b:any) => b[1].total - a[1].total).forEach(([code, s]: any, i) => {
      summaryRows.push([
        i + 1, s.name, s.total, s.complete,
        s.total > 0 ? ((s.complete/s.total)*100).toFixed(1)+'%' : '0%',
        s.total > 0 ? ((s.fake/s.total)*100).toFixed(1)+'%' : '0%'
      ])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Executive Summary')

    // SHEET 3 — FULL DATA
    const dataHeaders = [
      '#', 'Supplier UID', 'Supplier Name', 'Supplier Code', 'Client UID',
      'Project', 'Country', 'IP', 'Device', 'Status', 'S2S Verified',
      'Started', 'Ended', 'Duration(s)', 'OI Session'
    ]
    const dataRows = rows.map((r: any, i: number) => {
      const s = r.started_at ? new Date(r.started_at) : null
      const e = r.completed_at ? new Date(r.completed_at) : null
      const d = s && e ? Math.floor((e.getTime() - s.getTime()) / 1000) : '-'
      return [
        i + 1, r.supplier_rid, r.supplier_name, r.supplier_code, r.client_rid,
        r.project_code, r.country_code, r.ip_address, r.device_type, r.status,
        r.s2s_verified ? 'YES' : 'NO',
        s ? s.toLocaleString() : '-', e ? e.toLocaleString() : '-', d, r.oi_session
      ]
    })
    const dataSheet = XLSX.utils.aoa_to_sheet([dataHeaders, ...dataRows])
    dataSheet['!cols'] = [{wch:5}, {wch:25}, {wch:20}, {wch:15}, {wch:25}, {wch:15}, {wch:10}, {wch:16}, {wch:12}, {wch:12}, {wch:12}, {wch:20}, {wch:20}, {wch:12}, {wch:36}]
    XLSX.utils.book_append_sheet(wb, dataSheet, 'Full Response Data')

    // SHEET 4 — COUNTRY
    const ctryMap: Record<string, any> = {}
    rows.forEach((r: any) => {
      const k = r.country_code || '??'
      if (!ctryMap[k]) ctryMap[k] = { total: 0, complete: 0 }
      ctryMap[k].total++
      if (r.status === 'complete') ctryMap[k].complete++
    })
    const ctryRows = [['Rank', 'Country', 'Total', 'Complete', 'IR']]
    Object.entries(ctryMap).sort((a:any, b:any) => b[1].total - a[1].total).forEach(([code, c]: any, i) => {
      ctryRows.push([i+1, code, c.total, c.complete, c.total > 0 ? ((c.complete/c.total)*100).toFixed(1)+'%' : '0%'])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ctryRows), 'Country Analysis')

    // SHEET 5 — TRENDS (Daily)
    const dayMap: Record<string, any> = {}
    rows.forEach((r: any) => {
      if (!r.started_at) return
      const d = r.started_at.slice(0, 10)
      if (!dayMap[d]) dayMap[d] = { total: 0, complete: 0 }
      dayMap[d].total++
      if(r.status === 'complete') dayMap[d].complete++
    })
    const trendRows = [['Date', 'Total', 'Complete', 'IR']]
    Object.entries(dayMap).sort((a:any, b:any) => b[0].localeCompare(a[0])).forEach(([date, d]: any) => {
      trendRows.push([date, d.total, d.complete, d.total > 0 ? ((d.complete/d.total)*100).toFixed(1)+'%' : '0%'])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendRows), 'Daily Trends')

    // SHEET 6 — SECURITY
    const secHeaders = ['#', 'Project', 'Supplier', 'IP', 'Reason', 'Status']
    const secRows = rows.filter((r:any) => r.is_fake_suspected).map((r:any, i) => [
      i+1, r.project_code, r.supplier_code, r.ip_address, r.fake_reason || '-', r.status
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([secHeaders, ...secRows]), 'Security Report')

    // SHEET 7 — S2S LOG
    const s2sHeaders = ['#', 'Verified At', 'Project', 'Supplier', 'Session', 'Verified From IP']
    const s2sRows = rows.filter((r:any) => r.s2s_verified).map((r:any, i) => [
      i+1, r.s2s_verified_at ? new Date(r.s2s_verified_at).toLocaleString() : '-',
      r.project_code, r.supplier_code, r.oi_session, r.s2s_verified_ip || '-'
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s2sHeaders, ...s2sRows]), 'S2S Verification Log')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `OpinionInsights_Report_${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.xlsx`
    
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const GET = authMiddleware(handler)
