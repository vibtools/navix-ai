async function test() {
  try {
    await fetch('https://example.com', {
      headers: { 'Authorization': 'Bearer foo\nbar' }
    });
  } catch (err) {
    console.log(err.name, err.message);
  }
}
test();
