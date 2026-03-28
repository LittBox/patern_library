exports.handler = async function(event){
  // 占位：调用 DeepSeek 或其它文本模型，返回结构化文案
  const sample = {
    title:'示例纹案',
    description:'基于民族元素的示例纹案',
    image_prompt:'民族回纹，红金配色，对称构图，适合刺绣',
    explanation:'示例讲解词：象征延续与团圆。'
  }
  return { statusCode:200, body: JSON.stringify({ success:true, data: sample }) }
}
