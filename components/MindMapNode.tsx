import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FileText } from './ui/Icons';

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

  return (
    <div className="group relative">
      {/* Node Content */}
      <div 
        className={`
          px-4 py-3 rounded-lg shadow-sm border bg-white
          transition-all duration-200 
          ${hasNote ? 'border-l-4 border-l-blue-500' : 'border-slate-200'}
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
            
            {hasNote && (
              <FileText size={14} className="text-blue-500 shrink-0" />
            )}
        </div>
        
        {/* Tooltip removed */}
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