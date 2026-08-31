// Kingdom Graph — interactive visualization of connected Kingdom objects.
// Uses a simple force-directed layout simulation in pure React + SVG.
// In production: backed by PostgreSQL + Apache AGE with semantic search.

import { useState, useCallback, useRef, useEffect } from 'react'
import type { KingdomNode, KingdomEdge, KingdomGraph } from '../../core/types/graph'

const SAMPLE_GRAPH: KingdomGraph = {
  rootNodeId: '',
  nodes: [],
  edges: [],
}

const NODE_COLORS: Record<string, string> = {
  user:           'var(--color-graph-node-user)',
  organization:   'var(--color-graph-node-org)',
  book:           'var(--color-graph-node-book)',
  author:         '#10B981',
  event:          'var(--color-graph-node-event)',
  prayer_request: 'var(--color-graph-node-prayer)',
  scripture:      'var(--color-brand-gold)',
  course:         '#F97316',
  group:          '#06B6D4',
  podcast:        '#6366F1',
}

const NODE_ICONS: Record<string, string> = {
  user: '👤', organization: '⛪', book: '📖', author: '✍️',
  event: '📅', prayer_request: '🙏', scripture: '✝️',
  course: '🎓', group: '👥', podcast: '🎙️',
}

export default function KingdomGraphView() {
  const [graph] = useState<KingdomGraph>(SAMPLE_GRAPH)
  const isEmpty = SAMPLE_GRAPH.nodes.length === 0
  const [selected, setSelected] = useState<KingdomNode | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [nodes, setNodes] = useState<KingdomNode[]>(SAMPLE_GRAPH.nodes)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent, node: KingdomNode) => {
    e.stopPropagation()
    const rect = svgRef.current!.getBoundingClientRect()
    setDragging({ id: node.id, offsetX: e.clientX - rect.left - node.x, offsetY: e.clientY - rect.top - node.y })
    setSelected(node)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const rect = svgRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - dragging.offsetX
    const y = e.clientY - rect.top - dragging.offsetY
    setNodes(ns => ns.map(n => n.id === dragging.id ? { ...n, x, y } : n))
  }, [dragging])

  const handleMouseUp = useCallback(() => setDragging(null), [])

  const getNode = (id: string) => nodes.find(n => n.id === id)

  const selectedEdges = selected
    ? graph.edges.filter(e => e.sourceId === selected.id || e.targetId === selected.id)
    : []
  const connectedIds = new Set(selectedEdges.flatMap(e => [e.sourceId, e.targetId]))

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-brand-navy) 0%, var(--color-brand-slate) 100%)',
        borderRadius: 'var(--radius-lg)', padding: '20px',
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-serif)' }}>
          ⚡ Kingdom Graph
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
          Every object is connected. Click a node to explore its relationships.
        </p>
      </div>

      {isEmpty && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>⚡</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)', marginBottom: '8px' }}>Kingdom Graph is empty</div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>Connected scripture, people, events, and resources will appear here once data is added.</div>
        </div>
      )}
      {!isEmpty && <div className="grid-aside-260" style={{ flex: 1, minHeight: 0 }}>
        {/* Graph canvas */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          minHeight: '520px',
        }}>
          {/* Grid background */}
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0, cursor: dragging ? 'grabbing' : 'default', minHeight: '520px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.5" />
              </pattern>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-text-muted)" opacity="0.5" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges */}
            {graph.edges.map(edge => {
              const src = getNode(edge.sourceId)
              const tgt = getNode(edge.targetId)
              if (!src || !tgt) return null
              const isHighlighted = connectedIds.has(edge.sourceId) && connectedIds.has(edge.targetId)
              return (
                <g key={edge.id}>
                  <line
                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke={isHighlighted ? 'var(--color-brand-gold)' : 'var(--color-graph-edge)'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeDasharray={edge.type === 'references' ? '4 4' : undefined}
                    opacity={selected && !isHighlighted ? 0.2 : 1}
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const color = NODE_COLORS[node.type] ?? '#999'
              const isRoot = node.id === graph.rootNodeId
              const isSelected = selected?.id === node.id
              const isConnected = connectedIds.has(node.id)
              const isDimmed = selected && !isSelected && !isConnected
              const isHovered = hoveredId === node.id

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={e => handleMouseDown(e, node)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: 'grab' }}
                  opacity={isDimmed ? 0.25 : 1}
                >
                  {/* Outer glow ring for root / selected */}
                  {(isRoot || isSelected) && (
                    <circle
                      r={node.radius + 8}
                      fill="none"
                      stroke={isRoot ? 'var(--color-brand-gold)' : 'var(--color-prayer)'}
                      strokeWidth={2}
                      opacity={0.5}
                      strokeDasharray={isRoot ? undefined : '4 4'}
                    />
                  )}
                  {/* Hover ring */}
                  {isHovered && !isSelected && (
                    <circle r={node.radius + 5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
                  )}
                  {/* Main circle */}
                  <circle
                    r={node.radius}
                    fill={color}
                    opacity={0.9}
                    filter={isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : undefined}
                  />
                  {/* Icon */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={node.radius * 0.7}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {NODE_ICONS[node.type] ?? '●'}
                  </text>
                  {/* Label */}
                  <text
                    y={node.radius + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={isSelected || isRoot ? 700 : 500}
                    fill="var(--color-text-primary)"
                    style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'var(--font-sans)' }}
                  >
                    {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Side panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Node detail */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {selected ? (
              <>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  backgroundColor: NODE_COLORS[selected.type] ?? '#999',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', marginBottom: '12px',
                }}>
                  {NODE_ICONS[selected.type] ?? '●'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-brand-gold)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  {selected.type.replace('_', ' ')}
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.label}</h3>
                {selected.sublabel && <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{selected.sublabel}</p>}
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{selectedEdges.length}</strong> direct connections
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedEdges.map(edge => {
                    const other = getNode(edge.sourceId === selected.id ? edge.targetId : edge.sourceId)
                    if (!other) return null
                    return (
                      <div key={edge.id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-bg)',
                        fontSize: '12px', cursor: 'pointer',
                      }}
                        onClick={() => setSelected(other)}
                      >
                        <span>{NODE_ICONS[other.type] ?? '●'}</span>
                        <span style={{ flex: 1, fontWeight: 600, color: 'var(--color-text-primary)' }}>{other.label}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>{edge.type.replace('_', ' ')}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Click any node to explore its connections in the Kingdom Graph.
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '14px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Node Types</div>
            {Object.entries(NODE_ICONS).map(([type, icon]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: NODE_COLORS[type] ?? '#999',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', flexShrink: 0,
                }}>
                  {icon}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                  {type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>}
    </div>
  )
}
