// /frontend/pages/chat.tsx (or a similar path)
"use client"

import { useState, FormEvent, useRef, useEffect, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, ArrowLeft, Bot, User, Upload, FileText, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Define the structure of a chat message
interface Message {
  id: string
  role: "user" | "bot"
  content: string
}

// Define the structure for upload/remove status
interface ActionStatus {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [actionStatus, setActionStatus] = useState<ActionStatus>({ status: 'idle', message: '' })
  const [isUploadComplete, setIsUploadComplete] = useState(false) // New state to track upload completion
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // This useEffect hook handles the automatic scrolling of the chat area.
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messages])

  // Set the backend API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

  // Handles the selection of a new file from the user's computer.
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
      setActionStatus({ status: 'idle', message: '' }) // Reset status on new file
      setIsUploadComplete(false) // Reset upload status for the new file
    } else {
      setSelectedFile(null)
      alert("Please select a valid PDF file.")
    }
  }

  // Handles the API call to remove a file from the backend.
  const handleRemoveFile = async () => {
    if (!selectedFile) return;

    const filename = selectedFile.name;
    setActionStatus({ status: 'loading', message: `Removing file: ${filename}...` })

    try {
        const response = await fetch(`${API_URL}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove file.');
        }

        const successData = await response.json();
        setActionStatus({ status: 'success', message: successData.message });
        addBotMessage(`The document **${filename}** has been removed. I will no longer use it for answers.`);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setActionStatus({ status: 'error', message: errorMessage });
    } finally {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handles the API call to upload a file to the backend.
  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    setActionStatus({ status: 'loading', message: `Uploading and processing ${selectedFile.name}...` })

    try {
      const response = await fetch(`${API_URL}/upload`, { method: "POST", body: formData })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "File upload failed.")
      }

      const successData = await response.json()
      setActionStatus({ status: 'success', message: successData.message })
      addBotMessage(`I've successfully processed **${selectedFile.name}**. You can now ask me questions about it.`);
      setIsUploadComplete(true) // Mark the upload as complete
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred."
      setActionStatus({ status: 'error', message: errorMessage })
    }
  }

  // A helper function to add a message from the bot to the chat history.
  const addBotMessage = (content: string) => {
    const botMessage: Message = { id: Date.now().toString(), role: "bot", content };
    setMessages((prev) => [...prev, botMessage]);
  }

  // Handles the form submission when a user asks a question.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      })

      if (!response.ok) throw new Error((await response.json()).error || "The server returned an error.")

      const data = await response.json()
      addBotMessage(data.answer)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not connect to the server."
      addBotMessage(`Sorry, an error occurred: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </a>
            <h1 className="text-2xl font-bold">Interactive Document Q&A</h1>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload a Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose PDF File
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="application/pdf"
              />

              {selectedFile && (
                <>
                  <div className="flex flex-1 items-center gap-2 text-sm bg-muted p-2 rounded-md">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate flex-1">
                      {selectedFile.name}
                    </span>
                    {/* --- CHANGE START --- */}
                    {/* Only show the remove button if the upload is NOT complete */}
                    {!isUploadComplete && (
                      <Button
                        onClick={handleRemoveFile}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {/* --- CHANGE END --- */}
                  </div>
                  {/* --- CHANGE START --- */}
                  {/* Only show the upload button if the upload is NOT complete */}
                  {!isUploadComplete && (
                    <Button
                      onClick={handleFileUpload}
                      disabled={actionStatus.status === "loading"}
                      className="w-full sm:w-auto"
                    >
                      {actionStatus.status === "loading"
                        ? "Processing..."
                        : "Upload & Process"}
                    </Button>
                  )}
                  {/* --- CHANGE END --- */}
                </>
              )}
            </div>

            {actionStatus.status !== "idle" && (
              <div className="mt-4 flex items-center text-sm">
                {actionStatus.status === "loading" && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                )}
                {actionStatus.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                )}
                {actionStatus.status === "error" && (
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                )}
                <p
                  className={`${
                    actionStatus.status === "error"
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {actionStatus.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* The main chat container */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Ask Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto">
            <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="space-y-4">
                    <Bot className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Ready to Help
                      </h3>
                      <p className="text-muted-foreground">
                        Upload a document to get started.
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
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
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
                          <p
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: message.content.replace(
                                /\*\*(.*?)\*\*/g,
                                "<strong>$1</strong>"
                              ),
                            }}
                          ></p>
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
                          <div
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                            style={{ animationDelay: "0s" }}
                          ></div>
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
          <CardFooter className="border-t" style={{ paddingTop: "24px" }}>
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
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
  );
}
