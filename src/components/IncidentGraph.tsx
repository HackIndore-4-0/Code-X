import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User, Laptop, Key, Database, Activity, GitCommit, X, Info } from 'lucide-react';
import type { GraphData } from '../types/graph';
import { NumberTicker } from '@/registry/magicui/number-ticker';


interface IncidentGraphProps {
  graphData?: GraphData;
  incidentId?: string;
  loading?: boolean;
  className?: string;
}

// Custom Node Components using Obsidian Telemetry Design System
const UserNode: React.FC<NodeProps> = ({ data }) => (
  <div className="bg-surface-container border border-primary rounded-md p-2.5 min-w-[130px] font-code-sm">
    <Handle type="target" position={Position.Top} className="!bg-primary" />
    <div className="flex items-center gap-2 text-primary font-bold text-xs">
      <User className="w-4 h-4" />
      <span>USER</span>
    </div>
    <div className="text-on-surface text-xs font-semibold mt-1 truncate">
      {String(data.label || data.name || data.id || 'USR-101')}
    </div>
    {Boolean(data.role) && <div className="text-[10px] text-on-surface-variant mt-0.5">{String(data.role)}</div>}
    <Handle type="source" position={Position.Bottom} className="!bg-primary" />
  </div>
);

const DeviceNode: React.FC<NodeProps> = ({ data }) => (
  <div className="bg-surface-container border border-tertiary rounded-md p-2.5 min-w-[130px] font-code-sm">
    <Handle type="target" position={Position.Top} className="!bg-tertiary" />
    <div className="flex items-center gap-2 text-tertiary font-bold text-xs">
      <Laptop className="w-4 h-4" />
      <span>DEVICE</span>
    </div>
    <div className="text-on-surface text-xs font-semibold mt-1 truncate">
      {String(data.label || data.name || data.id || 'DEV-882')}
    </div>
    {Boolean(data.ip) && <div className="text-[10px] text-on-surface-variant mt-0.5">{String(data.ip)}</div>}
    <Handle type="source" position={Position.Bottom} className="!bg-tertiary" />
  </div>
);

const SessionNode: React.FC<NodeProps> = ({ data }) => (
  <div className="bg-surface-container border border-secondary rounded-md p-2.5 min-w-[130px] font-code-sm">
    <Handle type="target" position={Position.Top} className="!bg-secondary" />
    <div className="flex items-center gap-2 text-secondary font-bold text-xs">
      <Key className="w-4 h-4" />
      <span>SESSION</span>
    </div>
    <div className="text-on-surface text-xs font-semibold mt-1 truncate">
      {String(data.label || data.id || 'SES-001')}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-secondary" />
  </div>
);

const ResourceNode: React.FC<NodeProps> = ({ data }) => (
  <div className="bg-surface-container border border-secondary rounded-md p-2.5 min-w-[130px] font-code-sm">
    <Handle type="target" position={Position.Top} className="!bg-secondary" />
    <div className="flex items-center gap-2 text-secondary font-bold text-xs">
      <Database className="w-4 h-4" />
      <span>RESOURCE</span>
    </div>
    <div className="text-on-surface text-xs font-semibold mt-1 truncate">
      {String(data.label || data.name || data.id || 'finance-db')}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-secondary" />
  </div>
);

const EventNode: React.FC<NodeProps> = ({ data }) => (
  <div className="bg-surface-container border border-primary rounded-md p-2.5 min-w-[130px] font-code-sm">
    <Handle type="target" position={Position.Top} className="!bg-primary" />
    <div className="flex items-center gap-2 text-primary font-bold text-xs">
      <Activity className="w-4 h-4" />
      <span>EVENT</span>
    </div>
    <div className="text-on-surface text-xs font-semibold mt-1 truncate">
      {String(data.label || data.id || 'EVT-001')}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-primary" />
  </div>
);

const nodeTypes = {
  USER: UserNode,
  user: UserNode,
  DEVICE: DeviceNode,
  device: DeviceNode,
  SESSION: SessionNode,
  session: SessionNode,
  RESOURCE: ResourceNode,
  resource: ResourceNode,
  EVENT: EventNode,
  event: EventNode,
};

interface EdgePopoverData {
  id: string;
  source: string;
  target: string;
  reason: string;
  score: number | string;
  strength?: number;
}

export const IncidentGraph: React.FC<IncidentGraphProps> = ({
  graphData,
  loading = false,
  className = '',
}) => {
  const [selectedEdge, setSelectedEdge] = useState<EdgePopoverData | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; type: string; data: Record<string, unknown> } | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      const defaultNodes: Node[] = [
        { id: 'usr-1', type: 'USER', position: { x: 250, y: 30 }, data: { label: 'USR-007', role: 'Database Admin' } },
        { id: 'dev-1', type: 'DEVICE', position: { x: 80, y: 150 }, data: { label: 'DEV-882', ip: '192.168.1.104' } },
        { id: 'ses-1', type: 'SESSION', position: { x: 420, y: 150 }, data: { label: 'SES-9921' } },
        { id: 'res-1', type: 'RESOURCE', position: { x: 250, y: 280 }, data: { label: 'finance-vault-db' } },
        { id: 'evt-1', type: 'EVENT', position: { x: 420, y: 280 }, data: { label: 'large_transfer' } },
      ];

      const defaultEdges: Edge[] = [
        {
          id: 'e1',
          source: 'usr-1',
          target: 'dev-1',
          label: 'Same user · score 0.94',
          data: { reason: 'Same session · Same device · 4 minutes apart · score 0.94', score: 0.94 },
        },
        {
          id: 'e2',
          source: 'usr-1',
          target: 'ses-1',
          label: 'Active session · score 0.91',
          data: { reason: 'Active session initiated from new IP Indore · score 0.91', score: 0.91 },
        },
        {
          id: 'e3',
          source: 'dev-1',
          target: 'res-1',
          label: 'Direct access · score 0.88',
          data: { reason: 'Direct database connection established following MFA failure · score 0.88', score: 0.88 },
        },
        {
          id: 'e4',
          source: 'ses-1',
          target: 'evt-1',
          label: 'Exfiltration · score 0.95',
          data: { reason: '650 MB bulk transfer executed during off-hours · score 0.95', score: 0.95 },
        },
      ];

      return { nodes: defaultNodes, edges: defaultEdges };
    }

    const flowNodes: Node[] = graphData.nodes.map((n, idx) => ({
      id: n.id,
      type: n.type || 'USER',
      position: n.position || { x: (idx % 3) * 220 + 100, y: Math.floor(idx / 3) * 130 + 40 },
      data: n.data || { label: n.id },
    }));

    const flowEdges: Edge[] = graphData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || (e.data?.reason ? String(e.data.reason).slice(0, 25) + '...' : 'Correlated'),
      data: e.data || { reason: e.label || 'Same session · Temporal correlation', score: 0.92 },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [graphData]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedNode(null);
    setSelectedEdge({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      reason: String(edge.data?.reason || edge.label || 'Correlated security events in session window'),
      score: (edge.data?.score as number | string) || '0.92',
    });
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedEdge(null);
    setSelectedNode({
      id: node.id,
      type: node.type || 'USER',
      data: node.data as Record<string, unknown>,
    });
  }, []);

  return (
    <div className={`bg-surface-container border border-outline-variant rounded-md p-4 space-y-3 font-code-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-2.5 font-code-sm">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-primary" />
          <h2 className="font-label-md text-on-surface">
            INCIDENT ENTITY RELATIONSHIP GRAPH
          </h2>
          <span className="font-label-sm px-2 py-0.5 rounded-sm bg-primary-container/20 text-primary border border-primary/40">
            Interactive
          </span>
        </div>
        <span className="font-code-sm text-on-surface-variant">Click graph edge or node to view correlation logic</span>
      </div>

      <div className="relative h-[360px] w-full border border-outline-variant rounded-md overflow-hidden bg-surface-container-lowest">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center font-code-sm text-on-surface-variant">
            Loading relationship graph...
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onEdgeClick={onEdgeClick}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background color="#424754" gap={16} size={1} />
            <Controls />
          </ReactFlow>
        )}

        {/* Edge Correlation Reasoning Popover */}
        {selectedEdge && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-96 bg-surface-container border border-primary rounded-md p-3 font-code-sm shadow-2xl z-50">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                <Info className="w-4 h-4" />
                <span>CORRELATION REASONING</span>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="btn-ghost p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 font-code-sm">
              <div className="flex items-center justify-between p-1.5 rounded-sm bg-tertiary-container/20 border border-tertiary/40 font-label-sm text-tertiary">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  INFERRED RELATIONSHIP
                </span>
                <span className="text-on-surface-variant">System Hypothesis</span>
              </div>

              <div className="flex justify-between text-on-surface-variant text-[11px]">
                <span>Connection:</span>
                <span className="text-on-surface font-bold">{selectedEdge.source} ↔ {selectedEdge.target}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant text-[11px]">
                <span>Correlation Strength:</span>
                <span className="text-primary font-bold">
                  {!isNaN(Number(selectedEdge.score)) ? (
                    <NumberTicker value={Number(selectedEdge.score)} decimalPlaces={2} />
                  ) : (
                    selectedEdge.score
                  )}
                </span>
              </div>
              <div className="mt-1 text-on-surface bg-surface-container-lowest p-2 rounded-sm border border-outline-variant leading-relaxed">
                {selectedEdge.reason}
              </div>

              <p className="font-body-sm text-on-surface-variant italic">
                Note: Graph edges represent inferred statistical correlations across time and entity pivots — not a single verifiable log event.
              </p>
            </div>
          </div>
        )}

        {/* Node Detail Popover */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 bg-surface-container border border-primary rounded-md p-3 font-code-sm shadow-2xl z-50">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2 mb-2">
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                <Info className="w-4 h-4" />
                <span>ENTITY DETAILS</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="btn-ghost p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 font-code-sm">
              <div className="flex justify-between text-on-surface-variant text-[11px]">
                <span>Type:</span>
                <span className="text-primary font-bold">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant text-[11px]">
                <span>Entity ID:</span>
                <span className="text-on-surface font-bold">{selectedNode.id}</span>
              </div>
              <div className="mt-2 text-on-surface bg-surface-container-lowest p-2 rounded-sm border border-outline-variant space-y-1 text-[11px]">
                {Object.entries(selectedNode.data).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-on-surface-variant">{k}:</span>
                    <span className="text-on-surface font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentGraph;
