import React, { useState } from 'react'
import ChatWindow from '../components/ChatWindow'
import PropertyGrid from '../components/PropertyGrid'

const TERMINAL_STEP = new Set(['done', 'complete', 'skipped', 'error'])

function stepsSettled(steps) {
  if (!steps?.length) return false
  return steps.every((s) => TERMINAL_STEP.has(s.status))
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  function handleAgentUpdate(steps) {
    const settled = stepsSettled(steps)
    if (settled && steps?.length) {
      setRefreshTrigger((n) => n + 1)
    }
  }

  return (
    <div className="relative z-10 flex h-full min-h-0 w-full flex-col bg-[#0A0E1A] md:flex-row">
      <aside className="flex min-h-0 flex-[2] flex-col border-b border-[rgba(201,168,76,0.1)] bg-[rgba(17,24,39,0.75)] md:h-full md:w-2/5 md:flex-none md:border-b-0 md:border-r">
        <ChatWindow onAgentUpdate={handleAgentUpdate} />
      </aside>

      <main className="flex min-h-0 flex-[3] flex-col md:h-full md:w-3/5 md:flex-none">
        <PropertyGrid refreshTrigger={refreshTrigger} />
      </main>
    </div>
  )
}
