# MyAI Chat 

A clean, fast AI chat app I built from scratch. No templates, no boilerplate — just a straightforward conversation interface powered by Groq's lightning-fast API.

**Try it live →** [myai-chat-sepia.vercel.app](https://myai-chat-sepia.vercel.app/)

---

## What it does

You type, the AI responds. Simple as that. But under the hood there's a lot going on:

- **Real-time streaming** — responses appear word by word, not all at once
- **Multiple conversations** — create, rename, delete, and switch between chats
- **Edit & resend** — made a typo? edit any message and get a fresh response
- **Regenerate** — don't like the answer? hit regenerate
- **Image & PDF uploads** — attach files and the AI can see them
- **Markdown rendering** — code blocks, tables, lists — all formatted properly
- **Text-to-speech** — let the AI read responses out loud
- **Dark / Light theme** — easy on the eyes, day or night
- **Export chats** — download any conversation as a text file
- **Persistent history** — your chats survive browser refreshes

## Tech stack

- **React** + **Vite** — fast dev, fast builds
- **Groq API** — runs Llama models at insane speed
- **Vanilla CSS** — no Tailwind, no UI libraries, just clean styles
- **Vercel** — deployed in seconds

## Run it locally

```bash
git clone https://github.com/saudmemon/myai-chat.git
cd myai-chat
npm install
```

Create a `.env` file in the root:

```
VITE_GROQ_API_KEY=your_groq_api_key_here
```

Get a free API key from [console.groq.com](https://console.groq.com/keys), then:

```bash
npm run dev
```

That's it. Open `http://localhost:5173` and start chatting.

## Author

Built by **Saud Memon**

---

If you found this useful, drop a ⭐ on the repo. It means a lot.
