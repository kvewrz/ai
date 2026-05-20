import axios from 'axios'
const AxiosnInstance = axios.create({
    baseURL:'http://localhost:11434',
    headers:{
        'Content-Type':'application/json'
    }
})

export default AxiosnInstance