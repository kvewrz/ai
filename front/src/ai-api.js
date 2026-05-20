import AxiosnInstance from "./axios-instance"

class AiApi{
static async generateAi(form){
    const payload = {
        model: 'qwen2.5-coder:1.5b',
        stream: false,
        ...form
    }
    const {data} = await AxiosnInstance.post(`/api/generate`, payload)
    return data
}
}
export default AiApi