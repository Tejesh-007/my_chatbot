import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful Q&A assistant that answers questions based on documents. 
    When users ask questions, provide clear, accurate answers. If you don't have specific document context, 
    let users know they should upload their documents first. Be helpful and concise in your responses.
    
    For demonstration purposes, you can answer general questions, but remind users that for document-specific 
    questions, they would need to upload their documents first.`,
    messages,
  })

  return result.toDataStreamResponse()
}
