import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, FileText, Zap, Shield } from "lucide-react"
import Link from "next/link"

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Document Q&A Agent
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Get instant answers from your documents using AI. Upload your files and ask questions in natural language.
          </p>
          <Link href="/chat">
            <Button size="lg" className="text-lg px-8 py-6">
              Try It Now
              <MessageSquare className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Document Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload PDFs, Word docs, and text files. Our AI analyzes and understands your content.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Natural Language</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ask questions in plain English and get accurate answers based on your documents.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Instant Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get immediate answers with relevant citations and references from your documents.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your documents are processed securely and never stored permanently on our servers.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold">Upload Documents</h3>
              <p className="text-muted-foreground">Upload your PDF, Word, or text documents to our secure platform.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold">Ask Questions</h3>
              <p className="text-muted-foreground">
                Type your questions in natural language about the content in your documents.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold">Get Answers</h3>
              <p className="text-muted-foreground">
                Receive accurate, contextual answers with references to specific parts of your documents.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
              <CardDescription className="text-lg">
                Transform how you interact with your documents today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/chat">
                <Button size="lg" className="w-full md:w-auto">
                  Start Asking Questions
                  <MessageSquare className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
