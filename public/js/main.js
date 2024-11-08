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
let unreadMessages = {}; // Store unread messages for each user

// Create user on button click
createUserBtn.addEventListener("click", () => {
    if (usernameInput.value.trim() !== "") {
        currentUser = usernameInput.value.trim();
        socket.emit("join-user", currentUser);
        usernameContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        loadMessages(); // Load saved messages from localStorage
    }
});

// Send message on button click
document.getElementById("send-message").addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message !== "" && activeChatWindow) {
        const recipient = activeChatWindow.getAttribute("data-recipient");
        socket.emit("chat-message", { user: currentUser, message, recipient });
        displayMessage(currentUser, message, recipient, "sent"); // Display sent message
        saveMessage(currentUser, message, recipient, "sent"); // Save the sent message to localStorage
        messageInput.value = ""; // Clear input
    }
});

// Display message in the correct chat window
const displayMessage = (user, message, recipient, messageType) => {
    const windowId = `${currentUser}-${recipient}`;
    const chatWindow = document.getElementById(windowId);

    if (chatWindow) {
        const li = document.createElement("li");
        li.textContent = `${user}: ${message}`;
        li.setAttribute("data-message", `${user}-${message}`);  // Store unique message identifier

        const classes = ["p-2", "rounded", "w-fit", "max-w-xs", "my-1"];
        if (messageType === "sent") {
            classes.push("bg-blue-300", "ml-auto");
        } else {
            classes.push("bg-green-300", "mr-auto");
        }

        li.classList.add(...classes);

        // Create delete button and add long press functionality
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.style.display = "none"; // Initially hide the delete button

        // Function to show delete button on long press
        let pressTimer;
        li.addEventListener("mousedown", () => {
            pressTimer = setTimeout(() => {
                deleteBtn.style.display = "inline-block"; // Show the delete button after 1 second
            }, 1000);
        });

        li.addEventListener("mouseup", () => {
            clearTimeout(pressTimer); // Cancel the long press if mouse is released
        });

        li.appendChild(deleteBtn);
        
        // When delete button is clicked
        deleteBtn.addEventListener("click", () => deleteMessage(user, message, recipient, li));
        
        chatWindow.querySelector(".messages").appendChild(li);
        chatWindow.querySelector(".messages").scrollTop = chatWindow.querySelector(".messages").scrollHeight;
    } else {
        // Store the message for later display if the window is not open
        if (!unreadMessages[recipient]) {
            unreadMessages[recipient] = [];
        }
        unreadMessages[recipient].push({ user, message });

        // Highlight the user in the sidebar with an unread message indicator
        const userElement = document.querySelector(`li[data-user="${recipient}"]`);
        if (userElement) {
            userElement.classList.add("unread-message");
        }
    }
};

// When the chat window is opened, display unread messages
const createChatWindow = (recipient) => {
    const windowId = `${currentUser}-${recipient}`;
    const chatWindow = document.createElement("div");
    chatWindow.id = windowId;
    chatWindow.classList.add("chat-window", "border", "rounded", "p-4", "bg-gray-50", "space-y-2");
    chatWindow.style.display = "none";
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

    // Check for any unread messages and display them
    if (unreadMessages[recipient]) {
        unreadMessages[recipient].forEach(msg => {
            displayMessage(msg.user, msg.message, recipient, msg.user === currentUser ? "sent" : "received");
        });

        // Clear the unread messages once displayed
        unreadMessages[recipient] = [];
    }

    // Load saved messages for this chat window from localStorage
    loadSavedMessages(recipient);

    return chatWindow;
};

// Delete message from chat window and localStorage
const deleteMessage = (user, message, recipient, messageElement) => {
    const savedMessages = JSON.parse(localStorage.getItem(`${currentUser}-${recipient}`)) || [];
    const updatedMessages = savedMessages.filter(msg => msg.user !== user || msg.message !== message);
    localStorage.setItem(`${currentUser}-${recipient}`, JSON.stringify(updatedMessages));
    messageElement.remove();
};

// Load saved messages for a user from localStorage
const loadSavedMessages = (recipient) => {
    const savedMessages = JSON.parse(localStorage.getItem(`${currentUser}-${recipient}`)) || [];
    savedMessages.forEach(msg => {
        displayMessage(msg.user, msg.message, recipient, msg.user === currentUser ? "sent" : "received");
    });
};

// Save message to localStorage
const saveMessage = (user, message, recipient, messageType) => {
    const savedMessages = JSON.parse(localStorage.getItem(`${currentUser}-${recipient}`)) || [];
    savedMessages.push({ user, message, messageType });
    localStorage.setItem(`${currentUser}-${recipient}`, JSON.stringify(savedMessages));
};

// Receive messages from the server
socket.on("chat-message", ({ user, message, recipient }) => {
    if ((recipient === currentUser || user === currentUser)) {
        const chatPartner = user === currentUser ? recipient : user;
        displayMessage(user, message, chatPartner, user === currentUser ? "sent" : "received");
        saveMessage(user, message, chatPartner, user === currentUser ? "sent" : "received"); // Save the message to localStorage
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
            li.setAttribute("data-user", user);

            // Add unread message indicator if there are unread messages
            if (unreadMessages[user] > 0) {
                li.classList.add("unread-message");
            }

            li.addEventListener("click", () => {
                if (activeChatWindow) {
                    activeChatWindow.style.display = "none";
                }
                activeChatWindow = document.getElementById(`${currentUser}-${user}`) || createChatWindow(user);
                activeChatWindow.style.display = "block";
                li.classList.remove("unread-message");
                unreadMessages[user] = 0; // Reset unread messages counter
            });

            allUsersList.appendChild(li);
        }
    }
});

