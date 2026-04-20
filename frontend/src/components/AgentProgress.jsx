import React, { useState, useEffect } from 'react'
import { agentProgressSteps } from '../data/dummyData'

// Individual log line
function LogLine({ text, index }) {
  return (
    <div
      className="text-[11px] font-mono text-[#9AA0B0] flex gap-2"
      style={{ animationDelay: `${index * 0.06}s`, opacity: 0, animation: 'fadeInUp 0.3s ease forwards' }}
    >
      <span className="text-[#C9A84C] opacity-50">›</span>
      <span>{text}</span>
    </div>
  )
}

// LangGraph node
function GraphNode({ step, status }) {
  const isActive = status === 'active'
  const isDone = status === 'done'
  const isError = status === 'error'
  const isIdle = status === 'idle'
  const accent = isError ? '#E85454' : step.color

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
          isActive ? 'node-pulse' : ''
        }`}
        style={{
          background: isError
            ? 'rgba(232,84,84,0.12)'
            : isDone
            ? `linear-gradient(135deg, ${step.color}33, ${step.color}11)`
            : isActive
            ? `radial-gradient(circle, ${step.color}44, ${step.color}11)`
            : 'rgba(26,35,64,0.6)',
          border: `2px solid ${
            isError ? '#E85454' : isDone ? step.color : isActive ? step.color : 'rgba(74,85,104,0.4)'
          }`,
          boxShadow: isActive ? `0 0 16px ${step.color}44` : isDone ? `0 0 8px ${step.color}22` : isError ? '0 0 10px rgba(232,84,84,0.35)' : 'none',
        }}
      >
        <span className="text-lg">{step.icon}</span>
        {isDone && !isError && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#22C97B] flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isError && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E85454] flex items-center justify-center text-[10px] text-white font-bold">
            !
          </div>
        )}
      </div>
      <div className="text-center">
        <p
          className="text-xs font-medium"
          style={{
            color: isError ? accent : isDone ? step.color : isActive ? step.color : '#4A5568',
            fontFamily: 'DM Mono',
          }}
        >
          {step.label}
        </p>
      </div>
    </div>
  )
}

// Connector line between nodes
function Connector({ active }) {
  return (
    <div className="flex-1 h-px mx-1 relative overflow-hidden mt-6">
      <div className="absolute inset-0 bg-[#2A3452]" />
      {active && (
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C9A84C] to-transparent"
          style={{ width: '60%', animation: 'progressLine 1s ease forwards' }}
        />
      )}
    </div>
  )
}

const DEMO_LOGS = {
  llm: [
    'Resolving session & LangGraph state…',
    'Building system + user messages for Groq…',
    'Streaming / waiting on model tokens…',
    '✓ Assistant reply ready',
  ],
  scout: [
    'Initializing web search tool...',
    'Query: "Austin TX apartments pet friendly <$2500"',
    'Fetching: zillow.com/austin-apartments...',
    'Found: 1402 S Congress Ave — $1,850/mo',
    'Scraping title, price, address, amenities...',
    'Fetching: apartments.com/austin...',
    'Found: 3200 E Riverside Dr — $2,200/mo',
    '✓ 2 properties extracted successfully',
  ],
  inspector: [
    'Launching headless Chromium browser...',
    'Navigating to localhost:3000/map-simulator',
    'Locating #address-input selector...',
    'Typing: "1402 South Congress Ave, Austin TX"',
    'Clicking #search-btn...',
    '📸 Screenshot captured: screenshot_prop_1.png',
    'Typing: "3200 East Riverside Dr, Austin TX"',
    'Clicking #search-btn...',
    '📸 Screenshot captured: screenshot_prop_2.png',
    '✓ Visual verification complete',
  ],
  broker: [
    'Running: mkdir -p ./listings/austin_prop_01',
    'Running: mv screenshot_prop_1.png ./listings/austin_prop_01/view.png',
    'Writing: ./listings/austin_prop_01/lease_draft.txt',
    '  → "Lease Agreement for 1402 S Congress Ave..."',
    'Running: mkdir -p ./listings/austin_prop_02',
    'Running: mv screenshot_prop_2.png ./listings/austin_prop_02/view.png',
    'Writing: ./listings/austin_prop_02/lease_draft.txt',
    '✓ File system operations complete',
  ],
  crm: [
    'Connecting to MongoDB: localhost:27017...',
    'Inserting into collection: listings...',
    '  → { address, price, folder, screenshot_path }',
    'Inserting property 2...',
    'Updating user_profile collection...',
    '  → { pets: [{type:"cat"}], maxPrice: 2500 }',
    'Memory stored: has_pets = true',
    '✓ Database operations complete',
  ],
}

function isTerminalStatus(status) {
  return status === 'done' || status === 'complete' || status === 'skipped' || status === 'error'
}

function stepKey(s) {
  return s.id || s.node
}

export default function AgentProgress({ steps, running }) {
  const [activeNode, setActiveNode] = useState(null)
  const [completedNodes, setCompletedNodes] = useState([])
  const [logs, setLogs] = useState([])
  const [logKey, setLogKey] = useState(null)
  const [logLines, setLogLines] = useState([])

  const backendLlmOnly =
    steps?.length > 0 && steps.every((s) => (s.id === 'llm' || s.node === 'llm'))

  const pipelineTotal = backendLlmOnly ? 1 : agentProgressSteps.length
  const pipelineDone = backendLlmOnly
    ? completedNodes.includes('llm')
    : completedNodes.length === 4

  // Demo mode: auto-simulate when no external steps
  useEffect(() => {
    if (!running || steps?.length) return

    let stepIdx = 0
    const stepIds = ['scout', 'inspector', 'broker', 'crm']

    function runStep() {
      if (stepIdx >= stepIds.length) {
        setActiveNode(null)
        return
      }
      const id = stepIds[stepIdx]
      setActiveNode(id)
      setLogKey(id)
      setLogLines([])

      const lines = DEMO_LOGS[id]
      let lineIdx = 0
      const lineInterval = setInterval(() => {
        if (lineIdx < lines.length) {
          setLogLines((prev) => [...prev, lines[lineIdx]])
          lineIdx++
        } else {
          clearInterval(lineInterval)
          setCompletedNodes((prev) => [...prev, id])
          stepIdx++
          setTimeout(runStep, 600)
        }
      }, 250)
    }

    setCompletedNodes([])
    setActiveNode(null)
    const timer = setTimeout(runStep, 400)
    return () => clearTimeout(timer)
  }, [running])

  // External steps mode (multi-node demo ids or backend `llm` node)
  useEffect(() => {
    if (!steps?.length) return
    const done = steps.filter((s) => isTerminalStatus(s.status)).map((s) => stepKey(s))
    const activeStep = steps.find((s) => s.status === 'active')
    const active = activeStep ? stepKey(activeStep) : null
    setCompletedNodes(done)
    setActiveNode(active)
    const key = active || done[done.length - 1]
    if (key && DEMO_LOGS[key]) {
      setLogLines(DEMO_LOGS[key])
    } else if (backendLlmOnly && steps[0]?.detail) {
      setLogLines([String(steps[0].detail)])
    }
  }, [steps, backendLlmOnly])

  const getStatus = (id) => {
    const st = steps?.find((s) => stepKey(s) === id)
    if (st?.status === 'error') return 'error'
    if (completedNodes.includes(id)) return 'done'
    if (activeNode === id) return 'active'
    return 'idle'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[rgba(201,168,76,0.1)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#F0EDE6]" style={{ fontFamily: 'Cormorant Garamond', fontSize: '16px' }}>
            Agent Pipeline
          </h3>
          {running && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] node-pulse" />
              <span className="text-[10px] text-[#C9A84C] font-mono tracking-wider">RUNNING</span>
            </div>
          )}
          {!running && pipelineDone && (
            <span className="text-[10px] text-[#22C97B] font-mono tracking-wider">✓ COMPLETE</span>
          )}
        </div>
      </div>

      {/* LangGraph visualization */}
      <div className="px-5 py-5 border-b border-[rgba(201,168,76,0.1)]">
        <p className="text-[10px] text-[#4A5568] font-mono mb-4 tracking-widest uppercase">LangGraph Flow</p>
        {backendLlmOnly ? (
          <div className="flex items-start justify-center">
            <GraphNode
              step={{
                id: 'llm',
                label: 'LLM',
                icon: '✨',
                description: 'Groq chat completion (live session)',
                color: '#C9A84C',
              }}
              status={getStatus('llm')}
            />
          </div>
        ) : (
          <div className="flex items-start">
            {agentProgressSteps.map((step, i) => (
              <React.Fragment key={step.id}>
                <GraphNode step={step} status={getStatus(step.id)} />
                {i < agentProgressSteps.length - 1 && (
                  <Connector active={getStatus(step.id) === 'done'} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Active node detail */}
      {activeNode && (
        <div className="px-5 py-3 border-b border-[rgba(201,168,76,0.1)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">
              {(backendLlmOnly ? '✨' : agentProgressSteps.find((s) => s.id === activeNode)?.icon)}
            </span>
            <span className="text-xs font-medium text-[#C9A84C]" style={{ fontFamily: 'DM Mono' }}>
              {(backendLlmOnly ? 'LLM' : agentProgressSteps.find((s) => s.id === activeNode)?.label)} Node Active
            </span>
          </div>
          <p className="text-[11px] text-[#9AA0B0]">
            {(backendLlmOnly
              ? 'Calling Groq via LangGraph (poll /api/agent/status for live state).'
              : agentProgressSteps.find((s) => s.id === activeNode)?.description)}
          </p>
        </div>
      )}

      {/* Live logs */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        <p className="text-[10px] text-[#4A5568] font-mono mb-3 tracking-widest uppercase">
          Live Logs
        </p>
        {!running && completedNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <div className="w-8 h-8 rounded-full border border-[#2A3452] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#4A5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[11px] text-[#4A5568] text-center">Send a message to start the agent</p>
          </div>
        )}
        <div className="space-y-1.5">
          {logLines.map((line, i) => (
            <LogLine key={`${logKey}_${i}`} text={line} index={i} />
          ))}
          {running && activeNode && (
            <div className="flex gap-2 items-center text-[11px] font-mono text-[#C9A84C]">
              <span>›</span>
              <span className="cursor-blink">_</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <div className="flex justify-between text-[10px] text-[#4A5568] mb-1.5 font-mono">
          <span>Progress</span>
          <span>{completedNodes.length}/{pipelineTotal} nodes</span>
        </div>
        <div className="h-1 bg-[#1A2340] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(completedNodes.length / Math.max(1, pipelineTotal)) * 100}%`,
              background: 'linear-gradient(90deg, #C9A84C, #E8C96A)',
            }}
          />
        </div>
      </div>
    </div>
  )
}