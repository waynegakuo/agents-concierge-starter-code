import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {environment} from '../environments/environment.development';
import {initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {getFunctions, provideFunctions} from '@angular/fire/functions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFunctions(() => {
      const app = initializeApp(environment.firebaseConfig)
      return getFunctions(app, 'africa-south1');
    })
  ]
};
