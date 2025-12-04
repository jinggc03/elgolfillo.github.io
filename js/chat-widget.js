(function () {
  const { useEffect, useMemo, useRef, useState } = React;

  const STORAGE_KEYS = {
    session: 'primecars_chat_session_id',
    messages: 'primecars_chat_messages',
  };

  const FALLBACK_MESSAGE =
    'Lo siento, no he podido recuperar la respuesta ahora mismo. Por favor, inténtalo de nuevo o comparte más detalles.';

  function normalizeBaseUrl(url) {
    if (!url) return '';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  function loadFromStorage(key, fallback) {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveToStorage(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* ignore */
    }
  }

  function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState(() => loadFromStorage(STORAGE_KEYS.session, ''));
    const [messages, setMessages] = useState(() =>
      loadFromStorage(STORAGE_KEYS.messages, [
        {
          id: 'intro',
          role: 'agent',
          text: '¡Hola! Soy el asistente de PrimeCars. Pregúntame por ofertas, reservas o información de la plataforma.',
        },
      ]),
    );
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const messagesEndRef = useRef(null);

    const apiBaseUrl = useMemo(
      () => normalizeBaseUrl(window.ENV?.VITE_API_BASE_URL || ''),
      [],
    );
    const useStateless = useMemo(() => (window.ENV?.VITE_CHAT_USE_STATELESS || '').toString() === 'true', []);

    const endpoint = useMemo(() => {
      const path = useStateless ? '/api/v1/agent/chat-stateless' : '/api/v1/agent/chat';
      return `${apiBaseUrl}${path}` || path;
    }, [apiBaseUrl, useStateless]);

    useEffect(() => {
      saveToStorage(STORAGE_KEYS.session, sessionId || '');
    }, [sessionId]);

    useEffect(() => {
      saveToStorage(STORAGE_KEYS.messages, messages);
    }, [messages]);

    useEffect(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages, isOpen]);

    const pushMessage = (message) => setMessages((prev) => [...prev, message]);

    const replaceTypingWith = (newMessage) => {
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.status !== 'typing');
        return [...filtered, newMessage];
      });
    };

    const handleSend = async () => {
      const content = inputValue.trim();
      if (!content || isSending) return;

      setError('');
      setIsSending(true);
      setInputValue('');

      const userMessage = { id: `user-${Date.now()}`, role: 'user', text: content };
      pushMessage(userMessage);
      pushMessage({ id: `typing-${Date.now()}`, role: 'agent', text: 'Escribiendo…', status: 'typing' });

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: 'web-user',
            session_id: useStateless ? '' : sessionId || '',
            message: content,
          }),
        });

        if (!response.ok) {
          throw new Error('No se pudo contactar con el agente.');
        }

        const data = await response.json();
        const reply = (data?.response || '').trim();
        const newSessionId = data?.session_id || '';

        if (!useStateless && newSessionId) {
          setSessionId(newSessionId);
        }

        if (reply) {
          replaceTypingWith({ id: `agent-${Date.now()}`, role: 'agent', text: reply });
        } else {
          replaceTypingWith({ id: `agent-${Date.now()}`, role: 'agent', text: FALLBACK_MESSAGE, status: 'fallback' });
        }
      } catch (err) {
        setError(err.message || 'Se produjo un error al enviar tu mensaje.');
        replaceTypingWith({ id: `error-${Date.now()}`, role: 'agent', text: FALLBACK_MESSAGE, status: 'error' });
      } finally {
        setIsSending(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    };

    return (
      React.createElement(React.Fragment, null,
        React.createElement('div', {
          className: 'pc-chat-bubble',
          role: 'button',
          'aria-label': 'Abrir chat PrimeCars',
          onClick: () => setIsOpen((open) => !open),
        }, '💬'),
        isOpen && React.createElement('div', { className: 'pc-chat-modal' },
          React.createElement('div', { className: 'pc-chat-header' },
            React.createElement('div', null,
              React.createElement('h4', null, 'Asistente PrimeCars'),
              React.createElement('small', null, useStateless ? 'Modo sin estado' : 'Sesión activa para tu conversación'),
              !useStateless && sessionId && React.createElement('span', { className: 'pc-chat-session' }, `ID: ${sessionId}`),
            ),
            React.createElement('button', { className: 'pc-chat-close', onClick: () => setIsOpen(false), 'aria-label': 'Cerrar chat' }, '×'),
          ),
          React.createElement('div', { className: 'pc-chat-body' },
            messages.map((msg) => (
              React.createElement('div', { key: msg.id, className: `pc-chat-message ${msg.role}` },
                React.createElement('div', { className: `pc-chat-avatar ${msg.role}` }, msg.role === 'agent' ? 'PC' : 'Tú'),
                React.createElement('div', { className: 'pc-chat-bubble-msg' },
                  msg.status === 'typing'
                    ? React.createElement('div', { className: 'pc-chat-typing', 'aria-label': 'Escribiendo' },
                        React.createElement('span', null),
                        React.createElement('span', null),
                        React.createElement('span', null),
                      )
                    : msg.text,
                ),
              )
            )),
            React.createElement('div', { ref: messagesEndRef }),
          ),
          React.createElement('div', { className: 'pc-chat-footer' },
            error && React.createElement('div', { className: 'pc-chat-error' }, error),
            React.createElement('div', { className: 'pc-chat-input-wrapper' },
              React.createElement('textarea', {
                value: inputValue,
                placeholder: 'Escribe tu mensaje...',
                onChange: (e) => setInputValue(e.target.value),
                onKeyDown: handleKeyDown,
                disabled: isSending,
              }),
              React.createElement('button', {
                className: 'pc-chat-send-btn',
                onClick: handleSend,
                disabled: isSending || !inputValue.trim(),
              }, isSending ? 'Enviando…' : 'Enviar'),
            ),
            React.createElement('div', { className: 'pc-chat-hint' }, 'Sin claves internas: la integración usa únicamente el endpoint público del agente.'),
          ),
        ),
      )
    );
  }

  function renderWidget() {
    const rootElementId = 'pc-chat-widget-root';
    let rootElement = document.getElementById(rootElementId);
    if (!rootElement) {
      rootElement = document.createElement('div');
      rootElement.id = rootElementId;
      document.body.appendChild(rootElement);
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(ChatWidget));
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    renderWidget();
  } else {
    document.addEventListener('DOMContentLoaded', renderWidget);
  }
})();
