import { useState, useEffect, useRef, useCallback } from "react";
import api from "./services/api";
import MessageItem from "./components/MessageItem";
import Sidebar from "./components/Sidebar";
import AuthModal from "./components/AuthModal";
import "./App.css";

const LOCAL_STORAGE_CONVERSATIONS_KEY = "ai-chat-conversations";
const LOCAL_STORAGE_ACTIVE_KEY = "ai-chat-active-id";

function App() {
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONVERSATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechUtteranceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore cleanup error
        }
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop active speech when active conversation changes
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  }, [activeId]);

  const sanitizeMarkdownForSpeech = (markdownText) => {
    if (!markdownText) return "";

    let text = markdownText;

    // Replace code blocks with "Code snippet omitted."
    text = text.replace(/```[\s\S]*?```/g, " Code snippet omitted. ");

    // Replace inline code `code` with just code
    text = text.replace(/`([^`]+)`/g, "$1");

    // Remove headers # ## ###
    text = text.replace(/#{1,6}\s+/g, "");

    // Remove bold and italic formatting **bold** *italic* __bold__ _italic_
    text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
    text = text.replace(/(\*|_)(.*?)\1/g, "$2");

    // Remove markdown links [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Remove bullet points / list numbers at start of lines
    text = text.replace(/^\s*[\*\-\+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");

    // Remove extra whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
  };

  const handleToggleSpeakMessage = (messageId, rawContent) => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    const synth = window.speechSynthesis;

    if (speakingMessageId === messageId && (synth.speaking || synth.pending)) {
      synth.cancel();
      setSpeakingMessageId(null);
      return;
    }

    synth.cancel();

    const cleanText = sanitizeMarkdownForSpeech(rawContent);
    if (!cleanText) {
      alert("This message contains no readable text to speak.");
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setSpeakingMessageId(null);
      };

      utterance.onerror = (e) => {
        console.warn("[SpeechSynthesis Error]:", e.error);
        setSpeakingMessageId(null);
      };

      speechUtteranceRef.current = utterance;
      setSpeakingMessageId(messageId);
      synth.speak(utterance);
    } catch (err) {
      console.error("SpeechSynthesis invocation failed:", err);
      setSpeakingMessageId(null);
      alert("Could not play text-to-speech. Please try again.");
    }
  };

  const handleToggleVoiceInput = () => {
    if (loading) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setMessage((prev) => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${transcript}` : transcript;
          });
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn("[Speech Recognition Error]:", event.error);
        setIsListening(false);

        if (event.error === "not-allowed" || event.error === "permission-denied") {
          alert("Microphone permission was denied. Please allow microphone access in your browser settings.");
        } else if (event.error === "no-speech") {
          // Silent stop when user didn't speak
        } else if (event.error === "network") {
          alert("Network error occurred during speech recognition.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      alert("Could not start voice input. Please try again.");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const originalName = file.name.toLowerCase();
    if (!originalName.endsWith(".pdf") && !originalName.endsWith(".txt")) {
      alert("Unsupported file type. Only .pdf and .txt files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum allowed size is 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeFormatted = file.size >= 1024 * 1024 ? `${sizeInMb} MB` : `${Math.round(file.size / 1024)} KB`;

    setSelectedFile({
      file,
      name: file.name,
      sizeFormatted,
    });
  };

  // Fetch current user details on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem("ai_chat_token");
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data && res.data.user) {
            setUser(res.data.user);
          }
        })
        .catch(() => {
          localStorage.removeItem("ai_chat_token");
          setUser(null);
        });
    }
  }, []);

  const isInitialLoadRef = useRef(true);

  // Fetch user conversations from backend when logged in
  const fetchServerConversations = useCallback(async (shouldAutoSelectInitial = false) => {
    try {
      const res = await api.get("/conversations");
      if (res.data && Array.isArray(res.data.conversations)) {
        setConversations(res.data.conversations);
        if (shouldAutoSelectInitial && res.data.conversations.length > 0) {
          const savedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
          const exists = res.data.conversations.some((c) => (c._id || c.id) === savedActiveId);
          if (savedActiveId && exists) {
            setActiveId(savedActiveId);
          } else {
            setActiveId(res.data.conversations[0]._id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch server conversations:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (isInitialLoadRef.current) {
        fetchServerConversations(true);
        isInitialLoadRef.current = false;
      } else {
        fetchServerConversations(false);
      }
    }
  }, [user, fetchServerConversations]);

  // Derived state for active conversation
  const activeConversation = conversations.find(
    (c) => (c._id || c.id) === activeId
  );
  const messages = activeConversation ? activeConversation.messages : [];

  // Sort conversations: Pinned first, then newest updated
  const sortedConversations = [...conversations].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  // Auto-scroll to latest message
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, loading]);

  // Sync to localStorage for offline / anonymous state
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(conversations));
      } catch (e) {
        console.error("LocalStorage save error:", e);
      }
    }
  }, [conversations, user]);

  useEffect(() => {
    try {
      if (activeId) {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, activeId);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
      }
    } catch (e) {
      console.error("LocalStorage active key save error:", e);
    }
  }, [activeId]);

  // Auto-resize input textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const formatErrorMessage = (error) => {
    const raw = error.response?.data?.message || error.message || "";
    if (raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("busy") || raw.includes("high demand")) {
      return "The AI model is temporarily busy. Please try again in a moment.";
    }
    if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED") || raw.includes("rate limit")) {
      return "The AI service rate limit has been reached. Please wait a moment and try again.";
    }
    if (raw.includes('{"error"') || raw.includes("AI Service Error")) {
      return "The AI model is temporarily unavailable. Please try again in a moment.";
    }
    return raw || "Sorry, something went wrong. Please check your backend server and try again.";
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();

    if ((!message.trim() && !selectedFile) || loading) return;

    const userPrompt = message.trim();
    const now = new Date().toISOString();

    let targetId = activeId;
    let isNewConv = false;

    if (!targetId || !conversations.some((c) => (c._id || c.id) === targetId)) {
      targetId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      isNewConv = true;
    }

    const titleText = selectedFile ? `📎 ${selectedFile.name}` : userPrompt;
    const title = titleText.length > 36 ? titleText.substring(0, 36) + "..." : titleText;

    const userMessageContent = selectedFile
      ? (userPrompt ? `📎 **${selectedFile.name}**\n\n${userPrompt}` : `📎 **${selectedFile.name}**`)
      : userPrompt;

    const newUserMessage = { role: "user", content: userMessageContent };

    // Optimistically update UI state
    setConversations((prev) => {
      if (isNewConv) {
        const newChat = {
          id: targetId,
          title,
          isPinned: false,
          messages: [newUserMessage],
          createdAt: now,
          updatedAt: now,
        };
        return [newChat, ...prev];
      } else {
        return prev.map((c) => {
          if ((c._id || c.id) === targetId) {
            return {
              ...c,
              messages: [...c.messages, newUserMessage],
              updatedAt: now,
            };
          }
          return c;
        });
      }
    });

    setActiveId(targetId);
    setMessage("");
    const fileToSend = selectedFile;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      let response;
      if (fileToSend) {
        const formData = new FormData();
        formData.append("file", fileToSend.file);
        if (userPrompt) formData.append("message", userPrompt);
        if (user && !targetId.startsWith("conv-")) {
          formData.append("conversationId", targetId);
        }
        response = await api.post("/chat", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await api.post("/chat", {
          message: userPrompt,
          conversationId: user ? (targetId.startsWith("conv-") ? undefined : targetId) : undefined,
        });
      }

      if (response.data && response.data.reply) {
        const aiReplyMessage = { role: "assistant", content: response.data.reply };
        const replyTime = new Date().toISOString();

        if (user && response.data.conversationId) {
          const serverConvId = response.data.conversationId;
          setActiveId(serverConvId);
          await fetchServerConversations();
        } else {
          setConversations((prev) =>
            prev.map((c) => {
              if ((c._id || c.id) === targetId) {
                return {
                  ...c,
                  messages: [...c.messages, aiReplyMessage],
                  updatedAt: replyTime,
                };
              }
              return c;
            })
          );
        }
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (error) {
      console.error("Chat API error:", error);
      const cleanMessage = formatErrorMessage(error);

      const errorReplyMessage = {
        role: "assistant",
        content: `⚠️ ${cleanMessage}`,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if ((c._id || c.id) === targetId) {
            return {
              ...c,
              messages: [...c.messages, errorReplyMessage],
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateResponse = async (assistantIndex, messageId) => {
    if (loading || !activeId) return;

    let targetAssistantIdx = assistantIndex;
    let userMsgIndex = assistantIndex - 1;

    if (messages[assistantIndex]?.role === 'user') {
      userMsgIndex = assistantIndex;
      targetAssistantIdx = assistantIndex + 1;
    }

    const userPrompt = messages[userMsgIndex]?.content;

    setLoading(true);

    try {
      const response = await api.post("/chat", {
        message: userPrompt,
        conversationId: user ? (activeId.startsWith("conv-") ? undefined : activeId) : undefined,
        mode: "regenerate",
        messageIndex: targetAssistantIdx,
        messageId: messageId,
      });

      if (response.data && response.data.reply) {
        if (user && response.data.conversationId) {
          await fetchServerConversations();
        } else {
          setConversations((prev) =>
            prev.map((c) => {
              if ((c._id || c.id) === activeId) {
                const updatedMsgs = [...c.messages];
                const newReplyMsg = {
                  role: "assistant",
                  content: response.data.reply,
                  timestamp: new Date().toISOString(),
                };
                if (targetAssistantIdx >= 0 && targetAssistantIdx < updatedMsgs.length) {
                  updatedMsgs[targetAssistantIdx] = newReplyMsg;
                } else {
                  updatedMsgs.push(newReplyMsg);
                }
                return { ...c, messages: updatedMsgs, updatedAt: new Date().toISOString() };
              }
              return c;
            })
          );
        }
      }
    } catch (error) {
      console.error("Regenerate response error:", error);
      const cleanMsg = formatErrorMessage(error);
      alert(cleanMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditMessage = async (userMessageIndex, newContent, messageId) => {
    if (loading || !newContent.trim() || !activeId) return;

    const targetId = activeId;
    const previousConversations = conversations;
    setLoading(true);

    try {
      const response = await api.post("/chat", {
        message: newContent,
        conversationId: user ? (targetId.startsWith("conv-") ? undefined : targetId) : undefined,
        mode: "edit",
        messageIndex: userMessageIndex,
        messageId: messageId,
      });

      if (response.data && response.data.reply) {
        if (user && response.data.conversationId) {
          await fetchServerConversations();
        } else {
          setConversations((prev) =>
            prev.map((c) => {
              if ((c._id || c.id) === targetId) {
                return {
                  ...c,
                  messages: [
                    ...c.messages.slice(0, userMessageIndex),
                    { role: "user", content: newContent },
                    { role: "assistant", content: response.data.reply },
                  ],
                  updatedAt: new Date().toISOString(),
                };
              }
              return c;
            })
          );
        }
      }
    } catch (error) {
      console.error("Edit message error:", error);
      setConversations(previousConversations);
      const cleanMsg = formatErrorMessage(error);
      alert(cleanMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !loading) {
        sendMessage();
      }
    }
  };

  const handleNewChat = () => {
    setActiveId(null);
    setMessage("");
    try {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    } catch (e) {
      console.error("LocalStorage active key remove error:", e);
    }
  };

  const handleSelectConversation = (id) => {
    setActiveId(id);
  };

  const handleRenameConversation = async (idToRename, newTitle) => {
    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) => {
        if ((c._id || c.id) === idToRename) {
          return { ...c, title: newTitle };
        }
        return c;
      })
    );

    if (user && !idToRename.startsWith("conv-")) {
      try {
        await api.patch(`/conversations/${idToRename}`, { title: newTitle });
      } catch (err) {
        console.error("Failed to rename conversation on server:", err);
        fetchServerConversations();
      }
    }
  };

  const handleTogglePinConversation = async (idToPin, isPinned) => {
    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) => {
        if ((c._id || c.id) === idToPin) {
          return { ...c, isPinned };
        }
        return c;
      })
    );

    if (user && !idToPin.startsWith("conv-")) {
      try {
        await api.patch(`/conversations/${idToPin}`, { isPinned });
      } catch (err) {
        console.error("Failed to toggle pin on server:", err);
        fetchServerConversations();
      }
    }
  };

  const handleDeleteConversation = async (idToDelete) => {
    if (user && !idToDelete.startsWith("conv-")) {
      try {
        await api.delete(`/conversations/${idToDelete}`);
      } catch (err) {
        console.error("Failed to delete conversation on server:", err);
      }
    }

    setConversations((prev) => {
      const updated = prev.filter((c) => (c._id || c.id) !== idToDelete);
      if (activeId === idToDelete) {
        const remainingSorted = [...updated].sort((a, b) => {
          if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
            return a.isPinned ? -1 : 1;
          }
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        });
        const nextActive = remainingSorted.length > 0 ? (remainingSorted[0]._id || remainingSorted[0].id) : null;
        setActiveId(nextActive);
      }
      return updated;
    });
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all saved chats?")) {
      if (user) {
        conversations.forEach(async (c) => {
          const cid = c._id || c.id;
          if (cid && !cid.startsWith("conv-")) {
            try {
              await api.delete(`/conversations/${cid}`);
            } catch {
              // ignore error on batch delete
            }
          }
        });
      }
      setConversations([]);
      setActiveId(null);
      localStorage.removeItem(LOCAL_STORAGE_CONVERSATIONS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("ai_chat_token");
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    setUser(null);
    setConversations([]);
    setActiveId(null);
    isInitialLoadRef.current = true;
  };

  const [theme, setTheme] = useState(() => localStorage.getItem("ai_chat_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ai_chat_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleSuggestionClick = (promptText) => {
    setMessage(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        conversations={sortedConversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onClearAll={handleClearAll}
        isOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="menu-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="brand">
              <div className="logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>

              <div>
                <h1>AI Assistant</h1>
                <p>
                  <span className="status-dot"></span>
                  {user ? `Logged in as ${user.name}` : 'Powered by Gemini'}
                </p>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="header-theme-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {!user ? (
              <button
                type="button"
                className="header-login-btn"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Log In
              </button>
            ) : (
              <button
                type="button"
                className="header-new-chat-btn"
                onClick={handleNewChat}
                title="Start a new chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Chat</span>
              </button>
            )}
          </div>
        </header>

        {/* Chat Main Area */}
        <main className="chat-container">
          {!activeId || messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-header">
                <div className="welcome-badge">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>AI Assistant</span>
                </div>
                <h2>Your intelligent workspace for questions, coding, documents and ideas.</h2>
                <p className="welcome-subtitle">Powered by Gemini</p>
              </div>

              <div className="suggestions-grid">
                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() =>
                    handleSuggestionClick("Write a JavaScript function to reverse a string with example usage.")
                  }
                >
                  <div className="suggestion-icon">💻</div>
                  <div className="suggestion-content">
                    <h4>Coding</h4>
                    <p>Help me debug code & write functions</p>
                  </div>
                </button>

                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() =>
                    handleSuggestionClick("Explain the difference between SQL and NoSQL databases in simple terms.")
                  }
                >
                  <div className="suggestion-icon">📚</div>
                  <div className="suggestion-content">
                    <h4>Learn</h4>
                    <p>Explain a complex concept simply</p>
                  </div>
                </button>

                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() =>
                    handleSuggestionClick("Draft a professional project status email for my team.")
                  }
                >
                  <div className="suggestion-icon">✍️</div>
                  <div className="suggestion-content">
                    <h4>Write</h4>
                    <p>Draft a document or email</p>
                  </div>
                </button>

                <button
                  type="button"
                  className="suggestion-card"
                  onClick={() =>
                    handleSuggestionClick("Give me 3 full-stack web project ideas with Node.js and React.")
                  }
                >
                  <div className="suggestion-icon">💡</div>
                  <div className="suggestion-content">
                    <h4>Ideas</h4>
                    <p>Brainstorm project ideas with me</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((msg, index) => {
                const isLatestAssistant =
                  msg.role === 'assistant' && index === messages.length - 1;
                return (
                  <MessageItem
                    key={index}
                    msg={msg}
                    index={index}
                    isLatestAssistant={isLatestAssistant}
                    loading={loading}
                    onRegenerate={handleRegenerateResponse}
                    onSaveEdit={handleSaveEditMessage}
                    speakingMessageId={speakingMessageId}
                    onToggleSpeak={handleToggleSpeakMessage}
                  />
                );
              })}

              {/* AI Typing / Loading Indicator */}
              {loading && (
                <div className="message-row ai-row">
                  <div className="avatar ai-avatar">AI</div>

                  <div className="message">
                    <div className="message-label">AI Assistant</div>

                    <div className="typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Bar */}
        <div className="input-wrapper">
          {isListening && (
            <div className="voice-listening-badge">
              <span className="red-dot"></span>
              <span>🔴 Listening... Speak into your microphone</span>
              <button
                type="button"
                className="stop-listening-btn"
                onClick={handleToggleVoiceInput}
              >
                Stop
              </button>
            </div>
          )}

          {selectedFile && (
            <div className="file-attachment-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">({selectedFile.sizeFormatted})</span>
              <button
                type="button"
                className="remove-file-btn"
                onClick={() => setSelectedFile(null)}
                title="Remove attachment"
              >
                ✕
              </button>
            </div>
          )}

          <form className="input-area" onSubmit={sendMessage}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt"
              style={{ display: "none" }}
            />

            <button
              type="button"
              className="attach-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Attach PDF or TXT file"
              aria-label="Attach PDF or TXT file"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <button
              type="button"
              className={`mic-button ${isListening ? "listening" : ""}`}
              onClick={handleToggleVoiceInput}
              disabled={loading}
              title={isListening ? "Listening... Click to stop" : "Voice input (Speech to text)"}
              aria-label={isListening ? "Listening... Click to stop" : "Voice input"}
            >
              {isListening ? (
                <span className="mic-listening-pulse" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </button>

            <textarea
              ref={textareaRef}
              placeholder={selectedFile ? "Ask something about this file..." : isListening ? "Listening to your voice..." : "Message AI Assistant..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows="1"
            />

            <button
              type="submit"
              disabled={loading || (!message.trim() && !selectedFile)}
              className="send-button"
              title="Send message (Enter)"
            >
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>

          <p className="input-hint">
            Press <strong>Enter</strong> to send · <strong>Shift + Enter</strong> for a new line · Attach <strong>.pdf</strong> or <strong>.txt</strong> (max 10MB)
          </p>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;