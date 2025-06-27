// /frontend/pages/chat.tsx (or wherever your component is located)
"use client"

import { useState, FormEvent, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// ThemeToggle import removed as it's a non-essential custom component that may not exist in your project.
// import { ThemeToggle } from "@/components/theme-toggle"
import { Send, ArrowLeft, Bot, User } from "lucide-react"
// The 'next/link' import has been removed to resolve a build error.
// In a full Next.js project, you would use: import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"

// Define the structure of a chat message
interface Message {
  id: string
  role: "user" | "bot"
  content: string
}

export default function ChatPage() {
  // State for the list of messages, the user's input, and loading status
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // A ref to automatically scroll to the bottom of the chat
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Effect to scroll down when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages])

  // Get the backend API URL from environment variables.
  // In production (on Render), this will be the full URL of your backend service.
  // For local development, this defaults to the Flask server URL.
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

  // Handle form submission when the user sends a message
  const handleSubmit = async (e: FormEvent) => {
    // Prevent the form from reloading the page
    e.preventDefault()
    if (!input.trim()) return // Don't send empty messages

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    // Add the user's message to the chat and clear the input field
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true) // Show the "thinking..." indicator

    // --- API CALL HAPPENS HERE ---
    // This block sends the user's question to your Python backend.
    try {
      // Use the standard browser 'fetch' API to make a POST request.
      // The URL points to the '/ask' endpoint on your Flask server.
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Tell the server we're sending JSON
        },
        // Convert the user's question into a JSON string in the expected format
        body: JSON.stringify({ question: input }),
      })

      // If the server responds with an error (e.g., 400 or 500), handle it
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "An unknown server error occurred.")
      }

      // If the request was successful, parse the JSON response
      const data = await response.json()

      // Create a new message object for the bot's answer
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: data.answer, // The answer is in the 'answer' field from your Flask app
      }
      // Add the bot's message to the chat
      setMessages((prev) => [...prev, botMessage])

    } catch (error) {
      // If the fetch call itself fails (e.g., network error) or the server returned an error
      console.error("Error communicating with backend:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: `Sorry, something went wrong. ${error instanceof Error ? error.message : "Please check the server connection."}`,
      }
      // Display an error message in the chat interface
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      // Whatever happens, stop the loading indicator
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* The Next.js Link component was replaced with a standard <a> tag to fix a build error. */}
            {/* In your actual Next.js project, you should use the <Link> component for SPA navigation. */}
            <a href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </a>
            <h1 className="text-2xl font-bold">Document Q&A Chat</h1>
          </div>
          {/* <ThemeToggle /> -- Removed to resolve potential import error */}
        </div>

        {/* Chat Interface */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Ask Questions About Your Documents
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="space-y-4">
                    <Bot className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Ready to help!</h3>
                      <p className="text-muted-foreground">
                        Ask me any question based on the provided documents.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
