import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, Heading1, Heading2 } from './ui/Icons';

interface RichTextEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent, onChange, placeholder = "Type your notes here..." }) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize content
  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== initialContent) {
      contentEditableRef.current.innerHTML = initialContent || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const handleInput = () => {
    if (contentEditableRef.current) {
      onChange(contentEditableRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
  };

  const ToolbarButton = ({ icon: Icon, command, value, active = false }: any) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        execCommand(command, value);
      }}
      className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${active ? 'bg-slate-200 text-blue-600' : 'text-slate-600'}`}
      title={command}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className={`flex flex-col h-full border rounded-lg overflow-hidden transition-all duration-200 ${isFocused ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <ToolbarButton icon={Bold} command="bold" />
        <ToolbarButton icon={Italic} command="italic" />
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <ToolbarButton icon={Heading1} command="formatBlock" value="H1" />
        <ToolbarButton icon={Heading2} command="formatBlock" value="H2" />
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <ToolbarButton icon={List} command="insertUnorderedList" />
      </div>
      
      <div
        ref={contentEditableRef}
        className="flex-1 p-4 overflow-y-auto outline-none prose prose-sm max-w-none rich-text-editor"
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        style={{ minHeight: '150px' }}
      />
    </div>
  );
};

export default RichTextEditor;