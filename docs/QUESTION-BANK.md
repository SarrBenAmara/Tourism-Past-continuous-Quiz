# The question bank

The game ships with **36 original questions** for Cambridge Global English Stage 9, Unit 3: Tourism:

| Category | Questions | Content |
| --- | --- | --- |
| Reading Comprehension | 15 | Four short passages – *The Lost Passport*, *A Morning in Sidi Bou Said*, *Green Island Eco-Lodge*, *A Tour Guide's Diary* – with detail, vocabulary-in-context and inference questions |
| Grammar Challenge | 12 | Past continuous, past continuous passive, active vs passive, correct verb forms, finding the mistake, choosing the correct sentence |
| Tourism Vocabulary | 9 | Accommodation, itinerary, landmark, souvenir, ecotourism, vacancies, excursion… |

Every question has exactly four options, one correct answer and a short explanation shown after the reveal.

## Where it lives

* The master copy is the file `private-question-bank/tourism-unit3.json`. Keep it on your computer – it is **deliberately
  excluded from git** so the answer key never appears in the public repository or the website.
* After you **Import file → Save changes** in the app, the bank is stored in Firebase under `banks/<your teacher id>`,
  readable only by you.
* When a game starts, the chosen questions are copied into the room's private `hostData`, so editing the bank during a game
  does not disturb it.

## Editing in the app

Host Game → Question Bank:

* **Add question**, ✏️ edit, 🗑️ delete; choose the category, (for reading) the passage, the four options, tick the correct
  one, and write an explanation. Optional image URL for grammar/vocabulary questions (otherwise a Santorini postcard is shown).
* **Reading passages** section: add or edit passages. Leave an empty line between paragraphs.
* **Save changes** stores everything in Firebase. **Export file** downloads a JSON backup – keep it in
  `private-question-bank/`.

In the room setup you can choose which categories to play and whether to shuffle the order. Questions that share a passage
always stay together so the passage is read once.

## File format

```json
{
  "title": "Tourism Quiz Challenge – Unit 3",
  "passages": {
    "p1": { "title": "The Lost Passport", "text": "Paragraph one…\n\nParagraph two…" }
  },
  "questions": [
    {
      "id": "r1",
      "category": "reading",
      "passageId": "p1",
      "text": "What were Amira and her parents doing when…?",
      "options": ["…", "…", "…", "…"],
      "answer": 2,
      "explanation": "The text says…"
    },
    {
      "id": "g4",
      "category": "grammar",
      "text": "When we arrived at the hotel, the swimming pool ________.",
      "options": ["was cleaning", "is cleaned", "was being cleaned", "were cleaned"],
      "answer": 2,
      "explanation": "…past continuous passive = was being + past participle."
    }
  ]
}
```

* `category`: `reading`, `grammar` or `vocabulary`
* `answer`: 0 = A, 1 = B, 2 = C, 3 = D
* `passageId` (reading only) must match a key in `passages`
* `image` (optional): an `https://` picture URL

The app checks the file when you import it and tells you exactly which question has a problem.
