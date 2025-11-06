// components/GroupChatInterface.js
import ChatInterface from "./ChatInterface";

export default function GroupChatInterface({ chatId }) {
  // For group chat, just pass chatId and isGroup true (you can add group-specific logic)
  return <ChatInterface chatId={chatId} isGroup={true} />;
}
