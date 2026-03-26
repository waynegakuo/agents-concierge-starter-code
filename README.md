# Agent Concierge - AI Assistant Codelab

Welcome to the **Agent Concierge** codelab! In this workshop, you will build a sophisticated AI-powered travel concierge using **Angular**, **Firebase Genkit**, and **Google Gemini**.

## Overview

In this workshop, you will build a **Concierge AI Assistant** — a multi-agent chatbot that helps users plan day trips, find restaurants, discover weekend activities, and navigate routes. The assistant is powered by **Google Gemini** via **Genkit AI**, deployed on **Firebase Cloud Functions**, and presented through a modern **Angular 21** frontend.

### What you'll build

By the end of this workshop you will have a fully working chat application that:

- Accepts natural language queries from the user
- Routes requests to specialised sub-agents (Day Trip, Foodie, Weekend Guide, Transport)
- Streams responses back to the Angular frontend
- Is deployable to Firebase Hosting + Cloud Functions

### Architecture overview

```
Angular Frontend (chat UI)
        │
        ▼
Firebase Cloud Function  ──── Concierge Agent (Genkit Flow)
                                     │
              ┌──────────────────────┼────────────────────────┐
              ▼                      ▼                         ▼                      ▼
     Day Trip Agent         Foodie Agent         Weekend Guide Agent    Transport Agent
     (Gemini + Search)    (Gemini + Search)      (Gemini + Search)    (Gemini + Search)
```

### What you'll learn

- How to structure a multi-agent system with **Genkit**
- How to define Genkit **tools** and **flows**
- How to integrate a Firebase Callable Function with an Angular service
- How to use Angular **signals** for reactive state management

---

## Prerequisites

- A **Google Cloud Project** with billing enabled.
- **Google Cloud Shell** access.
- **Firebase CLI** installed (available by default in Cloud Shell).
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).

---

## Step 1: Clone the Repository

Open your Google Cloud Shell and run the following command to clone the project. This downloads the starter code — a pre-built Angular app with placeholder `// TODO` markers where you will add the AI logic throughout this workshop.

```bash
git clone https://github.com/waynegakuo/agent-concierge-starter-code.git
cd agent-concierge-starter-code
```

## Step 2: Environment Setup

Install the Angular CLI globally and the project dependencies. The `--force` flag is used to resolve any peer-dependency version conflicts that may arise between packages.

```bash
# Install Angular CLI globally
npm install -g @angular/cli

# Install dependencies (using --force to handle potential version conflicts)
npm install --force
```

The `functions` directory has its own `package.json` and its own set of dependencies (Genkit, Firebase Functions, etc.) that are separate from the root project. You need to install those too:

```bash
# Navigate into the functions directory and install its dependencies
cd functions
npm install --force

# Go back to the project root
cd ..
```

## Step 3: Firebase Project Setup

### 3.1 Create a Firebase Project

Before anything else, you need a Firebase project to host your functions and frontend.

1. **Open Firebase Console** — Navigate to [Firebase Console](https://console.firebase.google.com/)
2. **Create New Project**
   - Click **"Create a new Firebase project"**
   - Enter a project name (e.g., **"agent-concierge"** or your preferred name)
   - Google Analytics is optional — you can skip it for this workshop
   - Click **"Create project"** and wait for it to be provisioned

### 3.2 Enable Billing

Firebase Cloud Functions and Secret Manager require billing to be enabled on your Google Cloud project. You must do this before proceeding, otherwise later steps (deploying functions and storing secrets) will fail.

1. In the [Firebase Console](https://console.firebase.google.com/), select your newly created project.
2. In the bottom-left corner, click on your current plan (e.g., **"Spark"**) → **"Upgrade"**.
3. Select the **Blaze (pay-as-you-go)** plan.
4. Choose your billing account (or **"Google Cloud Platform Trial Billing Account"** if available).
5. Set a budget alert (e.g., **$2 USD**) to avoid unexpected charges.
6. Click **"Link Cloud Billing Account"** to confirm.

> **Note:** The Blaze plan is pay-as-you-go, but Firebase offers a generous free tier. For a workshop project of this scale, you are very unlikely to incur any charges.

### 3.3 Initialize Firebase

Back in your Google Cloud Shell, while in the project's directory, log in to Firebase using the `--no-localhost` flag, which is required in Cloud Shell because there is no browser available to complete the standard OAuth redirect. This command will print a URL — open it in your local browser, authenticate, and paste the resulting code back into the terminal.

```bash
firebase login --no-localhost
```

### 3.4 Configure `.firebaserc`

The `.firebaserc` file tells the Firebase CLI which Firebase project to target when you run commands like `firebase deploy`. Replace `YOUR_PROJECT_ID` with the actual project ID from your [Firebase Console](https://console.firebase.google.com/).

**File:** `.firebaserc`
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

### 3.5 Configure Firebase Environment

The Angular app reads your Firebase project configuration from the environment file. This is how AngularFire knows which Firebase project to connect to when making calls to Cloud Functions.

#### Register your web app

Before you can copy the config values, you need a web app registered in your Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/) and select your project.
2. On the sidebar, click the gear icon (⚙️) below "Project Overview" → **"Settings"**.
3. Select 'General' and scroll down to the **"Your apps"** section.
4. If you don't have a web app yet, click **"Add app"** → Web icon (`</>`).
5. Give your app a name (e.g., **"Agent Concierge Web App"**).
6. Check the **"Firebase Hosting"** box.
7. Click **"Register app"**.

Once registered, Firebase will display your app's SDK configuration snippet. Open `src/environments/environment.development.ts` and replace the placeholder values with the real values shown under **"SDK setup and configuration"**.

**File:** `src/environments/environment.development.ts`
```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  },
};
```

### 3.6 Enable Required APIs

Before setting up your API key, you need to enable the Secret Manager API in your Google Cloud project. This API is what allows Firebase Functions to securely store and retrieve your Gemini API key at runtime.

1. **Go to Google Cloud Console:**
   - Visit the [Google Cloud Console](https://console.cloud.google.com/)
   - Make sure your Firebase project is selected in the project dropdown
   - Click on "Dashboard" to see the project's overview page
2. **Enable the Secret Manager API:**
   - In the left sidebar, go to "APIs & Services" > "Library"
   - Search for "Secret Manager API"
   - Click on it and press "Enable"

> **Note:** Other APIs (Cloud Functions, etc.) are automatically enabled when you deploy Firebase Functions.

### 3.7 Set up Gemini API Key

Rather than hard-coding your API key in source code (which would be a security risk), you store it as a **Firebase Secret**. Firebase Functions will automatically inject it as an environment variable at runtime, keeping it out of your codebase entirely.

```bash
firebase functions:secrets:set GEMINI_API_KEY
```
*(When prompted, paste your API key from [Google AI Studio](https://aistudio.google.com/api-keys))*

---

## Step 4: Implementing the Backend (Firebase Functions & Genkit)

Navigate to `functions/src/index.ts`. You will find several `// TODO` markers. Copy and paste the following snippets into their respective locations.

### TODO: Define your Gemini API Key secret

This tells Firebase Functions that your function requires the `GEMINI_API_KEY` secret. At runtime, Firebase will securely inject the secret's value as an environment variable, making it available via `process.env.GEMINI_API_KEY`.

```typescript
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
```

### TODO: Enable Firebase telemetry logging

This enables Genkit's built-in integration with Firebase's observability tools (Cloud Logging and Cloud Trace), so you can monitor your AI flows, inspect inputs/outputs, and debug issues directly in the Google Cloud Console.

```typescript
enableFirebaseTelemetry();
```

### TODO: Configure Genkit

This initializes the Genkit AI framework with the Google AI plugin, which provides access to Gemini models. The `model` field sets `gemini-3.1-flash-lite-preview` as the default model used for all `ai.generate()` calls unless overridden. The `ai` object is your main entry point for defining flows, tools, and generating responses.

```typescript
const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  model: googleAI.model('gemini-3.1-flash-lite-preview'),
});
```

### TODO: Configure Genkit Function Config

This configuration object is passed to every Firebase Cloud Function that wraps a Genkit flow. It does three things:
- **`secrets`** — grants the function access to the `GEMINI_API_KEY` secret at runtime.
- **`region`** — deploys the function to `africa-south1` for lower latency if your users are in Africa (change this to the region closest to your users).
- **`cors: true`** — allows the Angular frontend (running on a different origin) to call the function directly from the browser.

```typescript
const GENKIT_FUNCTION_CONFIG = {
  secrets: [GEMINI_API_KEY],
  region: 'africa-south1',
  cors: true, 
};
```

### TODO: Schema for conversation messages

Zod schemas define the shape of data flowing in and out of your Genkit flows and tools. Here you define a `conversationMessageSchema` that represents a single chat message with a `role` (either `'user'` or `'model'`) and a `content` string. The `ConversationMessage` TypeScript type is then inferred directly from the schema, keeping your types and runtime validation in sync.

```typescript
const conversationMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

type ConversationMessage = z.infer<typeof conversationMessageSchema>;
```

### TODO: Convert history to Genkit format

Genkit's `ai.generate()` expects messages in a specific format where each message's content is an array of parts (e.g., `[{ text: '...' }]`). This helper function converts your flat `ConversationMessage[]` history array (coming from the frontend) into that Genkit-compatible structure, so you can pass the full conversation context to the model.

```typescript
function toGenkitMessages(history: ConversationMessage[]) {
  return history.map((msg) => ({
    role: msg.role as 'user' | 'model',
    content: [{text: msg.content}],
  }));
}
```

### TODO: Define Agent Tool Logics

Each sub-agent is defined as a **Genkit tool** using `ai.defineTool()`. A tool is a callable unit that the parent (Concierge) agent can invoke when it decides the query matches that tool's responsibility. Each tool:

- Has a **`name`** and **`description`** that the Concierge Agent's LLM reads to decide which tool to call.
- Accepts an **`input`** string (the user's query) and an optional **`history`** array (the conversation so far).
- Calls `ai.generate()` with a **system prompt** specific to that agent's domain and enables **`googleSearchRetrieval`** so the model can ground its answers with live web search results.
- Returns the model's text response as a plain string.

```typescript
export const _dayTripAgentToolLogic = ai.defineTool(
  {
    name: 'dayTripAgentTool',
    description: 'Assists with planning day trips',
    inputSchema: z.object({
      input: z.string(),
      history: z.array(conversationMessageSchema).optional(),
    }),
    outputSchema: z.string(),
  },
  async ({input, history}) => {
    const response = await ai.generate({
      system: DAY_TRIP_AGENT_PROMPT,
      messages: [
        ...toGenkitMessages(history ?? []),
        {role: 'user', content: [{text: input}]},
      ],
      config: { googleSearchRetrieval: {} },
    });
    return response.text;
  }
);

export const _foodieAgentToolLogic = ai.defineTool(
  {
    name: 'foodieAgentTool',
    description: "Assist with finding the best restaurants",
    inputSchema: z.object({
      input: z.string(),
      history: z.array(conversationMessageSchema).optional(),
    }),
    outputSchema: z.string(),
  },
  async ({input, history}) => {
    const response = await ai.generate({
      system: FOODIE_AGENT_PROMPT,
      messages: [
        ...toGenkitMessages(history ?? []),
        {role: 'user', content: [{text: input}]},
      ],
      config: { googleSearchRetrieval: {} },
    });
    return response.text;
  }
);

export const _weekendGuideAgentToolLogic = ai.defineTool(
  {
    name: 'weekendGuideAgentTool',
    description: 'Assists in finding interesting events and activities',
    inputSchema: z.object({
      input: z.string(),
      history: z.array(conversationMessageSchema).optional(),
    }),
    outputSchema: z.string(),
  },
  async ({input, history}) => {
    const response = await ai.generate({
      system: WEEKEND_GUIDE_AGENT_PROMPT,
      messages: [
        ...toGenkitMessages(history ?? []),
        {role: 'user', content: [{text: input}]},
      ],
      config: { googleSearchRetrieval: {} },
    });
    return response.text;
  }
);

export const _findAndNavigateAgentToolLogic = ai.defineTool(
  {
    name: 'findAndNavigateAgentTool',
    description: 'Assists with finding the best routes and transportation',
    inputSchema: z.object({
      input: z.string(),
      history: z.array(conversationMessageSchema).optional(),
    }),
    outputSchema: z.string(),
  },
  async ({input, history}) => {
    const response = await ai.generate({
      system: TRANSPORT_AGENT_PROMPT,
      messages: [
        ...toGenkitMessages(history ?? []),
        {role: 'user', content: [{text: input}]},
      ],
      config: { googleSearchRetrieval: {} },
    });
    return response.text;
  }
);
```

### TODO: Define Concierge Agent Logic & Flow

This is the **orchestrator** — the top-level agent that receives every user message and decides which sub-agent tool to delegate to. It is defined as a **Genkit flow** using `ai.defineFlow()`, which makes it callable and traceable.

- The flow passes the user's message and conversation history to the model along with the `CONCIERGE_AGENT_PROMPT` (which instructs it to act as a router).
- The `tools` array registers all four sub-agent tools. The LLM will automatically call the appropriate tool based on the user's intent.
- `onCallGenkit()` wraps the flow as a **Firebase HTTPS Callable Function**, applying the shared config (secrets, region, CORS) and exposing it as the `conciergeAgentFlow` endpoint that the Angular frontend will call.

```typescript
export const _conciergeAgentLogic = ai.defineFlow(
  {
    name: 'conciergeAgentFlow',
    inputSchema: z.object({
      input: z.string(),
      history: z.array(conversationMessageSchema).optional(),
    }),
    outputSchema: z.string(),
  },
  async ({input, history}) => {
    const response = await ai.generate({
      system: CONCIERGE_AGENT_PROMPT,
      messages: [
        ...toGenkitMessages(history ?? []),
        {role: 'user', content: [{text: input}]},
      ],
      tools: [
        _dayTripAgentToolLogic,
        _foodieAgentToolLogic,
        _weekendGuideAgentToolLogic,
        _findAndNavigateAgentToolLogic,
      ],
    });
    return response.text || response.output;
  }
);

export const conciergeAgentFlow = onCallGenkit(GENKIT_FUNCTION_CONFIG, _conciergeAgentLogic);
```

---

## Step 5: Implementing the Frontend (Angular AI Service)

Navigate to `src/app/services/ai/ai.service.ts`.

### TODO: Define the AI service and its methods

This Angular service is the bridge between the chat UI and your Firebase Cloud Function. Here is what each part does:

- **`inject(Functions)`** — uses Angular's `inject()` function to get the AngularFire `Functions` instance, which is pre-configured with your Firebase project settings from `app.config.ts`.
- **`httpsCallable()`** — creates a typed callable reference to the `conciergeAgentFlow` Cloud Function by name. This is the same name you gave the flow in `index.ts`.
- **`from()`** — wraps the `Promise` returned by the callable into an RxJS `Observable`, so the chat component can subscribe to it reactively.
- The method accepts the current user `input` and the full `history` array, forwarding both to the backend so the model has conversation context.

```typescript
import { inject, Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { from, Observable } from 'rxjs';
import { ConversationMessage } from '../../models/chat.model';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private functions = inject(Functions);

  sendMessage(input: string, history: ConversationMessage[]): Observable<any> {
    const conciergeAgentFlow = httpsCallable<any, any>(
      this.functions,
      'conciergeAgentFlow'
    );
    return from(conciergeAgentFlow({ input, history }));
  }
}
```

---

## Step 6: Updating the UI

Navigate to `src/app/app.html`.

### TODO: Replace all contents with the Chat component reference

The root `app.html` template is the entry point of your Angular application. Replace all the existing placeholder content with a single reference to the `<app-chat>` component. This component (already built in the starter code) renders the full chat interface — the message list, input field, and send button — and wires up to the `AiService` you implemented in Step 5.

```html
<app-chat />
```

---

## Step 7: Deployment

Finally, deploy your application to Firebase.

- **`ng build`** compiles the Angular application into optimised static assets (HTML, CSS, JS bundles) and outputs them to the `dist/` folder, ready to be served by Firebase Hosting.
- **`firebase deploy`** uploads both the compiled frontend to Firebase Hosting and the Cloud Functions code to Firebase Functions in a single command.

```bash
# Build the Angular application
ng build

# Deploy to Firebase
firebase deploy
```

Once deployed, your concierge assistant is live! 🎉
