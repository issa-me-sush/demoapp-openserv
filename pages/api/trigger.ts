import type { NextApiRequest, NextApiResponse } from 'next'

const WEBHOOK_URL = process.env.OPENSERV_WEBHOOK_URL || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (!WEBHOOK_URL) {
    return res.status(500).json({ 
      error: 'OPENSERV_WEBHOOK_URL not configured',
      hint: 'Add OPENSERV_WEBHOOK_URL to your .env file'
    })
  }

  try {
    console.log('🚀 Triggering webhook:', WEBHOOK_URL)
    console.log('📦 Payload:', req.body)

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    })

    const text = await response.text()
    let data: any
    
    try { 
      data = JSON.parse(text) 
    } catch {
      data = { raw: text }
    }

    console.log('✅ Webhook response:', response.status, data)

    res.status(response.status).json({ 
      ok: response.ok, 
      status: response.status, 
      data 
    })
  } catch (err: any) {
    console.error('❌ Webhook error:', err)
    res.status(500).json({ 
      ok: false, 
      error: err?.message || 'unknown error' 
    })
  }
}

