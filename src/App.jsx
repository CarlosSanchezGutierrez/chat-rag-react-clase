import { useEffect, useRef, useState } from 'react';
import { Bot, FileText, MessageSquare, Plus, Send, Sparkles, Trash2, Upload, User, X } from 'lucide-react';

const initialMessage = { role: 'assistant', content: '¡Hola! Carga uno o más archivos de texto y pregúntame lo que quieras sobre su contenido.' };

export default function App() {
  const [messages, setMessages] = useState([initialMessage]);
  const [docs, setDocs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef(null);
  const picker = useRef(null);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  async function upload(files) {
    for (const file of files) {
      if (!file.name.endsWith('.txt')) { setError('Por ahora solo se admiten archivos .txt.'); continue; }
      try {
        const text = await file.text();
        const response = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, text }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setDocs((old) => [...old, { name: file.name, chunks: data.chunks }]);
        setError('');
      } catch (e) { setError(e.message || 'No se pudo cargar el archivo.'); }
    }
  }

  async function clearDocs() {
    await fetch('/api/documents', { method: 'DELETE' });
    setDocs([]);
  }

  async function sendMessage(event) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next); setInput(''); setBusy(true); setError('');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, history: messages.slice(1).map(({ role, content }) => ({ role, content })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessages([...next, { role: 'assistant', content: data.answer, sources: data.sources }]);
    } catch (e) { setMessages([...next, { role: 'assistant', content: e.message || 'Ocurrió un error.' }]); }
    finally { setBusy(false); }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-icon"><Sparkles size={18} /></span> contexto<span className="brand-dot">.</span></a>
      <button className="new-chat" onClick={() => setMessages([initialMessage])}><Plus size={17} /> Nueva conversación</button>
      <div className="side-label">ESPACIO DE TRABAJO</div>
      <div className="workspace"><span className="workspace-glyph"><MessageSquare size={15}/></span><span>Mi asistente</span><span className="online-dot" /></div>
      <div className="side-label docs-label">TUS DOCUMENTOS <span>{docs.length}</span></div>
      <div className="documents">
        {docs.map((doc, i) => <div className="doc-item" key={`${doc.name}-${i}`}><FileText size={16} /><span title={doc.name}>{doc.name}</span><small>{doc.chunks}</small></div>)}
        {!docs.length && <div className="empty-docs">Tus archivos aparecerán aquí.</div>}
      </div>
      <button className="upload-button" onClick={() => picker.current?.click()}><Upload size={16} /> Cargar documentos</button>
      <input ref={picker} type="file" accept=".txt,text/plain" multiple hidden onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
      {docs.length > 0 && <button className="clear-button" onClick={clearDocs}><Trash2 size={14} /> Limpiar documentos</button>}
      <div className="sidebar-footer"><span className="avatar">CS</span><div><strong>Mi cuenta</strong><small>Plan gratuito</small></div><span className="footer-menu">···</span></div>
    </aside>

    <section className="chat-area">
      <header className="topbar"><div className="top-title"><span className="bot-avatar"><Bot size={18}/></span><div><strong>Mi asistente</strong><small><i /> En línea</small></div></div><div className="top-right"><span className="model-chip">GPT · RAG</span><button className="icon-button" title="Limpiar documentos" onClick={clearDocs}><Trash2 size={16}/></button></div></header>
      <div className="conversation">
        {messages.length === 1 && <div className="welcome"><div className="welcome-mark"><Sparkles size={23}/></div><div className="eyebrow">TU ESPACIO DE CONOCIMIENTO</div><h1>Una conversación<br/>con tus documentos.</h1><p>Carga tus archivos y encuentra respuestas en segundos.</p><div className="suggestions"><button onClick={() => setInput('¿Qué información contiene el documento?')}>✦ &nbsp; ¿Qué información contiene?</button><button onClick={() => setInput('Hazme un resumen de los puntos principales')}>✦ &nbsp; Resume los puntos principales</button></div></div>}
        <div className="messages">{messages.map((message, i) => <article className={`message ${message.role}`} key={i}><div className={`message-avatar ${message.role}`}>{message.role === 'user' ? <User size={16}/> : <Sparkles size={15}/>}</div><div className="message-body"><div className="message-name">{message.role === 'user' ? 'Tú' : 'Asistente'}</div><p>{message.content}</p>{message.sources?.length > 0 && <div className="sources"><span>Fuentes</span>{message.sources.map((source) => <small key={source}><FileText size={12}/>{source}</small>)}</div>}</div></article>)}{busy && <article className="message assistant"><div className="message-avatar assistant"><Sparkles size={15}/></div><div className="message-body"><div className="message-name">Asistente</div><div className="typing"><i/><i/><i/></div></div></article>}<div ref={bottom}/></div>
      </div>
      <div className="composer-wrap">{error && <div className="error-note"><span>{error}</span><button onClick={() => setError('')}><X size={14}/></button></div>}<form className="composer" onSubmit={sendMessage}><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pregúntale algo a tus documentos..." rows="1" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} /><div className="composer-bottom"><button type="button" className="attach-button" onClick={() => picker.current?.click()}><Plus size={15}/><span>Adjuntar archivo</span></button><div className="send-hint">Enter para enviar <button type="submit" className="send-button" disabled={busy || !input.trim()} aria-label="Enviar"><Send size={16}/></button></div></div></form><div className="disclaimer">Las respuestas pueden contener errores. Comprueba la información importante.</div></div>
    </section>
  </main>;
}
