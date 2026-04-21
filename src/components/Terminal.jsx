import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TerminalComponent = ({ onInput, terminalRef }) => {
  const xtermRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(new FitAddon());

  const inputHandlerRef = useRef(onInput);
  
  useEffect(() => {
    inputHandlerRef.current = onInput;
  }, [onInput]);

  useEffect(() => {
    terminalInstance.current = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#10b981', // Success color
        cursor: '#38bdf8',
      },
      fontSize: 14,
      fontFamily: "'Fira Code', monospace",
      convertEol: true,
    });

    terminalInstance.current.loadAddon(fitAddon.current);
    terminalInstance.current.open(xtermRef.current);
    fitAddon.current.fit();

    terminalInstance.current.onData((data) => {
      if (inputHandlerRef.current) {
        inputHandlerRef.current(data);
      }
    });

    if (terminalRef) {
      terminalRef.current = terminalInstance.current;
    }

    const handleResize = () => {
      fitAddon.current.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminalInstance.current.dispose();
    };
  }, [terminalRef]);

  return (
    <div 
      ref={xtermRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        padding: '10px',
        backgroundColor: '#000'
      }} 
    />
  );
};

export default TerminalComponent;
