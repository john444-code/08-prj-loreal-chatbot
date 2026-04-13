const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");

const WORKER_URL =
  (typeof WORKER_URL !== "undefined" ? WORKER_URL : null) ||
  window.WORKER_URL ||
  "";

const systemPrompt = `You are a helpful L'Oréal product advisor. Only answer questions related to L’Oréal products, beauty routines, skincare, haircare, makeup, fragrances, and personalized recommendations. If a user asks about unrelated topics, politely explain that you can only help with L’Oréal beauty products and routines. Keep responses friendly, professional, and focused on L'Oréal.`;

const messages = [{ role: "system", content: systemPrompt }];

function createMessageElement(role, text) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}`;

  const labelEl = document.createElement("div");
  labelEl.className = "message-label";
  labelEl.textContent = role === "user" ? "You" : "L’Oréal Advisor";

  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.textContent = text;

  messageEl.append(labelEl, textEl);
  return messageEl;
}

function addChatMessage(role, text) {
  const bubble = createMessageElement(role, text);
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updateLatestQuestion(question) {
  if (!question) {
    latestQuestion.classList.add("hidden");
    latestQuestion.textContent = "";
    return;
  }

  latestQuestion.textContent = `Latest question: ${question}`;
  latestQuestion.classList.remove("hidden");
}

function setLoadingState(isLoading) {
  userInput.disabled = isLoading;
  chatForm.querySelector("button").disabled = isLoading;
}

async function sendMessage(userText) {
  if (!WORKER_URL) {
    throw new Error(
      "Cloudflare Worker URL is not set. Please add WORKER_URL to secrets.js.",
    );
  }

  messages.push({ role: "user", content: userText });
  updateLatestQuestion(userText);
  addChatMessage("user", userText);
  setLoadingState(true);

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Worker request failed with status ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data?.choices?.[0]?.message?.content?.trim();

    if (!assistantText) {
      throw new Error("No assistant response returned from Cloudflare Worker.");
    }

    messages.push({ role: "assistant", content: assistantText });
    addChatMessage("assistant", assistantText);
  } catch (error) {
    console.error(error);
    addChatMessage(
      "assistant",
      "Sorry, I couldn’t connect to the L’Oréal assistant right now. Please try again in a moment.",
    );
  } finally {
    setLoadingState(false);
  }
}

function initializeChat() {
  chatWindow.innerHTML = "";
  updateLatestQuestion("");
  addChatMessage(
    "assistant",
    "Bonjour! I’m your L’Oréal product advisor. Ask me about products, routines, skincare, haircare, makeup, or fragrances.",
  );
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) return;

  userInput.value = "";
  try {
    await sendMessage(userText);
  } catch (error) {
    addChatMessage(
      "assistant",
      "The chatbot is not ready yet. Please add your deployed Cloudflare Worker URL to secrets.js.",
    );
  }
});

initializeChat();
