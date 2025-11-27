import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FileText, Network, ArrowRight, ArrowLeft, ArrowDown, ArrowUp, List } from './ui/Icons';
import { LayoutDirection } from '../types';

// Custom Node Component
const MindMapNode = ({ data, id, isConnectable }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if props change externally
  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const hasNote = data.note && data.note.trim().length > 0 && data.note !== '<br>';
  const layoutType = data.layoutType as LayoutDirection | undefined;

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent canvas events
    setIsEditing(true);
  }, []);

  const onSave = useCallback(() => {
    setIsEditing(false);
    if (label !== data.label) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, label } };
          }
          return node;
        })
      );
    }
  }, [label, data.label, id, setNodes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave();
    }
  }, [onSave]);

  const getLayoutIcon = () => {
    switch(layoutType) {
      case 'horizontal-right': return <ArrowRight size={12} />;
      case 'horizontal-left': return <ArrowLeft size={12} />;
      case 'vertical-down': return <Network size={12} className="rotate-180" />; // Or ArrowDown
      case 'vertical-up': return <ArrowUp size={12} />;
      case 'vertical-stack': return <List size={12} />;
      default: return null;
    }
  };

  return (
    <div className="group relative">
      {/* Node Content */}
      <div 
        className={`
          px-4 py-3 rounded-lg shadow-sm border bg-white
          transition-all duration-200 
          ${hasNote ? 'border-l-4 border-l-blue-500' : 'border-slate-200'}
          ${layoutType ? 'ring-1 ring-blue-200' : ''}
          hover:shadow-md hover:border-blue-300 min-w-[150px]
        `}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center justify-between gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={onSave}
                onKeyDown={handleKeyDown}
                className="w-full text-slate-800 font-medium text-sm outline-none border-b border-blue-500 bg-transparent p-0 m-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-slate-800 font-medium text-sm outline-none break-words max-w-[200px] select-none">
                {data.label || "New Node"}
              </span>
            )}
            
            <div className="flex items-center gap-1">
                {layoutType && (
                    <div className="text-slate-400 bg-slate-50 p-0.5 rounded border border-slate-100" title={`Layout: ${layoutType}`}>
                        {getLayoutIcon()}
                    </div>
                )}
                {hasNote && (
                <FileText size={14} className="text-blue-500 shrink-0" />
                )}
            </div>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-slate-300 !border-2 !border-white group-hover:!bg-blue-400 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-slate-300 !border-2 !border-white group-hover:!bg-blue-400 transition-colors"
      />
    </div>
  );
};

export default memo(MindMapNode);