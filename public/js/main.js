const createUserBtn = document.getElementById("create-user");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const chatContainer = document.getElementById("chat-container");
const usernameContainer = document.getElementById("username-container");
const allUsersList = document.getElementById("allusers");
const chatWindows = document.getElementById("chat-windows");
const socket = io();
let currentUser;
let activeChatWindow = null;

// Create user on button click
createUserBtn.addEventListener("click", () => {
    if (usernameInput.value.trim() !== "") {
        currentUser = usernameInput.value.trim();
        socket.emit("join-user", currentUser);
        usernameContainer.style.display = 'none';
        chatContainer.style.display = 'block';
    }
});

// Send message on button click
document.getElementById("send-message").addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message !== "" && activeChatWindow) {
        const recipient = activeChatWindow.getAttribute("data-recipient");
        socket.emit("chat-message", { user: currentUser, message, recipient });
        displayMessage(currentUser, message, recipient, "sent"); // Display sent message
        messageInput.value = ""; // Clear input
    }
});

// Display message in the chat window
const displayMessage = (user, message, recipient, messageType) => {
    if (activeChatWindow) {
        let chatWindow = activeChatWindow;

        const li = document.createElement("li");
        li.textContent = `${user}: ${message}`;

        // Correctly add classes for message type
        const classes = ["p-2", "rounded", "w-fit", "max-w-xs", "my-1"];
        if (messageType === "sent") {
            classes.push("bg-blue-300", "ml-auto");  // Sent messages
        } else {
            classes.push("bg-green-300", "mr-auto"); // Received messages
        }
        
        li.classList.add(...classes); // Apply all classes dynamically

        chatWindow.querySelector(".messages").appendChild(li);
        chatWindow.querySelector(".messages").scrollTop = chatWindow.querySelector(".messages").scrollHeight; // Auto-scroll to latest message
    }
};

// Create a new chat window dynamically
const createChatWindow = (recipient) => {
    const windowId = `${currentUser}-${recipient}`;
    const chatWindow = document.createElement("div");
    chatWindow.id = windowId;
    chatWindow.classList.add("chat-window", "border", "rounded", "p-4", "bg-gray-50", "space-y-2");
    chatWindow.style.display = "none"; // Initially hidden
    chatWindow.setAttribute("data-recipient", recipient);

    const title = document.createElement("h3");
    title.classList.add("font-semibold", "text-lg");
    title.textContent = `Chat with ${recipient}`;
    chatWindow.appendChild(title);

    const messagesDiv = document.createElement("div");
    messagesDiv.classList.add("chat-box", "border", "rounded", "mb-2", "p-4", "h-80", "overflow-y-scroll");
    messagesDiv.innerHTML = '<ul class="messages space-y-2"></ul>';
    chatWindow.appendChild(messagesDiv);

    chatWindows.appendChild(chatWindow);
    return chatWindow;
};

// Receive messages from server
socket.on("chat-message", ({ user, message, recipient }) => {
    if (recipient === "everyone" || recipient === currentUser || user === currentUser) {
        displayMessage(user, message, recipient, user === currentUser ? "sent" : "received");
    }
});

// Update user list in the sidebar and add click event
socket.on("joined", (allusers) => {
    allUsersList.innerHTML = '';
    for (const user in allusers) {
        if (user !== currentUser) {
            const li = document.createElement("li");
            li.textContent = user;
            li.classList.add("cursor-pointer", "hover:bg-gray-200", "p-2", "rounded");
            
            // Add click event to open chat window
            li.addEventListener("click", () => {
                if (activeChatWindow) {
                    activeChatWindow.style.display = "none";
                }
                activeChatWindow = document.getElementById(`${currentUser}-${user}`) || createChatWindow(user);
                activeChatWindow.style.display = "block";
            });

            allUsersList.appendChild(li);
        }
    }
});
