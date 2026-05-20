import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import ReactMarkdown from 'react-markdown'
import AiApi from "./ai-api"
import Loader from "./loader"
import './search.css' 

const schema = yup.object({
    info: yup.string().required('Введите текст запроса')
})

function Search() {
    const [error, setError] = useState('')
    const [loader, setLoader] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Состояние мобильного сайдбара
    const responseAreaRef = useRef(null)

    // Синхронизация истории чатов
    const [history, setHistory] = useState(() => {
        const savedHistory = localStorage.getItem('chat_history')
        return savedHistory ? JSON.parse(savedHistory) : []
    })

    // ID текущей активной сессии
    const [currentChatId, setCurrentChatId] = useState(() => {
        const savedId = localStorage.getItem('current_chat_id')
        return savedId ? JSON.parse(savedId) : null
    })

    // Текущие сообщения на экране
    const [messages, setMessages] = useState(() => {
        const savedMessages = localStorage.getItem('current_messages')
        return savedMessages ? JSON.parse(savedMessages) : []
    })

    // Сохранение состояний в LocalStorage
    useEffect(() => {
        localStorage.setItem('chat_history', JSON.stringify(history))
    }, [history])

    useEffect(() => {
        localStorage.setItem('current_chat_id', JSON.stringify(currentChatId))
    }, [currentChatId])

    useEffect(() => {
        localStorage.setItem('current_messages', JSON.stringify(messages))
    }, [messages])

    // Автоматический плавный скролл вниз
    useEffect(() => {
        if (responseAreaRef.current) {
            responseAreaRef.current.scrollTo({
                top: responseAreaRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }
    }, [messages, loader])

    const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
        resolver: yupResolver(schema)
    })

    const inputValue = watch('info', '')

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
        setIsSidebarOpen(false) // Закрываем сайдбар на мобилках после выбора чата
    }

    const startNewChat = () => {
        setMessages([])
        setCurrentChatId(null)
        setError('')
        setIsSidebarOpen(false) // Закрываем сайдбар на мобилках
    }

    const clearHistory = () => {
        if (window.confirm("Вы уверены, что хотите полностью очистить всю историю диалогов?")) {
            setMessages([])
            setCurrentChatId(null)
            setHistory([])
            setError('')
            localStorage.removeItem('chat_history')
            localStorage.removeItem('current_chat_id')
            localStorage.removeItem('current_messages')
            setIsSidebarOpen(false)
        }
    }

    return (
        <div className="search-container">
            
            {/* КНОПКА ГАМБУРГЕРА ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ */}
            <button 
                className={`mobile-menu-toggle ${isSidebarOpen ? 'active' : ''}`} 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Открыть историю"
            >
                <div className="bar1"></div>
                <div className="bar2"></div>
                <div className="bar3"></div>
            </button>

            {/* ТЕМНАЯ ПОДЛОЖКА ДЛЯ ЗАКРЫТИЯ САЙДБАРА ПО КЛИКУ ВНЕ ЕГО */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
            
            {/* ЛЕВАЯ ПАНЕЛЬ (САЙДБАР) */}
            <aside className={`search-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="search-sidebar-header">
                    <button onClick={startNewChat} className="new-chat-btn">
                        <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://w3.org">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Новая беседа
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

                {/* КНОПКА ОЧИСТКИ ВНИЗУ САЙДБАРА */}
                {history.length > 0 && (
                    <div className="search-sidebar-footer">
                        <button onClick={clearHistory} className="clear-history-btn">
                            <svg className="search-icon-trash" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://w3.org">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Очистить историю
                        </button>
                    </div>
                )}
            </aside>

            {/* ОСНОВНОЙ КОНТЕНТ */}
            <main className="search-main-content">
                <div className="search-response-area" ref={responseAreaRef}>
                    <div className="search-response-wrapper">
                        
                        {/* Экран приветствия */}
                        {messages.length === 0 && !loader && (
                            <div className="search-welcome-zone">
                                <h1 className="search-welcome-title">Чем я могу помочь?</h1>
                                <p className="search-welcome-subtitle">Задайте ваш вопрос ниже для начала диалога</p>
                            </div>
                        )}

                        {/* Список сообщений */}
                        <div className="chat-messages-list">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message-bubble ${msg.role}`}>
                                    <div className="message-badge">
                                        {msg.role === 'user' ? 'Вы' : 'Ответ ИИ'}
                                    </div>
                                    <div className="search-result-text">
                                        {msg.role === 'user' ? (
                                            msg.text
                                        ) : (
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Анимация загрузки */}
                        {loader && (
                            <div className="search-loader-zone">
                                <Loader />
                                <span>Анализирую архитектуру и генерирую блоки кода...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* НИЖНЯЯ ПАНЕЛЬ С ИНПУТОМ */}
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
                                    disabled={loader || !inputValue.trim()}
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
