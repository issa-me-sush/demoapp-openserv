import type { NextApiRequest, NextApiResponse } from 'next'

// In-memory store for callbacks (in production, use Redis, database, or Server-Sent Events)
const callbacks = new Map<string, any>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // POST: Receive callback from agent
  if (req.method === 'POST') {
    try {
      const { id, output } = req.body

      if (!id) {
        console.error('❌ Callback missing ID:', req.body)
        return res.status(400).json({ error: 'Missing id in callback' })
      }

      console.log('📥 Callback received:', { id, output: typeof output })

      // Store callback data
      callbacks.set(id, output)

      // Auto-cleanup after 5 minutes
      setTimeout(() => {
        callbacks.delete(id)
      }, 5 * 60 * 1000)

      return res.status(200).json({ 
        ok: true, 
        id,
        message: 'Callback received'
      })
    } catch (err: any) {
      console.error('❌ Callback error:', err)
      return res.status(500).json({ 
        ok: false, 
        error: err?.message || 'unknown error' 
      })
    }
  }

  // GET: Check if callback exists (for polling)
  if (req.method === 'GET') {
    const id = req.query.id as string
    
    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' })
    }

    const output = callbacks.get(id)
    
    if (output) {
      // Delete after retrieving (prevent multiple reads)
      callbacks.delete(id)
      return res.status(200).json({ ok: true, output })
    }

    return res.status(404).json({ ok: false, message: 'Callback not found yet' })
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}

