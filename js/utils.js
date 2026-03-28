export function toBase64(file){
  return new Promise((res,rej)=>{
    const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)
  })
}

export function nowISO(){ return new Date().toISOString() }
