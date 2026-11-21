type Chat = { key: string; title: string };
type Props = { chats: Chat[]; selected: string | null; onSelect: (key: string) => void; onDelete: (key: string) => void };

export function ChatList({ chats, selected, onSelect, onDelete }: Props) {
  if (!chats.length) return <p className="hint">No chats yet. Start one with New chat.</p>;
  return (
    <ul className="chat-list">
      {chats.map(chat => (
        <li key={chat.key} className={chat.key === selected ? 'chat-row active' : 'chat-row'}>
          <button className="chat-title" onClick={() => onSelect(chat.key)}>{chat.title}</button>
          <button className="icon-btn" aria-label={`Delete ${chat.title}`} onClick={() => onDelete(chat.key)}>×</button>
        </li>
      ))}
    </ul>
  );
}
