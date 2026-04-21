import Editor from "@monaco-editor/react";

function CodeEditor({ code, setCode, language }) {
  const handleChange = (val) => {
    setCode(val);
  };

  return (
    <div className="editor-container">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={handleChange}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export default CodeEditor;