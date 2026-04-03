import React, { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { sql } from '@codemirror/lang-sql'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { java } from '@codemirror/lang-java'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { oneDark } from '@codemirror/theme-one-dark'
import { Copy, CheckCircle, Terminal, Smartphone } from 'lucide-react'
import { Button } from './button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { cn } from '../../lib/utils'

interface CodeHighlightProps {
  code: string
  language?: string
  showCopyButton?: boolean
  className?: string
  id?: string
}

interface DualCodeHighlightProps {
  nodeCode: string
  flutterCode: string
  nodeLanguage?: string
  flutterLanguage?: string
  showCopyButton?: boolean
  className?: string
  id?: string
}

const getLanguageExtension = (language: string) => {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return [javascript({ jsx: true, typescript: true })]
    case 'dart':
    case 'flutter':
      // For Dart/Flutter, we'll use Rust highlighting which is similar
      return [rust()]
    case 'json':
      return [json()]
    case 'css':
      return [css()]
    case 'html':
      return [html()]
    case 'sql':
      return [sql()]
    case 'python':
    case 'py':
      return [python()]
    case 'rust':
    case 'rs':
      return [rust()]
    case 'java':
      return [java()]
    case 'bash':
    case 'shell':
    case 'sh':
      return [StreamLanguage.define(shell)]
    case 'yaml':
    case 'yml':
      return [StreamLanguage.define(yaml)]
    default:
      return []
  }
}

const customTheme = oneDark

export function CodeHighlight({ 
  code, 
  language = 'javascript', 
  showCopyButton = true, 
  className,
  id 
}: CodeHighlightProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (text: string, codeId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCode(codeId)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const extensions = getLanguageExtension(language)

  return (
    <div className={cn("relative group", className)}>
      {showCopyButton && (
        <div className="absolute top-3 right-3 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(code, id || 'code')}
            className="h-8 w-8 p-0 bg-gray-800/80 hover:bg-gray-700/80 text-emerald-400 hover:text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copiedCode === (id || 'code') ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}
      
      <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
        <CodeMirror
          value={code}
          theme={customTheme}
          extensions={extensions}
          editable={false}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            searchKeymap: false,
          }}
          className="text-sm"
        />
      </div>
    </div>
  )
}

// Dual code block component with tabs for Node.js and Flutter
export function DualCodeHighlight({
  nodeCode,
  flutterCode,
  nodeLanguage = 'javascript',
  flutterLanguage = 'dart',
  showCopyButton = true,
  className,
  id
}: DualCodeHighlightProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'nodejs' | 'flutter'>('nodejs')

  return (
    <div className={cn("relative", className)}>
      <Tabs value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="nodejs" className="flex items-center gap-2 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <Terminal className="w-4 h-4" />
            Node.js
          </TabsTrigger>
          <TabsTrigger value="flutter" className="flex items-center gap-2 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
            <Smartphone className="w-4 h-4" />
            Flutter
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="nodejs" className="mt-4">
          <CodeHighlight 
            code={nodeCode} 
            language={nodeLanguage} 
            showCopyButton={showCopyButton}
            id={`${id}-nodejs`}
          />
        </TabsContent>
        
        <TabsContent value="flutter" className="mt-4">
          <CodeHighlight 
            code={flutterCode} 
            language={flutterLanguage} 
            showCopyButton={showCopyButton}
            id={`${id}-flutter`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Simple code block component for inline usage
export function CodeBlock({ 
  children, 
  language, 
  className,
  id 
}: { 
  children: string
  language?: string
  className?: string
  id?: string
}) {
  return (
    <CodeHighlight 
      code={children.trim()} 
      language={language} 
      className={className}
      id={id}
    />
  )
}