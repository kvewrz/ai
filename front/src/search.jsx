import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import AiApi from "./ai-api"
import Loader from "./loader"
import './search.css' 

const schema = yup.object({
    info: yup.string().required('Введите текст запроса')
})

function Search() {
    const [error, setError] = useState('')
    const [loader, setLoader] = useState(false)

   
    const [history, setHistory] = useState(() => {
        const savedHistory = localStorage.getItem('chat_history')
        return savedHistory ? JSON.parse(savedHistory) : []
    })

    
    const [currentChatId, setCurrentChatId] = useState(() => {
        const savedId = localStorage.getItem('current_chat_id')
        return savedId ? JSON.parse(savedId) : null
    })

    
    const [messages, setMessages] = useState(() => {
        const savedMessages = localStorage.getItem('current_messages')
        return savedMessages ? JSON.parse(savedMessages) : []
    })

    
    useEffect(() => {
        localStorage.setItem('chat_history', JSON.stringify(history))
    }, [history])

    useEffect(() => {
        localStorage.setItem('current_chat_id', JSON.stringify(currentChatId))
    }, [currentChatId])

    useEffect(() => {
        localStorage.setItem('current_messages', JSON.stringify(messages))
    }, [messages])

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: yupResolver(schema)
    })

    const onSearch = async (form) => {
        const userMessage = { role: 'user', text: form.info }
        
       
        setMessages(prev => [...prev, userMessage])
        setLoader(true)
        setError('')
        reset()

        
        let chatId = currentChatId

        try {
            const fullHistory = [...messages, userMessage].map(msg => ({
                role: msg.role,
                content: msg.text
            }))

            const data = await AiApi.generateAi({ prompt: form.info, history: fullHistory })
            const aiMessage = { role: "assistant", text: data.response }
            
            
            setMessages(prev => [...prev, aiMessage])

           
            setHistory(prev => {
                if (!chatId) {
                   
                    const newChatId = Date.now()
                    setCurrentChatId(newChatId)
                    return [{
                        id: newChatId,
                        title: form.info, 
                        dialog: [userMessage, aiMessage]
                    }, ...prev]
                } else {
                    
                    return prev.map(chat => 
                        chat.id === chatId 
                            ? { ...chat, dialog: [...chat.dialog, userMessage, aiMessage] }
                            : chat
                    )
                }
            })
        } catch (error) {
            console.error(error)
            setError(error?.response?.data?.error || 'Не удалось отправить запрос')
        } finally {
            setLoader(false)
        }
    }

    
    const selectChat = (chat) => {
        setMessages(chat.dialog)
        setCurrentChatId(chat.id) 
        setError('')
    }

    const startNewChat = () => {
        setMessages([])
        setCurrentChatId(null)
        setError('')
    }

    return (
        <div className="search-container">
            
            <aside className="search-sidebar">
                <div className="search-sidebar-header">
                    <button onClick={startNewChat} className="new-chat-btn">
                        ➕ Новая беседа
                    </button>
                </div>
                <div className="search-history-list">
                    {history.map((chat) => (
                        <div 
                            key={chat.id} 
                            className={`search-history-item ${chat.id === currentChatId ? 'active-chat' : ''}`}
                            onClick={() => selectChat(chat)}
                        >
                            <p className="search-history-question">💬 {chat.title}</p>
                            <p className="search-history-answer">
                                {chat.dialog[chat.dialog.length - 1]?.text}
                            </p>
                        </div>
                    ))}
                </div>
            </aside>

          
            <main className="search-main-content">
                <div className="search-response-area">
                    <div className="search-response-wrapper">
                        
                        {messages.length === 0 && !loader && (
                            <div className="search-welcome-zone">
                                <h1 className="search-welcome-title">Чем я могу помочь?</h1>
                                <p className="search-welcome-subtitle">Задайте ваш вопрос ниже для начала диалога</p>
                            </div>
                        )}

                        <div className="chat-messages-list">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message-bubble ${msg.role}`}>
                                    <div className="message-badge">
                                        {msg.role === 'user' ? 'Вы' : 'Ответ ИИ'}
                                    </div>
                                    <div className="search-result-text">{msg.text}</div>
                                </div>
                            ))}
                        </div>

                        {loader && (
                            <div className="search-loader-zone">
                                <Loader />
                                <span>ИИ генерирует ответ...</span>
                            </div>
                        )}
                    </div>
                </div>

                
                <div className="search-input-area">
                    <div className="search-form-container">
                        <form onSubmit={handleSubmit(onSearch)}>
                            <div className="search-form-group">
                                <input 
                                    type="text" 
                                    {...register('info')} 
                                    placeholder="Спросите меня о чем-нибудь..."
                                    disabled={loader}
                                    className={`search-input-field ${errors.info ? 'search-input-error' : ''}`}
                                />   
                                <button 
                                    type="submit"
                                    disabled={loader}
                                    className="search-submit-button"
                                >
                                    <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="search-icon">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                        </form>

                        <div className="search-feedback-container">
                            {errors.info && <span className="search-error-text">{errors.info.message}</span>}
                            {error && <span className="search-error-text">Ошибка сервера: {error}</span>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Search
