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
  try{
    const { fileName, contentType, base64 } = JSON.parse(event.body || '{}')
    if(!fileName || !contentType || !base64){
      return { statusCode:400, body: JSON.stringify({ success:false, message:'fileName, contentType and base64 required' }) }
    }

    if(!NETLIFY_TOKEN || !SITE_ID){
      // If tokens not configured, return base64 so front-end can handle it.
      return { statusCode:200, body: JSON.stringify({ success:true, fallback:true, fileName, contentType, base64 }) }
    }

    const blob = await uploadBlob(fileName, contentType, base64)
    return { statusCode:200, body: JSON.stringify({ success:true, blob }) }
  }catch(err){
    return { statusCode:500, body: JSON.stringify({ success:false, message: err.message }) }
  }
}
