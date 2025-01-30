import { supabase } from "../../supabaseClient";

// Main function to handle user messages
export async function handleUserMessage(
  sessionId: string,
  content: string,
  chatHistory: { role: string; content: string }[] = []
) {
  try {
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('agent-executor', {
      body: {
        input: content,
        chat_history: chatHistory
      }
    });

    if (error) throw error;

    // Format the response with proper HTML structure
    let formattedResponse = data.output;
    if (!formattedResponse.startsWith('<p>')) {
      formattedResponse = `<p>${formattedResponse}</p>`;
    }
    formattedResponse = formattedResponse.replace(/\n\n/g, '</p><p>');
    formattedResponse = formattedResponse.replace(/\n/g, '<br>');

    // Save the assistant's response
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        content: formattedResponse,
        role: 'assistant',
        tool_calls: data.intermediateSteps?.map((step: any) => ({
          tool: step.action.tool,
          input: step.action.toolInput
        })),
        tool_outputs: data.intermediateSteps?.map((step: any) => step.observation)
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Save agent actions
    if (data.intermediateSteps) {
      for (const step of data.intermediateSteps) {
        await saveAgentAction(
          sessionId,
          messageData.id,
          step.action.tool,
          step.action.toolInput,
          step.observation,
          'success'
        );
      }
    }

    return {
      response: formattedResponse,
      messageId: messageData.id
    };
  } catch (error) {
    console.error('Error in agent execution:', error);
    
    // Save error message
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        content: "I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.",
        role: 'assistant'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving error message:', messageError);
    }

    return {
      response: "I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.",
      messageId: messageData?.id
    };
  }
}

// Function to save agent actions to the database
async function saveAgentAction(
  sessionId: string,
  messageId: string,
  toolName: string,
  toolInput: any,
  toolOutput: any,
  status: 'pending' | 'success' | 'error'
) {
  const { error } = await supabase
    .from('agent_actions')
    .insert({
      session_id: sessionId,
      message_id: messageId,
      tool_name: toolName,
      tool_input: toolInput,
      tool_output: toolOutput,
      status
    });

  if (error) {
    console.error('Error saving agent action:', error);
  }
} 