async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'huggingface',
        message: 'hello',
        hfApiKey: 'hf_dummy'
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
}
test();
