import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  imageContext?: string;
}

export const ChatInterface = ({ imageContext }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Initialize with image context if available
    if (imageContext) {
      return [{
        role: "assistant",
        content: `Based on the image analysis, here's what I found: ${imageContext}`
      }];
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 3000}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          imageContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Ask Questions</h3>
          </div>

          {/* Messages */}
          <div className="space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center space-y-2">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Ask me questions about your skin condition or general skin care
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                      }`}
                  >
                    {message.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-foreground/90 mt-4 mb-2 text-center" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-base font-semibold text-foreground/80 mt-3 mb-2" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-1 my-2" {...props} />,
                            li: ({ node, ...props }) => <li className="text-foreground/90" {...props} />,
                            p: ({ node, ...props }) => <p className="leading-relaxed mb-2 last:mb-0" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-secondary" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about skin care or your condition..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
