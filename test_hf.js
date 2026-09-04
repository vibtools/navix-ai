const fetch = require('node-fetch'); // or use built-in fetch if node 18+
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
    console.log(res.headers);
  } catch (err) {
    console.error(err);
  }
}
test();
