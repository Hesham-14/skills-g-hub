import { useState } from 'react';
import './styles.css';
import { ChatList } from './components/ChatList';
import { EffortPicker, ModelPicker } from './components/Pickers';

export function App() {
  const [chats, setChats] = useState([{ key: 'a', title: 'Fix the deploy script' }, { key: 'b', title: 'Review PR 42' }]);
  const [selected, setSelected] = useState<string | null>('a');
  const [model, setModel] = useState('balanced');
  return (
    <div className="app">
      <aside className="sidebar">
        <ChatList chats={chats} selected={selected} onSelect={setSelected} onDelete={key => setChats(cs => cs.filter(c => c.key !== key))} />
      </aside>
      <header className="chat-header">
        <ModelPicker value={model} onChange={setModel} />
        <EffortPicker onPick={() => {}} />
      </header>
    </div>
  );
}
