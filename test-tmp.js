async function test() {
  const formData = new FormData();
  const file = new Blob(['hello world'], { type: 'text/plain' });
  formData.append('file', file, 'test.txt');
  const res = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: formData
  });
  console.log(await res.text());
}
test();