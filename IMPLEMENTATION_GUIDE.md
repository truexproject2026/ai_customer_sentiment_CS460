# 📘 AI Sentiment & Auto-Reply: Technical Guide

This guide explains how the system works and how to maintain its high-performance AI capabilities.

## 🛠 Prerequisites & Setup

### 1. API Keys
The system requires a **Groq API Key** for the Llama 3.3 model.
- Create a key at [console.groq.com](https://console.groq.com/).
- Add it to your `.env.local` file:
  ```env
  GROQ_API_KEY=your_key_here
  ```

### 2. Dependencies
```bash
npm install
```

---

## 🧠 How the AI Engine Works

### 1. Request Flow
1. **Frontend** sends a customer comment and a `venueId` to `/api/auto-reply`.
2. **Backend** fetches the brand's personality and RAG examples from `data/brand-config.json`.
3. **LLM Prompting:** A structured prompt is built containing:
   - **System Role:** Professional admin with empathy.
   - **Brand Context:** Personality, Tone, and Area.
   - **RAG Examples:** 5 similar past review-reply pairs.
   - **Customer Input:** The new review to analyze.
4. **Processing:** Llama 3.3 (70B) generates a JSON response.
5. **Sanitization:** The `enforceReplyStyle` function cleans the text (e.g., ensuring polite Thai particles).

### 2. RAG (Retrieval-Augmented Generation)
The RAG system ensures the AI stays "on-brand" by looking at historical data:
- **Storage:** Data is kept in `data/brand-config.json` under `brands[venueId].examples`.
- **Retrieval:** When a review comes in, the system retrieves these examples to show the AI how this specific brand usually responds.

### 3. Fallback Mechanism
If Groq API fails or returns an error:
- The system switches to `lib/trainingDataset.ts`.
- Uses a local keyword-based sentiment analyzer.
- Generates a template-based reply from the local dataset.

---

## 🏢 Brand Management

### Adding a New Brand
1. **Define the Identity:** Add a new entry in `data/brand-list.json`:
   ```json
   {
     "id": "new-shop",
     "name": "New Shop Name",
     "area": "Siam",
     "tagline": "The best place for X",
     "personality": "Professional yet friendly",
     "tone": "Warm and helpful",
     "keywords": ["pizza", "pasta"]
   }
   ```
2. **Initialize the Brain:** Add a matching entry in `data/brand-config.json` with at least 3-5 example review/reply pairs.

---

## 🖥 Dashboard Features

### Knowledge Base (AI Training)
You can train the AI in real-time:
- Open the **"สอนงาน AI"** modal in the dashboard.
- Add a Review and its "Ideal Reply".
- This data is saved instantly to the RAG database, making the AI smarter for the next similar review.

### Dataset Management
- **Hugging Face:** Fetches real reviews from the Wongnai dataset.
- **Custom Upload:** Upload a CSV or JSON file containing `review_body` to test the AI on your own business data.

---

## 🔧 Troubleshooting

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| AI returns "Error" | API Key missing or expired | Check `.env.local` and Groq console. |
| Reply tone is wrong | Weak RAG data | Add better examples via the "สอนงาน AI" modal. |
| Wrong brand selected | Keyword mismatch | Update the `keywords` array in `brand-list.json`. |
| UI not updating | Cache issue | Refresh the page; the dashboard uses `useState` for results. |

---

## 📝 API Endpoints

- `POST /api/auto-reply`: Core analysis engine.
- `GET /api/brand-profiles`: List all active brands.
- `POST /api/knowledge-base`: Add a new training example.
- `GET /api/dataset-manager`: Fetch reviews from various sources.
