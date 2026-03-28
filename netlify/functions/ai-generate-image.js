const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN
const SITE_ID = process.env.NETLIFY_SITE_ID

async function uploadBlob(name, contentType, base64){
  if(!NETLIFY_TOKEN || !SITE_ID) throw new Error('NETLIFY_ACCESS_TOKEN or NETLIFY_SITE_ID not configured')
  const url = `https://api.netlify.com/api/v1/sites/${SITE_ID}/blobs?name=${encodeURIComponent(name)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': contentType
    },
    body: Buffer.from(base64, 'base64')
  })
  if(!res.ok){
    const text = await res.text()
    throw new Error(`Netlify Blob upload failed: ${res.status} ${text}`)
  }
  return res.json()
}

exports.handler = async function(event){
  if(!OPENAI_API_KEY){
    return { statusCode:500, body: JSON.stringify({ success:false, message:'OPENAI_API_KEY not configured' }) }
  }

  try{
    const body = JSON.parse(event.body || '{}')
    const prompt = body.prompt || '民族纹案，简洁对称，1024x1024'

    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model:'gpt-image-1.5', prompt, size: '1024x1024' })
    })

    if(!resp.ok){
      const text = await resp.text()
      throw new Error(`OpenAI image generation failed: ${resp.status} ${text}`)
    }

    const data = await resp.json()
    // OpenAI image generation typically returns base64 in data.data[0].b64_json
    const b64 = data?.data?.[0]?.b64_json
    if(!b64){
      return { statusCode:200, body: JSON.stringify({ success:true, openai: data }) }
    }

    // If Netlify blob config present, upload and return blob info
    if(NETLIFY_TOKEN && SITE_ID){
      const fileName = `pattern-${Date.now()}.png`
      const contentType = 'image/png'
      const blob = await uploadBlob(fileName, contentType, b64)
      return { statusCode:200, body: JSON.stringify({ success:true, blob, openai: data }) }
    }

    // Fallback: return base64 to front-end
    return { statusCode:200, body: JSON.stringify({ success:true, base64: b64, openai: data }) }
  }catch(err){
    return { statusCode:500, body: JSON.stringify({ success:false, message:err.message }) }
  }
}
