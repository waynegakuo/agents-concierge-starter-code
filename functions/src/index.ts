/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {defineSecret} from 'firebase-functions/params';
import {enableFirebaseTelemetry} from '@genkit-ai/firebase';
import {googleAI} from '@genkit-ai/google-genai';
import {genkit, z} from 'genkit';
import {
  CONCIERGE_AGENT_PROMPT,
  DAY_TRIP_AGENT_PROMPT,
  FOODIE_AGENT_PROMPT,
  TRANSPORT_AGENT_PROMPT,
  WEEKEND_GUIDE_AGENT_PROMPT,
} from './system-prompt';
import {onCallGenkit} from 'firebase-functions/https';

// TODO: Define your Gemini API Key secret


// TODO: Enable Firebase telemetry logging


// TODO: Configure Genkit


// TODO: Configure Genkit Function Config


// TODO: Schema for conversation messages



// TODO: Convert history to Genkit format


// TODO: Define Agent Tool Logics


// TODO: Define Concierge Agent Logic & Flow

