# GreenBuddy AI (React + Flask + Firestore + OpenWeather)

## Run it (works with zero setup)
Backend (Terminal 1):
    cd backend && python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cp .env.example .env
    python app.py            # http://localhost:5000
Frontend (Terminal 2):
    cd frontend && npm install && npm run dev    # http://localhost:5173

Without Firebase credentials the backend uses an in-memory store (data resets on restart).

## Turn on real services
1. Firestore: Firebase console > Project settings > Service accounts > Generate new private key.
   Save as backend/serviceAccountKey.json and keep FIREBASE_CREDENTIALS=serviceAccountKey.json in .env.
   Create the Firestore database (test mode is fine for the hackathon). Collections are created automatically.
   NEVER commit the key file (add it to .gitignore).
2. OpenWeather: free key from openweathermap.org, put it in OPENWEATHER_API_KEY. Without it the app uses demo weather.

## Deploy
Backend: Render/Railway, start command `gunicorn app:app`, set env vars (FIREBASE_CREDENTIALS_JSON = whole JSON).
Frontend: Vercel/Netlify, set VITE_API_URL to the backend URL.

## 3-minute demo script
1. Onboard as a new user: small, smoggy island, factory smoking.
2. Missions tab: tap demo weather "hot" -> missions change (AC, curtains). Switch to "rain" -> Rain Catcher.
3. Complete a mission: XP + coins + streak, level-up, free Oak Tree unlock, "First Step" badge.
4. EcoWorld: the island is greener and has the new tree.
5. Rewards: buy the Mango Tree. Impact: log footprint, run the solar estimator (earns the Solar Explorer badge).
6. League: leaderboard and community CO2 goal.

## Extra features (all in the Impact / League / Rewards tabs)
- Guides (Impact > Guides), friends leaderboard with friend codes, weekly XP competition with prizes (claim next week),
  team missions per college/neighbourhood, unlockable themes, level history, "Use my location" weather,
  and a high-electricity nudge (Appliance Audit gets added to today's missions when usage is 250+ kWh/month).

## Known limits (be upfront with judges)
- Identity is an anonymous ID stored in the browser. For real accounts, add Firebase Auth and verify the ID token in Flask.
- Missions are self-reported (server enforces once per mission per day, only today's generated missions).
- Reward updates are not wrapped in Firestore transactions; fine for a demo, add them for production.
- All CO2 / cost numbers are rough estimates and labelled as such.
- Weekly prizes only exist after a full week of play, so you can't demo them live; show the standings instead.
- Team = same college text (case/spacing ignored). Friends are added by code.
