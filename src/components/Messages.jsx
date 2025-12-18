import React, { useState, useEffect, useRef } from "react";

const initialMessages = [
  { id: 1, sender: "Admin", content: "Welcome to ETEEAP! How can we help you?", timestamp: "2025-10-29 08:00" },
  { id: 2, sender: "User", content: "Hi, I want to ask about submitting my documents.", timestamp: "2025-10-29 08:05" },
  { id: 3, sender: "Admin", content: "Sure! You can submit online through your dashboard.", timestamp: "2025-10-29 08:10" },
];

const Messages = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageObj = {
      id: messages.length + 1,
      sender: "User",
      content: newMessage,
      timestamp: new Date().toLocaleString(),
    };

    setMessages([...messages, messageObj]);
    setNewMessage("");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans h-[80vh] flex flex-col">
      <div className="bg-blue-600 text-white py-3 px-4 rounded-t-lg shadow-md text-center font-semibold">
        ETEEAP Chat Support
      </div>

      <div className="flex-1 border-x border-b rounded-b-lg bg-gray-50 p-4 flex flex-col gap-4 overflow-y-auto animate-fadeIn">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-2xl max-w-[75%] transition-all duration-300 ${
              msg.sender === "User"
                ? "bg-blue-600 text-white self-end shadow-md"
                : "bg-gray-200 text-gray-800 self-start shadow-sm"
            }`}
          >
            <p>{msg.content}</p>
            <span
              className={`text-[11px] mt-1 block ${
                msg.sender === "User" ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {msg.timestamp}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="mt-3 flex gap-2 border-t pt-3 bg-white rounded-b-lg"
      >
        <input
          type="text"
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Messages;