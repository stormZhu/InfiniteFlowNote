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
  const { project, screenToFlowPosition, getNodes } = useReactFlow();
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

  // --- Layout Engine (Recursive Box Model) ---
  
  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 50;
  const GAP_X = 50;
  const GAP_Y = 20;

  // Helper to build the tree structure for a layout group
  // Returns a tree node with dimensions and children
  interface LayoutNode {
    id: string;
    width: number;
    height: number;
    children: LayoutNode[];
    node: Node;
  }

  const buildLayoutTree = useCallback((nodeId: string, layoutType: LayoutDirection, allNodes: Node[], allEdges: Edge[], visited: Set<string>): LayoutNode | null => {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);

    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return null;

    // Find children connected by outgoing edges
    const childEdges = allEdges.filter(e => e.source === nodeId);
    const childIds = childEdges.map(e => e.target);

    const children: LayoutNode[] = [];
    for (const childId of childIds) {
        const childNode = allNodes.find(n => n.id === childId);
        // CRITICAL RULE: If a child has its own layoutType, it breaks the chain. 
        // We do not position it (it is independent), so we skip it in the tree build.
        if (childNode && !childNode.data.layoutType) {
            const childTree = buildLayoutTree(childId, layoutType, allNodes, allEdges, visited);
            if (childTree) children.push(childTree);
        }
    }

    // Calculate dimensions based on children
    let width = NODE_WIDTH;
    let height = NODE_HEIGHT;

    if (children.length > 0) {
        if (layoutType === 'horizontal-right' || layoutType === 'horizontal-left') {
             // Stack children vertically
             const childrenHeight = children.reduce((acc, c) => acc + c.height, 0) + (children.length - 1) * GAP_Y;
             const childrenWidth = Math.max(...children.map(c => c.width));
             height = Math.max(NODE_HEIGHT, childrenHeight);
             width = NODE_WIDTH + GAP_X + childrenWidth;
        } else if (layoutType === 'vertical-down' || layoutType === 'vertical-up') {
             // Stack children horizontally
             const childrenWidth = children.reduce((acc, c) => acc + c.width, 0) + (children.length - 1) * GAP_X;
             const childrenHeight = Math.max(...children.map(c => c.height));
             width = Math.max(NODE_WIDTH, childrenWidth);
             height = NODE_HEIGHT + GAP_Y + childrenHeight;
        } else if (layoutType === 'vertical-stack') {
             // Simple list stack
             const childrenHeight = children.reduce((acc, c) => acc + c.height, 0) + (children.length - 1) * (GAP_Y / 2);
             height = NODE_HEIGHT + (GAP_Y/2) + childrenHeight;
        }
    }

    return { id: nodeId, width, height, children, node };
  }, []);

  // Recursive function to apply absolute positions based on calculated dimensions
  const applyPositions = useCallback((
      treeNode: LayoutNode, 
      x: number, 
      y: number, 
      layoutType: LayoutDirection, 
      result: Map<string, {x: number, y: number}>
  ) => {
      // Store the calculated position for this node
      result.set(treeNode.id, { x, y });

      if (treeNode.children.length === 0) return;

      if (layoutType === 'horizontal-right') {
          const childrenTotalHeight = treeNode.children.reduce((acc, c) => acc + c.height, 0) + (treeNode.children.length - 1) * GAP_Y;
          let currentY = y - childrenTotalHeight / 2 + treeNode.children[0].height / 2; // Center based on first child center? No, center block
          
          // Better centering: Start at Y - half total height + half node height?
          // We want the children block to be centered vertically relative to the parent center.
          // Parent center Y is y + NODE_HEIGHT/2.
          const parentCenterY = y + NODE_HEIGHT / 2;
          let startY = parentCenterY - childrenTotalHeight / 2;

          treeNode.children.forEach(child => {
              // The child's Y position should be such that its "center" aligns with currentY
              // But our recursive logic treats x,y as top-left of the bounding box of the child tree?
              // No, let's treat x,y as top-left of the Node itself.
              
              // We place the child NODE at (parentX + offset, currentY_centered).
              // We need to account that the child node itself might be small, but its subtree is huge.
              // The `child.height` is the subtree height. 
              // We want to align the vertical center of the child's subtree with the vertical center of the slot.
              
              const childSubtreeCenterY = startY + child.height / 2;
              const childNodeY = childSubtreeCenterY - NODE_HEIGHT / 2;
              
              applyPositions(child, x + NODE_WIDTH + GAP_X, childNodeY, layoutType, result);
              startY += child.height + GAP_Y;
          });
      } 
      else if (layoutType === 'horizontal-left') {
          const childrenTotalHeight = treeNode.children.reduce((acc, c) => acc + c.height, 0) + (treeNode.children.length - 1) * GAP_Y;
          const parentCenterY = y + NODE_HEIGHT / 2;
          let startY = parentCenterY - childrenTotalHeight / 2;

          treeNode.children.forEach(child => {
              const childSubtreeCenterY = startY + child.height / 2;
              const childNodeY = childSubtreeCenterY - NODE_HEIGHT / 2;
              
              applyPositions(child, x - (NODE_WIDTH + GAP_X), childNodeY, layoutType, result);
              startY += child.height + GAP_Y;
          });
      }
      else if (layoutType === 'vertical-down') {
          const childrenTotalWidth = treeNode.children.reduce((acc, c) => acc + c.width, 0) + (treeNode.children.length - 1) * GAP_X;
          const parentCenterX = x + NODE_WIDTH / 2;
          let startX = parentCenterX - childrenTotalWidth / 2;

          treeNode.children.forEach(child => {
              const childSubtreeCenterX = startX + child.width / 2;
              const childNodeX = childSubtreeCenterX - NODE_WIDTH / 2;
              
              applyPositions(child, childNodeX, y + NODE_HEIGHT + GAP_Y, layoutType, result);
              startX += child.width + GAP_X;
          });
      }
      else if (layoutType === 'vertical-up') {
          const childrenTotalWidth = treeNode.children.reduce((acc, c) => acc + c.width, 0) + (treeNode.children.length - 1) * GAP_X;
          const parentCenterX = x + NODE_WIDTH / 2;
          let startX = parentCenterX - childrenTotalWidth / 2;

          treeNode.children.forEach(child => {
              const childSubtreeCenterX = startX + child.width / 2;
              const childNodeX = childSubtreeCenterX - NODE_WIDTH / 2;
              
              applyPositions(child, childNodeX, y - (NODE_HEIGHT + GAP_Y), layoutType, result);
              startX += child.width + GAP_X;
          });
      }
      else if (layoutType === 'vertical-stack') {
          let currentY = y + NODE_HEIGHT + GAP_Y / 2;
          treeNode.children.forEach(child => {
              applyPositions(child, x, currentY, layoutType, result);
              currentY += child.height + GAP_Y / 2;
          });
      }
  }, []);

  const runLayout = useCallback((rootNode: Node, allNodes: Node[], allEdges: Edge[]): Node[] => {
      const layoutType = rootNode.data.layoutType as LayoutDirection;
      if (!layoutType) return allNodes;

      // 1. Build the tree (Measure phase)
      const treeRoot = buildLayoutTree(rootNode.id, layoutType, allNodes, allEdges, new Set());
      if (!treeRoot) return allNodes;

      // 2. Calculate positions (Position phase)
      const newPositions = new Map<string, {x: number, y: number}>();
      applyPositions(treeRoot, rootNode.position.x, rootNode.position.y, layoutType, newPositions);

      // 3. Update nodes
      return allNodes.map(n => {
          if (newPositions.has(n.id)) {
              const pos = newPositions.get(n.id)!;
              // If it's the root, we keep it draggable. If it's a child, we lock it.
              const isRoot = n.id === rootNode.id;
              return { 
                  ...n, 
                  position: pos,
                  draggable: isRoot, // Only root is draggable
                  className: isRoot ? '' : '!cursor-default', // Visual cue
                  // Ensure style doesn't conflict
                  style: isRoot ? {} : { pointerEvents: 'all' } 
              };
          }
          return n;
      });

  }, [buildLayoutTree, applyPositions]);

  const applyLayout = useCallback((rootNodeId: string, layoutType: LayoutDirection) => {
    setNodes((currentNodes) => {
        const root = currentNodes.find(n => n.id === rootNodeId);
        if (!root) return currentNodes;

        // Update root with new layout type
        const updatedRoot = { ...root, data: { ...root.data, layoutType } };
        const otherNodes = currentNodes.map(n => n.id === rootNodeId ? updatedRoot : n);
        
        // Run layout engine
        return runLayout(updatedRoot, otherNodes, edges);
    });
  }, [edges, runLayout, setNodes]);

  const clearLayout = useCallback((nodeId: string) => {
      setNodes(nds => {
          // 1. Remove layout from target node
          const nodesMap = new Map(nds.map(n => [n.id, {...n}]));
          const target = nodesMap.get(nodeId);
          if (target) {
              const { layoutType, ...rest } = target.data;
              target.data = rest;
              target.draggable = true;
          }

          // 2. Unlock immediate children (that were previously part of this group)
          // We need to identify which children were locked by this layout.
          // A simple BFS/DFS to find connected children that do NOT have their own layout.
          const stack = [nodeId];
          const visited = new Set<string>();
          while(stack.length > 0) {
              const curr = stack.pop()!;
              visited.add(curr);
              const childEdges = edges.filter(e => e.source === curr);
              childEdges.forEach(e => {
                  if (!visited.has(e.target)) {
                      const child = nodesMap.get(e.target);
                      if (child && !child.data.layoutType) { // Only traverse if it doesn't have its own layout
                          child.draggable = true;
                          stack.push(e.target);
                      }
                  }
              });
          }

          return Array.from(nodesMap.values());
      });
  }, [edges, setNodes]);


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
      const currentNodes = getNodes(); // Get latest nodes from ReactFlow instance
      const selectedNodes = currentNodes.filter(n => n.selected);

      if (selectedNodes.length === 1) {
        event.preventDefault();
        const parent = selectedNodes[0];
        
        // Find the effective layout root for the parent to determine where to place child?
        // Or just use parent's active layout.
        const parentLayout = parent.data.layoutType;
        
        const newId = `node_${Date.now()}`;
        
        // Initial position (will be fixed by layout engine immediately if layout is active)
        const position = { x: parent.position.x + 200, y: parent.position.y };

        const childNode: Node = {
          id: newId,
          type: 'mindMap',
          position,
          data: { label: 'New Node', note: '' },
          selected: true,
          draggable: !parentLayout 
        };

        const newEdge: Edge = {
          id: `e${parent.id}-${newId}`,
          source: parent.id,
          target: newId,
          type: 'smoothstep',
          animated: true
        };

        // We need to add the node/edge AND run layout if applicable
        setNodes((nds) => {
            const updatedNodes = [...nds.map(n => ({...n, selected: false})), childNode];
            if (parentLayout) {
                // If parent has layout, run it immediately on the updated set
                // We need to create a temp array because 'edges' state isn't updated yet inside this callback
                // But we can't see the new edge yet.
                // Solution: use useEffect or run layout in the next tick? 
                // Alternatively, pass the new edge to runLayout explicitly.
                // For simplicity, we'll let the onNodeDrag logic or a separate effect handle re-layout, 
                // BUT to prevent jump, we try to run it here.
                // Actually, runLayout needs edges.
                return updatedNodes;
            }
            return updatedNodes;
        });

        setEdges((eds) => {
            const newEdges = addEdge(newEdge, eds);
            // Trigger layout update after state update
            if (parentLayout) {
               // We can't call setNodes inside setEdges safely if they depend on each other.
               // We will use a timeout to trigger re-layout
               setTimeout(() => applyLayout(parent.id, parentLayout as LayoutDirection), 0);
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
      // Rule 1 & 5: Parent moves, children move.
      // If the dragged node has a layout, we must re-calculate the positions of its children relative to its NEW position.
      if (node.data.layoutType) {
          // Use the dragged node's current position (from event/param) as the anchor
          setNodes(currentNodes => {
             // Replace the old node in the list with the dragged node (which has updated position)
             // ReactFlow updates position internally but we need to pass the updated list to runLayout
             const updatedNodes = currentNodes.map(n => n.id === node.id ? node : n);
             return runLayout(node, updatedNodes, edges);
          });
      }
  }, [edges, runLayout, setNodes]);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
      setContextMenu(null);
      const currentTime = Date.now();
      if (currentTime - lastPaneClickTimeRef.current < 300) {
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