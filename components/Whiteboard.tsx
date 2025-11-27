import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  useReactFlow,
  NodeDragHandler
} from 'reactflow';
import MindMapNode from './MindMapNode';
import { Plus, Save, Layout, ArrowRight, ArrowLeft, ArrowDown, ArrowUp, List } from './ui/Icons';
import { WhiteboardFile, LayoutDirection } from '../types';

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
  const { project, screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const fileIdRef = useRef(file.id);
  
  // Double click detection on pane
  const lastPaneClickTimeRef = useRef(0);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Sync state when file changes
  useEffect(() => {
    if (file.id !== fileIdRef.current) {
        fileIdRef.current = file.id;
        setNodes(file.content.nodes || []);
        setEdges(file.content.edges || []);
    } else {
        if (nodes.length === 0 && file.content.nodes.length > 0) {
            setNodes(file.content.nodes);
            setEdges(file.content.edges);
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.content]);

  // --- Layout Engine ---

  const getSubtree = useCallback((nodeId: string, allNodes: Node[], allEdges: Edge[]) => {
    const children: string[] = [];
    const stack = [nodeId];
    const visited = new Set<string>();
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      if (current !== nodeId) children.push(current);

      const outGoingEdges = allEdges.filter(e => e.source === current);
      outGoingEdges.forEach(e => stack.push(e.target));
    }
    return children;
  }, []);

  // Recursive layout calculator returning box size { width, height }
  const calculateLayout = useCallback((nodeId: string, direction: LayoutDirection, allNodes: Node[], allEdges: Edge[], visited: Set<string> = new Set()): { width: number, height: number } => {
    if (visited.has(nodeId)) return { width: 0, height: 0 };
    visited.add(nodeId);

    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return { width: 0, height: 0 };

    // Get direct children
    const childEdges = allEdges.filter(e => e.source === nodeId);
    const childIds = childEdges.map(e => e.target);

    // Node dimensions (approximate or based on data if we had it, strictly visual estimation here)
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 50;
    const GAP_X = 50;
    const GAP_Y = 20;

    if (childIds.length === 0) {
        return { width: NODE_WIDTH, height: NODE_HEIGHT };
    }

    let totalWidth = 0;
    let totalHeight = 0;

    switch (direction) {
      case 'horizontal-right': {
        let currentY = 0;
        const childSizes = childIds.map(childId => {
            // Children inherit layout unless they have their own
            const childNode = allNodes.find(n => n.id === childId);
            const childDir = childNode?.data?.layoutType || direction;
            return calculateLayout(childId, childDir, allNodes, allEdges, visited);
        });

        const childrenTotalHeight = childSizes.reduce((acc, size) => acc + size.height, 0) + (childIds.length - 1) * GAP_Y;
        
        // Start positioning children centered relative to parent vertically
        let startY = -childrenTotalHeight / 2 + NODE_HEIGHT / 2;
        
        childIds.forEach((childId, index) => {
            const childNode = allNodes.find(n => n.id === childId);
            if (childNode) {
                const size = childSizes[index];
                // Center child content vertically in its slot
                const childCenterY = startY + size.height / 2 - NODE_HEIGHT / 2;
                
                // Position relative to parent
                childNode.position = {
                    x: NODE_WIDTH + GAP_X,
                    y: childCenterY
                };
                startY += size.height + GAP_Y;
            }
        });

        return { 
            width: NODE_WIDTH + GAP_X + Math.max(...childSizes.map(s => s.width)), 
            height: Math.max(NODE_HEIGHT, childrenTotalHeight) 
        };
      }
      case 'horizontal-left': {
        const childSizes = childIds.map(childId => {
            const childNode = allNodes.find(n => n.id === childId);
            const childDir = childNode?.data?.layoutType || direction;
            return calculateLayout(childId, childDir, allNodes, allEdges, visited);
        });

        const childrenTotalHeight = childSizes.reduce((acc, size) => acc + size.height, 0) + (childIds.length - 1) * GAP_Y;
        let startY = -childrenTotalHeight / 2 + NODE_HEIGHT / 2;
        
        childIds.forEach((childId, index) => {
            const childNode = allNodes.find(n => n.id === childId);
            if (childNode) {
                const size = childSizes[index];
                const childCenterY = startY + size.height / 2 - NODE_HEIGHT / 2;
                childNode.position = {
                    x: -(NODE_WIDTH + GAP_X),
                    y: childCenterY
                };
                startY += size.height + GAP_Y;
            }
        });

        return { 
            width: NODE_WIDTH + GAP_X + Math.max(...childSizes.map(s => s.width)), 
            height: Math.max(NODE_HEIGHT, childrenTotalHeight) 
        };
      }
      case 'vertical-down': {
        const childSizes = childIds.map(childId => {
            const childNode = allNodes.find(n => n.id === childId);
            const childDir = childNode?.data?.layoutType || direction;
            return calculateLayout(childId, childDir, allNodes, allEdges, visited);
        });

        const childrenTotalWidth = childSizes.reduce((acc, size) => acc + size.width, 0) + (childIds.length - 1) * GAP_X;
        let startX = -childrenTotalWidth / 2 + NODE_WIDTH / 2;

        childIds.forEach((childId, index) => {
            const childNode = allNodes.find(n => n.id === childId);
            if (childNode) {
                const size = childSizes[index];
                // Center child horizontally
                const childCenterX = startX + size.width / 2 - NODE_WIDTH / 2;
                
                childNode.position = {
                    x: childCenterX,
                    y: NODE_HEIGHT + GAP_Y
                };
                startX += size.width + GAP_X;
            }
        });

        return {
            width: Math.max(NODE_WIDTH, childrenTotalWidth),
            height: NODE_HEIGHT + GAP_Y + Math.max(...childSizes.map(s => s.height))
        };
      }
      case 'vertical-up': {
        const childSizes = childIds.map(childId => {
            const childNode = allNodes.find(n => n.id === childId);
            const childDir = childNode?.data?.layoutType || direction;
            return calculateLayout(childId, childDir, allNodes, allEdges, visited);
        });

        const childrenTotalWidth = childSizes.reduce((acc, size) => acc + size.width, 0) + (childIds.length - 1) * GAP_X;
        let startX = -childrenTotalWidth / 2 + NODE_WIDTH / 2;

        childIds.forEach((childId, index) => {
            const childNode = allNodes.find(n => n.id === childId);
            if (childNode) {
                const size = childSizes[index];
                const childCenterX = startX + size.width / 2 - NODE_WIDTH / 2;
                childNode.position = {
                    x: childCenterX,
                    y: -(NODE_HEIGHT + GAP_Y)
                };
                startX += size.width + GAP_X;
            }
        });

        return {
            width: Math.max(NODE_WIDTH, childrenTotalWidth),
            height: NODE_HEIGHT + GAP_Y + Math.max(...childSizes.map(s => s.height))
        };
      }
      case 'vertical-stack': {
         // Simple list
         let currentY = NODE_HEIGHT + GAP_Y;
         childIds.forEach((childId) => {
            const childNode = allNodes.find(n => n.id === childId);
            if (childNode) {
                // Determine child height recursively to stack properly
                const childDir = childNode.data?.layoutType || direction;
                // We restart visited for size calc to ensure we measure them, but we don't want to re-position them yet?
                // Actually single pass is enough if we trust the return value
                // To avoid infinite loops in visited set, we clone it or trust the main flow
                // For stack, we just stack them vertically centered
                childNode.position = {
                    x: 0, 
                    y: currentY
                };
                
                // Recurse to position grandchilden
                const size = calculateLayout(childId, childDir, allNodes, allEdges, visited);
                currentY += size.height + GAP_Y/2; // tighter gap for stack
            }
         });
         return { width: NODE_WIDTH, height: currentY };
      }
      default:
        return { width: NODE_WIDTH, height: NODE_HEIGHT };
    }
  }, []);

  const applyLayout = useCallback((rootNodeId: string, layoutType: LayoutDirection) => {
    setNodes((currentNodes) => {
        const nodesMap = new Map(currentNodes.map(n => [n.id, {...n}])); // Deepish copy
        const root = nodesMap.get(rootNodeId);
        if (!root) return currentNodes;

        // Apply layout flag to root
        root.data = { ...root.data, layoutType };

        // Helper to get nodes array from map for calculation
        const getNodesArray = () => Array.from(nodesMap.values());
        
        // Calculate and apply positions recursively
        calculateLayout(rootNodeId, layoutType, getNodesArray(), edges, new Set());

        // Lock children
        const updateLocks = (nodeId: string, visited = new Set<string>()) => {
             if (visited.has(nodeId)) return;
             visited.add(nodeId);
             
             const childEdges = edges.filter(e => e.source === nodeId);
             childEdges.forEach(e => {
                 const child = nodesMap.get(e.target);
                 if (child) {
                     child.draggable = false; // Lock position
                     // Inherit or keep own layout
                     const dir = child.data.layoutType || layoutType; // This logic is slightly loose, simplified for demo
                     updateLocks(child.id, visited);
                 }
             });
        };
        updateLocks(rootNodeId);

        return Array.from(nodesMap.values());
    });
  }, [edges, calculateLayout, setNodes]);

  const clearLayout = useCallback((nodeId: string) => {
      setNodes(nds => {
          const newNodes = nds.map(n => {
              if (n.id === nodeId) {
                  const { layoutType, ...rest } = n.data;
                  return { ...n, data: rest };
              }
              return n;
          });
          
          // Unlock children recursively if they don't have their own layout
          const subtree = getSubtree(nodeId, newNodes, edges);
          return newNodes.map(n => {
              if (subtree.includes(n.id) || n.id === nodeId) {
                  // Check if any parent still enforces layout? 
                  // For simplicity, we just unlock immediate subtree if we clear layout
                  // A full check would be expensive. 
                  return { ...n, draggable: true };
              }
              return n;
          });
      });
  }, [edges, getSubtree, setNodes]);


  // --- Event Handlers ---

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)),
    [setEdges]
  );

  const handleSave = useCallback(() => {
    onSave(file.id, nodes, edges);
  }, [file.id, nodes, edges, onSave]);

  const addNode = useCallback((position?: {x: number, y: number}) => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'mindMap',
      position: position || { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100
      },
      data: { label: 'New Concept', note: '' },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      const currentNodes = getNodes();
      const selectedNodes = currentNodes.filter(n => n.selected);

      if (selectedNodes.length === 1) {
        event.preventDefault();
        const parent = selectedNodes[0];
        const parentLayout = parent.data.layoutType;
        
        const newId = `node_${Date.now()}`;
        
        // Determine position based on layout
        let position = { x: parent.position.x + 200, y: parent.position.y };
        if (parentLayout === 'vertical-down') position = { x: parent.position.x, y: parent.position.y + 100 };
        // ... simple heuristics for initial placement, actual layout calc handles it later

        const childNode: Node = {
          id: newId,
          type: 'mindMap',
          position,
          data: { label: 'New Node', note: '' },
          selected: true,
          draggable: !parentLayout // Lock if parent has layout
        };

        const newEdge: Edge = {
          id: `e${parent.id}-${newId}`,
          source: parent.id,
          target: newId,
          type: 'smoothstep',
          animated: true
        };

        setNodes((nds) => [...nds.map(n => ({...n, selected: false})), childNode]);
        setEdges((eds) => {
            const newEdges = addEdge(newEdge, eds);
            // If parent has layout, re-apply it after a short delay or immediately?
            // Immediate might miss the new node in state. 
            // We'll rely on effect or manual trigger.
            // For now, let's just add it. The user can drag parent to re-layout or we trigger it.
            if (parentLayout) {
                 setTimeout(() => applyLayout(parent.id, parentLayout), 10);
            }
            return newEdges;
        });
      }
    }
  }, [getNodes, setNodes, setEdges, applyLayout]);

  const onNodeClickInternal = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        onNodeClick(event, node);
    }
  }, [onNodeClick]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
          x: event.clientX,
          y: event.clientY,
          nodeId: node.id
      });
  }, []);

  const onNodeDrag: NodeDragHandler = useCallback((event, node) => {
      // If node has a layout, we must move its children with it relatively
      // Actually ReactFlow handles subgraph movement if using parent/child feature (extent), 
      // but here we are using flat nodes with computed positions.
      // If we move a parent, we want to re-run layout or just shift children?
      // Re-running layout is safest to keep structure.
      if (node.data.layoutType) {
          applyLayout(node.id, node.data.layoutType);
      }
  }, [applyLayout]);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
      // Close context menu
      setContextMenu(null);

      // Double click detection
      const currentTime = Date.now();
      if (currentTime - lastPaneClickTimeRef.current < 300) {
          // Double click detected
          const position = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
          });
          addNode(position);
      }
      lastPaneClickTimeRef.current = currentTime;
  }, [screenToFlowPosition, addNode]);

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
        onNodeContextMenu={onNodeContextMenu}
        onNodeDrag={onNodeDrag}
        onPaneClick={onPaneClick}
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
            onClick={() => addNode()}
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

      {/* Context Menu */}
      {contextMenu && (
          <div 
            className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-48 z-50 overflow-hidden"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
             <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 bg-slate-50">
                Layout Options
             </div>
             <button onClick={() => { applyLayout(contextMenu.nodeId, 'horizontal-right'); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 text-sm flex items-center gap-2">
                <ArrowRight size={14} /> Horizontal Right
             </button>
             <button onClick={() => { applyLayout(contextMenu.nodeId, 'horizontal-left'); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 text-sm flex items-center gap-2">
                <ArrowLeft size={14} /> Horizontal Left
             </button>
             <button onClick={() => { applyLayout(contextMenu.nodeId, 'vertical-down'); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 text-sm flex items-center gap-2">
                <ArrowDown size={14} /> Vertical Down
             </button>
             <button onClick={() => { applyLayout(contextMenu.nodeId, 'vertical-up'); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 text-sm flex items-center gap-2">
                <ArrowUp size={14} /> Vertical Up
             </button>
             <button onClick={() => { applyLayout(contextMenu.nodeId, 'vertical-stack'); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 text-sm flex items-center gap-2">
                <List size={14} /> Linear List
             </button>
             <div className="h-px bg-slate-100 my-1" />
             <button onClick={() => { clearLayout(contextMenu.nodeId); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2">
                <Layout size={14} /> Clear Layout
             </button>
          </div>
      )}

      {/* Floating hints */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-500 pointer-events-none z-10">
        <p className="flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Tab</span> on Node to Create Child</p>
        <p className="mt-1 flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Double Click Canvas</span> to Create Node</p>
        <p className="mt-1 flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Double Click Node</span> to Edit Label</p>
        <p className="mt-1 flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Ctrl + Click</span> to Edit Notes</p>
        <p className="mt-1 flex items-center gap-2"><span className="font-bold bg-slate-100 px-1 rounded">Right Click</span> for Layouts</p>
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