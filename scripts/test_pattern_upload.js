import { handler } from '../netlify/functions/pattern-upload.js'

async function run() {
  const event = {
    body: JSON.stringify({
      fileName: 'test.png',
      contentType: 'image/png',
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
    })
  }

  const response = await handler(event)
  console.log('statusCode:', response.statusCode)
  console.log(response.body)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
