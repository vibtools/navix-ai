async function test() {
  try {
    const res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-Nemo-Instruct-2407/v1/chat/completions', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'chrome-extension://abcdef',
        'Access-Control-Request-Method': 'POST'
      }
    });
    console.log(res.status);
  } catch (err) {
    console.error(err);
  }
}
test();
