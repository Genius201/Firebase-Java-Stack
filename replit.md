# SetFlow - Comedian's Set Assistant

## Overview
A mobile app for comedians to manage their comedy sets, perform with a synced countdown timer and notes, record audio of performances, and receive AI-powered post-performance feedback.

## Architecture
- **Frontend**: Expo React Native with Expo Router (file-based routing), stack navigation (no tabs)
- **Backend**: Express.js with Gemini AI integration for feedback generation
- **Storage**: AsyncStorage for local persistence of sets and performances
- **AI**: Google Gemini via Replit AI Integrations for post-performance comedy coaching feedback

## Key Screens
- `app/index.tsx` - Home screen listing all comedy sets with create/edit/delete/perform actions
- `app/create-set.tsx` - Set builder with bits, notes, durations, reordering
- `app/perform.tsx` - Performance mode with large countdown timer, synced scrolling notes, audio recording
- `app/feedback.tsx` - Post-performance review with timing stats, audio playback, AI coaching feedback
- `app/history.tsx` - Performance history with recordings and feedback access

## Key Libraries
- `expo-audio` - Audio recording during performances and playback in review
- `expo-crypto` - UUID generation for sets, bits, performances
- `@expo-google-fonts/space-grotesk` + `@expo-google-fonts/jetbrains-mono` - Custom typography
- `expo-haptics` - Haptic feedback for interactions
- `react-native-reanimated` - Animations (timer pulse, note card transitions)
- `@google/genai` - Gemini AI integration for feedback

## Backend Endpoints
- `POST /api/feedback` - Analyzes set structure and returns AI coaching feedback

## Design
- Dark theme (navy/charcoal with amber gold accents)
- JetBrains Mono for timer display, Space Grotesk for UI text
- Comedy stage/spotlight aesthetic

## Environment Variables
- `AI_INTEGRATIONS_GEMINI_API_KEY` - Gemini API key (via Replit AI Integrations)
- `AI_INTEGRATIONS_GEMINI_BASE_URL` - Gemini base URL (via Replit AI Integrations)
- `SESSION_SECRET` - Session secret
