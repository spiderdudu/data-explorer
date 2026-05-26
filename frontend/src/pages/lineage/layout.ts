import type { LineageGraph, LineageNode, LineageEdge } from '@/types/ontology'

export const NODE_W        = 200
export const NODE_H        = 32   // header 高度
export const FIELD_ROW_H   = 24
export const FIELD_PADDING = 0
export const COL_GAP       = 160
export const ROW_GAP       = 40
export const LABEL_TOP     = 40

export interface LayoutNode extends LineageNode {
  x: number
  y: number
  col: number
}

export function nodeHeight(node: LineageNode, expanded: boolean): number {
  if (!expanded || !node.fields?.length) return NODE_H
  return NODE_H + node.fields.length * FIELD_ROW_H
}

export function computeLayout(
  graph: LineageGraph,
  expandedIds: Set<string>,
): { nodes: LayoutNode[]; canvasW: number; canvasH: number } {
  const { nodes, edges } = graph
  if (!nodes.length) return { nodes: [], canvasW: 0, canvasH: 0 }

  const focus = nodes.find(n => n.isFocus) ?? nodes[0]
  const colMap = new Map<string, number>([[focus.id, 0]])

  const bfs = (startId: string, getNeighbors: (id: string) => string[], dir: 1 | -1) => {
    const q = [startId]
    while (q.length) {
      const cur = q.shift()!
      const curCol = colMap.get(cur)!
      getNeighbors(cur).forEach(nid => {
        if (!colMap.has(nid)) { colMap.set(nid, curCol + dir); q.push(nid) }
      })
    }
  }

  bfs(focus.id, id => edges.filter((e: LineageEdge) => e.target === id).map((e: LineageEdge) => e.source), -1)
  bfs(focus.id, id => edges.filter((e: LineageEdge) => e.source === id).map((e: LineageEdge) => e.target),  1)

  const maxCol = colMap.size > 0 ? Math.max(...colMap.values()) : 0
  let extraCol = maxCol + 2
  const visited = new Set(colMap.keys())
  nodes.filter(n => !visited.has(n.id)).forEach(startNode => {
    if (visited.has(startNode.id)) return
    const compQ = [startNode.id]
    const compNodes: string[] = []
    while (compQ.length) {
      const cur = compQ.shift()!
      if (visited.has(cur)) continue
      visited.add(cur); compNodes.push(cur)
      edges
        .filter((e: LineageEdge) => e.source === cur || e.target === cur)
        .forEach((e: LineageEdge) => {
          const nb = e.source === cur ? e.target : e.source
          if (!visited.has(nb)) compQ.push(nb)
        })
    }
    const localCol = new Map<string, number>([[compNodes[0], 0]])
    const lbfs = (sid: string, getN: (id: string) => string[], dir: 1 | -1) => {
      const q = [sid]
      while (q.length) {
        const cur = q.shift()!; const c = localCol.get(cur)!
        getN(cur).forEach(nid => {
          if (!localCol.has(nid) && compNodes.includes(nid)) { localCol.set(nid, c + dir); q.push(nid) }
        })
      }
    }
    lbfs(compNodes[0], id => edges.filter((e: LineageEdge) => e.target === id).map((e: LineageEdge) => e.source), -1)
    lbfs(compNodes[0], id => edges.filter((e: LineageEdge) => e.source === id).map((e: LineageEdge) => e.target),  1)
    compNodes.forEach(id => { if (!localCol.has(id)) localCol.set(id, 0) })
    const localMin = Math.min(...localCol.values())
    compNodes.forEach(id => colMap.set(id, extraCol + localCol.get(id)! - localMin))
    extraCol += Math.max(...localCol.values()) - localMin + 2
  })

  const byCol = new Map<number, string[]>()
  colMap.forEach((col, id) => {
    if (!byCol.has(col)) byCol.set(col, [])
    byCol.get(col)!.push(id)
  })

  const cols = [...byCol.keys()].sort((a, b) => a - b)
  const minCol = cols[0]
  const colX = new Map<number, number>()
  cols.forEach(col => colX.set(col, (col - minCol) * (NODE_W + COL_GAP)))

  const layoutNodes: LayoutNode[] = []
  byCol.forEach((ids, col) => {
    const heights = ids.map(id => nodeHeight(nodes.find(n => n.id === id)!, expandedIds.has(id)))
    const totalH  = heights.reduce((s, h) => s + h, 0) + (ids.length - 1) * ROW_GAP
    let curY = -totalH / 2
    ids.forEach((id, i) => {
      layoutNodes.push({ ...nodes.find(n => n.id === id)!, col, x: colX.get(col)!, y: curY })
      curY += heights[i] + ROW_GAP
    })
  })

  const minY = Math.min(...layoutNodes.map(n => n.y))
  layoutNodes.forEach(n => { n.y += LABEL_TOP - minY })

  const canvasW = Math.max(...layoutNodes.map(n => n.x)) + NODE_W
  const canvasH = Math.max(...layoutNodes.map(n => n.y + nodeHeight(n, expandedIds.has(n.id))))
  return { nodes: layoutNodes, canvasW, canvasH }
}

export function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`
}

// SQLFlow 风格颜色
export const EDGE_COLOR: Record<string, string> = {
  TRANSFORMED: '#888888',
  COPY:        '#52c41a',
  VIEW:        '#fa8c16',
}

// 节点 header 颜色：上游=灰，焦点=绿，下游=红橙
export function nodeHeaderColor(col: number, isFocus: boolean): string {
  if (isFocus) return '#5a9e5a'
  if (col < 0)  return '#7a7a7a'
  return '#c0614a'
}

export function colLabel(col: number): string {
  if (col < 0) return `上游 ${Math.abs(col)} 跳`
  if (col === 0) return '当前'
  return `下游 ${col} 跳`
}
