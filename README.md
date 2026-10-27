# Riwaaj Ledger (Digital Kashmiri Gift Notebook)

**Riwaaj Ledger** is a modern, digital version of a traditional Kashmiri marriage gift notebook (*Vartan / Khatabandi*). It combines the minimalism of a smartphone's Contacts application with a clean, double-entry gift ledger.

---

## 🌟 Core Highlights

- **Contacts Experience**: Opens directly to **My People**—an alphabetically sorted contacts list with live search across name, phone number, and Mohalla / locality.
- **Dedicated Person Ledger (`/people/[personId]`)**: Click any contact to view their complete gift history.
- **Strict Alternating Row Colors**: Traditional ledger table readability with alternating rows (`odd` white/ivory and `even` light green/grey).
- **Custom Occasion Support**: Free-text entry allows any custom occasion name (*Shadi Mubarak*, *Mehndi Raat*, *Wazwan Mubarak*, *Badam Packet*, etc.) with optional quick suggestions.
- **Gift Accounting**:
  - **Debit**: Money **we gave them** (e.g. attended their wedding and presented ₹1,000).
  - **Credit**: Money **they gave us** (e.g. they attended our wedding and presented ₹1,500).
  - **Net Balance**: `Total Credit - Total Debit`.
    - Positive: *"They gave us ₹X more."*
    - Negative: *"We gave them ₹X more."*
    - Zero: *"Hisab Barabar (₹0 Difference)"*.
- **Non-Cash Physical Gifts**: Track packets of almonds (*Badam*), toffee boxes, dry fruit packets, or household gifts with quantities and units without affecting cash balance totals.
- **Multi-Year Filter**: Filter transactions by year (dynamically generated from actual records) or view all-time totals.
- **Print & CSV Export**: One-click printable ledger stylesheet and CSV export.
- **Private Accounts & Security**: Strict user-level Firestore security rules (`firestore.rules`). No shared family ledgers—every account is strictly scoped to `users/{uid}`.
- **Dual Mode**: Connects directly to Firebase Authentication & Cloud Firestore when credentials are provided in `.env.local`, with an instant Sandbox Mode for offline testing.

---

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend / Database**: [Google Firebase Authentication](https://firebase.google.com/products/auth) & [Cloud Firestore](https://firebase.google.com/products/firestore)
- **Accounting Engine**: Integer paise arithmetic (`100,000 paise = ₹1,000`) to eliminate floating point rounding inaccuracies.

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js `v20+` or `v24+`
- npm `v10+`

### 2. Installation

Clone or open the project folder, then install dependencies:

```bash
npm install
```

### 3. Environment Variables (Firebase Setup)

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Firebase web app configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Note on Sandbox Mode**: If `.env.local` is omitted, the app will safely run in **Sandbox / Local Evaluation Mode**. You can immediately create contacts, record custom gifts, and test all calculations locally without any crashes!

### 4. Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

Run the automated verification suite to test calculations, sorting, and edge cases:

```bash
npm test
```

The test runner validates:
1. **Alphabetical Sorting**: Accurate locale-aware case-insensitive ordering (`Ahmad Dar` → `Faizan Bhat` → `Manik Sharma` → `Sneha Sharma`).
2. **Gift Calculation Engine**: Correct Total Debit, Total Credit, and Net Balance with integer paise precision.
3. **Custom Occasion Flexibility**: Free-text occasion names.
4. **Non-Cash Physical Gifts**: Verifies badam packets do not contaminate cash debit/credit totals.
5. **Edit & Delete**: Automatic recalculation of net balances upon modifying or removing an entry.
6. **Dynamic Year Filter**: Historical filtering by year.

---

## 🔒 Firestore Security Rules

Deploy security rules to Firebase using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Rules guarantee that unauthenticated users cannot read or write data, and authenticated users can strictly only access documents under `users/$(request.auth.uid)`.

---

## 📦 Production Build

```bash
npm run build
npm start
```

Deployable to **Vercel** with zero extra configuration. Just add your Firebase environment variables in your Vercel Project Settings.
