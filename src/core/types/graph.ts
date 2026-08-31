// Kingdom Graph — every object is a node, every relationship is an edge.
// In production backed by PostgreSQL + Apache AGE (graph extension).

export type KingdomNodeType =
  | 'user'
  | 'organization'
  | 'book'
  | 'author'
  | 'event'
  | 'prayer_request'
  | 'scripture'
  | 'podcast'
  | 'course'
  | 'group'

export type KingdomEdgeType =
  | 'member_of'
  | 'authored'
  | 'references'
  | 'attended'
  | 'prayed_for'
  | 'part_of'
  | 'connected_to'
  | 'teaches'
  | 'hosted_by'

export interface KingdomNode {
  id: string
  type: KingdomNodeType
  label: string
  sublabel?: string
  // Graph layout — computed by force simulation
  x: number
  y: number
  radius: number
}

export interface KingdomEdge {
  id: string
  sourceId: string
  targetId: string
  type: KingdomEdgeType
  label?: string
  weight: number // 1.0 = strong, 0.1 = weak
}

export interface KingdomGraph {
  nodes: KingdomNode[]
  edges: KingdomEdge[]
  // The seed node — the scripture, person, or org this graph was traversed from
  rootNodeId: string
}
