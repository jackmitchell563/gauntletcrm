import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { Ticket } from "../../../types/database.types";

// Initialize the model
const model = new ChatOpenAI({
  temperature: 0,
  modelName: 'gpt-4o-mini',
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

export async function generateTicketResponse(ticket: Pick<Ticket, 'id' | 'title' | 'description' | 'created_by' | 'status' | 'priority'>, customerName: string, agentName: string): Promise<string> {
  try {
    const response = await model.invoke([
      new HumanMessage(`Generate a professional, empathetic response to this support ticket.
      Return the response in this exact HTML format, without any markdown or code block markers:
      
      <p><strong>Subject: Re: ${ticket.title}</strong></p>
      
      <p>Dear ${customerName},</p>
      
      [Your response here, with each paragraph wrapped in <p> tags]
      
      <p>Best regards,<br />${agentName}</p>
      
      Ticket Details:
      Title: ${ticket.title}
      Description: ${ticket.description || 'No description provided'}
      Priority: ${ticket.priority}
      Status: ${ticket.status}`)
    ]);

    // Ensure the response is properly formatted HTML
    let content = response.content.toString();
    if (!content.includes('<p>')) {
      content = `<p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />')}</p>`;
    }
    return content;
  } catch (error) {
    console.error('Error generating response:', error);
    return '<p>I apologize, but I was unable to generate a response at this time. Please try again later.</p>';
  }
} 