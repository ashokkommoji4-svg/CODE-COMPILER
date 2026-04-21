import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Terminal as TerminalIcon, Code2, AlertCircle, CheckCircle2,
  Loader2, Keyboard, Search, ChevronDown, StopCircle
} from 'lucide-react';
import TerminalComponent from './components/Terminal';

const WS_BASE_URL = (import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL.replace(/\/$/, '').replace('http', 'ws')) + '/ws/compiler/execute/';

const LANGUAGE_CONFIGS = {
  python: {
    name: 'Python',
    monaco: 'python',
    defaultCode: 'name = input("Enter your name: ")\nprint(f"Hello, {name}!")\n\n# Try a loop\nfor i in range(3):\n    val = input(f"Enter value {i+1}: ")\n    print(f"You entered: {val}")',
  },
  javascript: {
    name: 'JavaScript',
    monaco: 'javascript',
    defaultCode: 'const readline = require("readline").createInterface({\n  input: process.stdin,\n  output: process.stdout\n});\n\nreadline.question("What is your name? ", name => {\n  console.log(`Hello, ${name}!`);\n  readline.close();\n});',
  },
  cpp: {
    name: 'C++',
    monaco: 'cpp',
    defaultCode: '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    std::cout << "Enter your name: ";\n    std::getline(std::cin, name);\n    std::cout << "Hello, " << name << "!" << std::endl;\n    return 0;\n}',
  },
  c: {
    name: 'C',
    monaco: 'c',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    char name[100];\n    printf("Enter your name: ");\n    scanf("%s", name);\n    printf("Hello, %s!\\n", name);\n    return 0;\n}',
  },
  java: {
    name: 'Java',
    monaco: 'java',
    defaultCode: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        String name = scanner.nextLine();\n        System.out.println("Hello, " + name + "!");\n    }\n}',
  },
  r: {
    name: 'R',
    monaco: 'r',
    defaultCode: 'print("Hello, R!")',
  },
  typescript: {
    name: 'TypeScript',
    monaco: 'typescript',
    defaultCode: 'const greeting: string = "Hello, TypeScript!";\nconsole.log(greeting);',
  },
  go: {
    name: 'Go',
    monaco: 'go',
    defaultCode: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Go!")\n}',
  },
  sqlite: {
    name: 'SQLite',
    monaco: 'sql',
    defaultCode: '-- SQLite\nCREATE TABLE test (id INTEGER PRIMARY KEY, val TEXT);\nINSERT INTO test (val) VALUES ("Hello, SQLite!");\nSELECT * FROM test;',
  },
  apex: {
    name: 'Apex',
    monaco: 'java',
    defaultCode: 'public class HelloWorld {\n    public static void greet() {\n        System.debug("Hello, Apex!");\n    }\n}\nHelloWorld.greet();',
  },
};

function App() {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGE_CONFIGS.python.defaultCode);
  const [status, setStatus] = useState('idle'); // idle, running, success, error (now used for UI feedback)
  const [loading, setLoading] = useState(false);

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  
  // Terminal and WebSocket Refs
  const terminalRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const config = LANGUAGE_CONFIGS[language];
    setCode(config.defaultCode);
    if (terminalRef.current) {
      terminalRef.current.clear();
      terminalRef.current.writeln(`\x1b[34m--- Switched to ${config.name} ---\x1b[0m`);
    }
    setStatus('idle');
  }, [language]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runCode = () => {
    if (loading) return;

    setLoading(true);
    setStatus('running');
    
    if (terminalRef.current) {
      terminalRef.current.clear();
      terminalRef.current.writeln('\x1b[33mExecuting code...\x1b[0m');
    }

    // Initialize WebSocket
    socketRef.current = new WebSocket(WS_BASE_URL);

    socketRef.current.onopen = () => {
      socketRef.current.send(JSON.stringify({
        action: 'run',
        language,
        code
      }));
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'output') {
        terminalRef.current.write(data.data);
      } else if (data.type === 'exit') {
        setLoading(false);
        setStatus(data.data === 0 ? 'success' : 'error');
        terminalRef.current.writeln(`\r\n\x1b[33m--- Process finished with exit code ${data.data} ---\x1b[0m`);
        socketRef.current.close();
      } else if (data.type === 'error') {
        terminalRef.current.writeln(`\r\n\x1b[31mError: ${data.data}\x1b[0m`);
        setLoading(false);
        setStatus('error');
      }
    };

    socketRef.current.onerror = () => {
      terminalRef.current.writeln('\r\n\x1b[31mWebSocket Error: Could not connect to backend.\x1b[0m');
      setLoading(false);
      setStatus('error');
    };

    socketRef.current.onclose = () => {
      setLoading(false);
    };
  };

  const stopCode = () => {
    if (socketRef.current) {
      socketRef.current.close();
      setLoading(false);
      setStatus('idle');
      if (terminalRef.current) {
        terminalRef.current.writeln('\r\n\x1b[31mExecution stopped by user.\x1b[0m');
      }
    }
  };

  const handleTerminalInput = React.useCallback((data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'input',
        data: data
      }));
    }
  }, []);

  const filteredLanguages = Object.entries(LANGUAGE_CONFIGS).filter(([_, config]) =>
    config.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <header className="main-header">
        <div className="title-group">
          <h1 className="title">Online Code Editor</h1>
          {status !== 'idle' && (
            <div className={`status-badge ${status}`}>
              {status === 'running' && <Loader2 size={14} className="animate-spin" />}
              {status === 'success' && <CheckCircle2 size={14} />}
              {status === 'error' && <AlertCircle size={14} />}
              <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </div>
          )}
        </div>
        <div className="controls">
          <div className="select-wrapper" ref={dropdownRef}>
            <button
              className="select-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={loading}
            >
              <span>{LANGUAGE_CONFIGS[language].name}</span>
              <ChevronDown size={14} />
            </button>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                <div className="search-input-wrapper">
                  <Search size={14} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="options-list">
                  {filteredLanguages.map(([key, config]) => (
                    <div
                      key={key}
                      className={`option-item ${language === key ? 'selected' : ''}`}
                      onClick={() => {
                        setLanguage(key);
                        setIsDropdownOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      {config.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {loading ? (
            <button className="run-btn stop" onClick={stopCode}>
              <StopCircle size={16} />
              Stop
            </button>
          ) : (
            <button className="run-btn" onClick={runCode}>
              <Play size={16} />
              Run Code
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <section className="editor-pane">
          <div className="pane-header">Code Editor</div>
          <div className="monaco-wrapper">
            <Editor
              height="100%"
              language={LANGUAGE_CONFIGS[language].monaco}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value)}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 }
              }}
            />
          </div>
        </section>

        <section className="output-pane">
          <div className="pane-header">Output</div>
          <div className="terminal-wrapper">
             <TerminalComponent 
                onInput={handleTerminalInput} 
                terminalRef={terminalRef} 
             />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
