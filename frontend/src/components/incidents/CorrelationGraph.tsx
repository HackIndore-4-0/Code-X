import React, { useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  User,
  Monitor,
  Globe,
  Terminal,
  Database,
  Activity,
  Network,
  AlertCircle,
  X,
  Info,
} from 'lucide-react';
import { getIncidentGraph } from '../../services/incidents';
import type { GraphData } from '../../types/graph';

interface CorrelationGraphProps {
  incidentId: string;
}

// Icon and color map for entity node types
const nodeTypeStyles: Record<
  string,
  { icon: React.ElementType; color: string; border: string; bg: string }
> = {
  user: {
    icon: User,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-950',
  },
  device: {
    icon: Monitor,
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-950',
  },
  ip: {
    icon: Globe,
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950',
  },
  session: {
    icon: Terminal,
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950',
  },
  resource: {
    icon: Database,
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950',
  },
  event: {
    icon: Activity,
    color: 'text-red-400',
    border: 'border-red-500/40',
    bg: 'bg-red-950',
  },
};

// Custom Node Component for React Flow
const CustomNode: React.FC<{ data: { label: string; type?: string } }> = ({ data }) => {
  const entityType = (data.type || 'resource').toLowerCase();
  const style = nodeTypeStyles[entityType] || nodeTypeStyles.resource;
  const Icon = style.icon;

  return (
    <div
      className={`px-3 py-1.5 rounded-md border ${style.border} ${style.bg} text-slate-100 flex items-center gap-2 max-w-xs`}
    >
      <div className={`p-1 rounded bg-slate-900 border border-slate-800 ${style.color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="text-left leading-tight overflow-hidden">
        <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">
          {entityType}
        </span>
        <span className="text-xs font-semibold font-mono text-slate-100 truncate block">
          {data.label}
        </span>
      </div>
    </div>
  );
};

const nodeTypes = {
  user: CustomNode,
  device: CustomNode,
  ip: CustomNode,
  session: CustomNode,
  resource: CustomNode,
  event: CustomNode,
  default: CustomNode,
};

export const CorrelationGraph: React.FC<CorrelationGraphProps> = ({ incidentId }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Popover state for selected edge
  const [selectedRelationship, setSelectedRelationship] = useState<{
    source: string;
    target: string;
    label: string;
    strength: number;
  } | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getIncidentGraph(incidentId);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Failed to fetch graph payload');
      }
      setGraphData(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading correlation graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const res = await getIncidentGraph(incidentId);
        if (!isMounted) return;
        if (!res.success || !res.data) {
          throw new Error(res.error?.message || 'Failed to fetch graph payload');
        }
        setGraphData(res.data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading correlation graph');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  // Transform graphData into React Flow nodes and edges
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graphData) return { flowNodes: [], flowEdges: [] };

    const flowNodes: Node[] = graphData.nodes.map((n) => ({
      id: n.id,
      type: n.type || 'resource',
      position: n.position || { x: 100, y: 100 },
      data: {
        label: (n.data?.label as string) || n.id,
        type: n.type || 'resource',
      },
    }));

    const flowEdges: Edge[] = graphData.edges.map((e, index) => ({
      id: e.id || `e-${index}`,
      source: e.source,
      target: e.target,
      label: e.label || 'Correlated',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#2563eb', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
      data: {
        reason: e.label || 'Entity correlation in telemetry stream',
        strength: (e.data?.strength as number) ?? 85,
      },
    }));

    return { flowNodes, flowEdges };
  }, [graphData]);

  const handleEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    const reason = (edge.data?.reason as string) || (typeof edge.label === 'string' ? edge.label : 'Correlated relationship');
    const strength = (edge.data?.strength as number) || 85;

    setSelectedRelationship({
      source: edge.source,
      target: edge.target,
      label: String(reason),
      strength,
    });
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-3 animate-pulse">
        <div className="h-4 w-44 bg-slate-800 rounded" />
        <div className="h-[320px] bg-slate-800/40 rounded-md" />
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-3 flex items-center justify-between text-xs text-red-400 font-mono">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Graph loading failed: {error}</span>
        </div>
        <button
          onClick={fetchGraph}
          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-md font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Correlation Graph
          </h2>
          <span className="text-xs font-mono px-2 py-0.2 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
            {graphData.nodes.length} Nodes • {graphData.edges.length} Edges
          </span>
        </div>
        <span className="text-xs text-slate-500 font-mono">Click edge to view relationship details</span>
      </div>

      {/* Selected Edge Relationship Details Popover */}
      {selectedRelationship && (
        <div className="p-2.5 bg-slate-950 border border-blue-500/40 rounded-md flex items-start justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-mono text-slate-200">
              <span className="font-semibold text-blue-400">{selectedRelationship.source}</span>
              <span className="text-slate-500">→</span>
              <span className="font-semibold text-purple-400">{selectedRelationship.target}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/30 ml-2">
                Score: {selectedRelationship.strength}/100
              </span>
            </div>
            <p className="text-slate-300 flex items-center gap-1.5 font-sans">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              Reasoning: <strong>{selectedRelationship.label}</strong>
            </p>
          </div>
          <button
            onClick={() => setSelectedRelationship(null)}
            className="text-slate-500 hover:text-slate-300 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive React Flow Canvas */}
      <div className="h-[340px] bg-slate-950 border border-slate-800/80 rounded-md overflow-hidden relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onEdgeClick={handleEdgeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="bg-slate-900 border-slate-800 text-slate-200" />
        </ReactFlow>
      </div>

      {/* Graph Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400 pt-1 font-mono">
        <span className="text-slate-500 uppercase tracking-wider text-[10px]">Entity Legend:</span>
        <span className="flex items-center gap-1 text-blue-400">
          <User className="w-3 h-3" /> User
        </span>
        <span className="flex items-center gap-1 text-purple-400">
          <Monitor className="w-3 h-3" /> Device
        </span>
        <span className="flex items-center gap-1 text-cyan-400">
          <Globe className="w-3 h-3" /> IP
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <Terminal className="w-3 h-3" /> Session
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <Database className="w-3 h-3" /> Resource
        </span>
      </div>
    </div>
  );
};

export default CorrelationGraph;
