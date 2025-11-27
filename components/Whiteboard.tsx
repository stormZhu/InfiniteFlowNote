import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel,
  NodeChange,
  EdgeChange,
  useReactFlow
} from 'reactflow';
import MindMapNode from './MindMapNode';
import { Plus, Save, Layout } from './ui/Icons';
import { WhiteboardFile } from '../types';

const nodeTypes = {
  mindMap: MindMapNode,
};

interface WhiteboardProps {
  file: WhiteboardFile;
  onSave: (fileId: string, nodes: Node[], edges: Edge[]) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
}

const WhiteboardInner: React.FC<WhiteboardProps> = ({ file, onSave, onNodeClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { project, screenToFlowPosition, getNodes } = useReactFlow();
  const fileIdRef = useRef(file.id);

  // Sync state when file changes
  useEffect(() => {
    if (file.id !== fileIdRef.current) {
        // File switched, reset state from props
        fileIdRef.current = file.id;
        setNodes(file.content.nodes || []);
        setEdges(file.content.edges || []);
    } else {
        // Same file, just ensure we have data if it was empty initially
        if (nodes.length === 0 && file.content.nodes.length > 0) {
            setNodes(file.content.nodes);
            setEdges(file.content.edges);
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.content]); // Only reset heavily if ID changes

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)),
    [setEdges]
  );

  const handleSave = useCallback(() => {
    onSave(file.id, nodes, edges);
  }, [file.id, nodes, edges, onSave]);

  const addNode = useCallback(() => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'mindMap',
      position: { 
        x: Math.random() * 400, 
        y: Math.random() * 400 
      },
      data: { label: 'New Concept', note: '' },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      const currentNodes = getNodes();
      const selectedNodes = currentNodes.filter(n => n.selected);

      // Only proceed if exactly one parent is selected
      if (selectedNodes.length === 1) {
        event.preventDefault(); // Prevent focus switch
        const parent = selectedNodes[0];
        
        const newId = `node_${Date.now()}`;
        const childNode: Node = {
          id: newId,
          type: 'mindMap',
          position: { 
            x: parent.position.x + 250, 
            y: parent.position.y + (Math.random() - 0.5) * 50 // Slight vertical jitter to prevent exact stacking
          },
          data: { label: 'New Node', note: '' },
          selected: true, // Auto-select the new node
        };

        const newEdge: Edge = {
          id: `e${parent.id}-${newId}`,
          source: parent.id,
          target: newId,
          type: 'smoothstep',
          animated: true
        };

        // Deselect parent and add new node
        setNodes((nds) => [...nds.map(n => ({...n, selected: false})), childNode]);
        setEdges((eds) => addEdge(newEdge, eds));
      }
    }
  }, [getNodes, setNodes, setEdges]);

  const onNodeClickInternal = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        onNodeClick(event, node);
    }
  }, [onNodeClick]);

  return (
    <div className="w-full h-full bg-slate-50 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onKeyDown={onKeyDown}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClickInternal}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
      >
        <Background gap={20} color="#e2e8f0" size={1} />
        <Controls />
        <MiniMap 
            nodeColor={() => '#3b82f6'} 
            maskColor="rgb(241, 245, 249, 0.7)"
            className="!bg-white !border !border-slate-200 !shadow-lg !rounded-lg"
        />
        
        <Panel position="top-right" className="flex gap-2">
           <button 
            onClick={addNode}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm px-3 py-2 rounded-md flex items-center gap-2 font-medium text-sm transition-all"
           >
            <Plus size={16} /> Add Node
           </button>
           <button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-3 py-2 rounded-md flex items-center gap-2 font-medium text-sm transition-all"
           >
            <Save size={16} /> Save Board
           </button>
        </Panel>
      </ReactFlow>

      {/* Floating hints */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-500 pointer-events-none z-10">
        <p className="flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Tab</span> to Create Child Node</p>
        <p className="mt-1 flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Double Click</span> to Edit Label</p>
        <p className="mt-1 flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Ctrl + Click</span> to Edit Notes</p>
        <p className="mt-1 flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Backspace</span> to Delete Node</p>
      </div>
    </div>
  );
};

// Wrapper to provide ReactFlow Context
const Whiteboard: React.FC<WhiteboardProps> = (props) => (
  <ReactFlowProvider>
    <WhiteboardInner {...props} />
  </ReactFlowProvider>
);

export default Whiteboard;