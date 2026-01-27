# INDREESH MEDIA Finance Manager

A comprehensive finance management system for INDREESH MEDIA LLP with GST invoicing, receipt management, party ledgers, and more.

## Features

- 📊 **Master Sheet** - Campaign management with Excel upload support
- 🧾 **Invoice Generation** - Individual and combined invoicing with GST calculation
- 💰 **Receipt Management** - Record payments with TDS and discount tracking
- 📚 **Party Ledgers** - Complete debit/credit tracking per party
- 📈 **Reports** - Financial summaries and analytics
- 🔐 **Role-based Access** - Finance Team and Director roles
- ☁️ **Cloud Sync** - Firebase Firestore for data persistence

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Firebase Firestore
- **Deployment**: Vercel
- **Styling**: Inline CSS
- **Icons**: Lucide React

## Deployment to Vercel

### Prerequisites

1. A GitHub account
2. A Vercel account (free at vercel.com)
3. Firebase project (already configured)

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Framework Preset: Vite
   - Click "Deploy"

3. **That's it!** Vercel will automatically build and deploy your app.

## Firebase Setup

The app uses Firebase Firestore for data persistence. The configuration is already set up in `src/firebase.js`.

### Firestore Security Rules

Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /appState/{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Note**: These are permissive rules for development. For production, implement proper authentication.

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Finance Team | finance | finance123 |
| Director | director | director123 |

## Role Permissions

### Finance Team
- Upload Excel sheets
- Change amounts and emails
- Create invoices
- Create receipts and credit notes
- Send emails
- Delete invoices
- Access settings

### Director
- Upload Excel sheets
- Mark Bill? (Yes/Not Yet)
- Change amounts and emails
- **Approve/Reject invoices**
- Add remarks
- View-only access to Invoice Register and Ledgers

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
finance-vercel-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # Main application component
│   ├── firebase.js      # Firebase configuration
│   └── main.jsx         # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Support

For issues or questions, please contact the development team.

---

© 2025 INDREESH MEDIA LLP. All rights reserved.
