import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { cn } from '../lib/utils';

interface ComponentPreviewProps {
  title?: string;
  code: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
}

export function ComponentPreview({ title, code, children, className, description }: ComponentPreviewProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group relative my-4 flex flex-col space-y-2", className)}>

      {/* Header / Tabs */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex flex-col">
          {title && <h3 className="font-semibold text-foreground">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex items-center rounded-md bg-muted p-1 text-muted-foreground">
          <button
            onClick={() => setTab('preview')}
            className={cn(
              "rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              tab === 'preview' ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setTab('code')}
            className={cn(
              "rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              tab === 'code' ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            Code
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative rounded-lg border bg-background">
        {tab === 'preview' ? (
          <div className="preview flex min-h-[350px] w-full justify-center p-10 items-center">
            {children}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute right-4 top-4 z-10">
              <button
                onClick={handleCopy}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="max-h-[600px] overflow-auto rounded-lg">
              <SyntaxHighlighter
                language="typescript"
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}
                wrapLines={true}
                showLineNumbers={true}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
