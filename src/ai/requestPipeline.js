// AI request pipeline foundation

export async function sendAIRequest(message, context, provider) {
  return provider.chat({
    message,
    context
  });
}
