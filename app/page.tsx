'use client'

import { useState } from 'react'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  // Get polling config from env (with defaults)
  const CALLBACK_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_CALLBACK_TIMEOUT || '60000')
  const POLL_INTERVAL = parseInt(process.env.NEXT_PUBLIC_CALLBACK_POLL_INTERVAL || '1000')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prompt.trim()) {
      setStatus('Please enter a prompt')
      return
    }

    setLoading(true)
    setStatus('Sending to agent...')
    setResult('')

    // Generate unique ID for this request
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Set up polling for callback
      const callbackPromise = new Promise<any>((resolve) => {
        const startTime = Date.now()
        
        const checkCallback = async () => {
          try {
            const checkResponse = await fetch(`/api/callback?id=${id}`)
            if (checkResponse.ok) {
              const data = await checkResponse.json()
              if (data.output) {
                resolve(data.output)
                return
              }
            }
          } catch (e) {
            // Ignore polling errors
          }
          
          // Check if timed out
          if (Date.now() - startTime > CALLBACK_TIMEOUT) {
            resolve({ error: `Timeout after ${CALLBACK_TIMEOUT / 1000}s waiting for response` })
            return
          }
          
          // Poll again after configured interval
          setTimeout(checkCallback, POLL_INTERVAL)
        }
        
        // Start polling
        checkCallback()
      })

      // Trigger webhook
      setStatus('Triggering agent workflow...')
      const triggerResponse = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id,
          prompt
        })
      })

      if (!triggerResponse.ok) {
        throw new Error(`Trigger failed: ${triggerResponse.status}`)
      }

      setStatus('Waiting for agent response...')

      // Wait for callback
      const callbackData = await callbackPromise
      
      if (callbackData.error) {
        setStatus(`Error: ${callbackData.error}`)
      } else {
        setStatus('✅ Response received!')
        setResult(typeof callbackData === 'string' ? callbackData : JSON.stringify(callbackData, null, 2))
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            OpenServ Agent Demo
          </h1>
          <p className="text-gray-600 mb-8">
            Send a prompt to the agent and wait for the response via callback
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Your Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here... (e.g., 'What is web3?')"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={4}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
                loading || !prompt.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? 'Processing...' : 'Send to Agent'}
            </button>
          </form>

          {status && (
            <div className={`mt-6 p-4 rounded-lg ${
              status.includes('Error') || status.includes('❌')
                ? 'bg-red-50 border border-red-200'
                : status.includes('✅')
                ? 'bg-green-50 border border-green-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm font-medium ${
                status.includes('Error') || status.includes('❌')
                  ? 'text-red-800'
                  : status.includes('✅')
                  ? 'text-green-800'
                  : 'text-blue-800'
              }`}>
                {status}
              </p>
            </div>
          )}

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Agent Response:
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {result}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            How it works:
          </h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="font-bold text-indigo-600 mr-2">1.</span>
              <span>Enter a prompt → sends <code className="bg-gray-100 px-1 rounded">{'{ id, prompt }'}</code> to webhook</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-indigo-600 mr-2">2.</span>
              <span>OpenServ intelligently processes your prompt</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-indigo-600 mr-2">3.</span>
              <span>Agent generates response</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-indigo-600 mr-2">4.</span>
              <span>REST API agent sends <code className="bg-gray-100 px-1 rounded">{'{ id, output }'}</code> back</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-indigo-600 mr-2">5.</span>
              <span>Frontend polls every {POLL_INTERVAL / 1000}s (max {CALLBACK_TIMEOUT / 1000}s) → finds result → displays ✨</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}

