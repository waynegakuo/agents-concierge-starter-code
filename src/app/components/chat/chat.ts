import {AfterViewChecked, Component, ElementRef, inject, signal, ViewChild} from '@angular/core';
import {AiService} from '../../services/ai/ai.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {ConversationMessage, Message, WelcomeCapability} from '../../models/chat.model';
import {finalize} from 'rxjs';
import {MarkdownUtils} from '../../utils/markdown-utils';

@Component({
  selector: 'app-chat',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements AfterViewChecked {
  private readonly aiService = inject(AiService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;
  private shouldScrollToBottom = false;

  messages = signal<Message[]>([]);
  conversationHistory = signal<ConversationMessage[]>([]);
  isLoading = signal(false);
  queryControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  // Welcome message content
  readonly welcomeTitle = "Welcome! I'm your Concierge AI Assistant";
  readonly welcomeDescription = "I can help you with a variety of things to make your planning easier! Here's a quick rundown of what I can do:";
  readonly welcomeFooter = "Just let me know what you need help with!";
  readonly welcomeCapabilities: WelcomeCapability[] = [
    {
      icon: '🗺️',
      title: 'Plan Day Trips:',
      description: 'I can assist you in planning exciting day trips.'
    },
    {
      icon: '🍽️',
      title: 'Find Restaurants:',
      description: 'Looking for the best places to eat? I can help you find restaurants based on your preferences.'
    },
    {
      icon: '🎉',
      title: 'Discover Weekend Activities:',
      description: "If you're wondering what to do on a specific weekend, I can help you find interesting events, concerts, festivals, and other activities."
    },
    {
      icon: '🚗',
      title: 'Navigate and Find Routes:',
      description: 'I can assist you with finding the best routes and transportation options to get you where you need to go.'
    }
  ];

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(): void {
    const query = this.queryControl.value.trim();
    if (!query || this.isLoading()) return;

    // Add user message
    this.messages.update((msgs) => [
      ...msgs,
      { text: query, sender: 'user', timestamp: new Date() },
    ]);

    // Snapshot history before adding the new user message
    const historySnapshot = this.conversationHistory();

    // Append user turn to history
    this.conversationHistory.update((h) => [...h, { role: 'user', content: query }]);

    this.queryControl.reset();
    this.isLoading.set(true);
    this.shouldScrollToBottom = true;

    this.aiService
      .sendMessage(query, historySnapshot)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.shouldScrollToBottom = true;
        })
      )
      .subscribe({
        next: (response: {data: string}) => {
          this.messages.update((msgs) => [
            ...msgs,
            {
              text: response.data,
              formattedText: this.formatMarkdown(response.data),
              sender: 'ai',
              timestamp: new Date(),
            },
          ]);
          // Append AI turn to history
          this.conversationHistory.update((h) => [...h, { role: 'model', content: response.data }]);
          this.shouldScrollToBottom = true;
        },
        error: (err) => {
          console.error('Error sending message:', err);
          const errorText = 'Sorry, something went wrong. Please try again.';
          this.messages.update((msgs) => [
            ...msgs,
            {
              text: errorText,
              formattedText: this.formatMarkdown(errorText),
              sender: 'ai',
              timestamp: new Date(),
            },
          ]);
          this.shouldScrollToBottom = true;
        },
      });
  }

  private scrollToBottom(): void {
    if (this.messageList?.nativeElement) {
      this.messageList.nativeElement.scrollTo({
        top: this.messageList.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }
  }

  private formatMarkdown(text: string): SafeHtml {
    const html = MarkdownUtils.formatMarkdown(text);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
