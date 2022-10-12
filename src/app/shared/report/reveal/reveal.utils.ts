// Import Reveal.js
import Reveal from 'reveal.js';
export {Reveal};

export interface IRevealOptions {
  config: boolean;
  control?: boolean;
  progress: boolean;
  history: boolean;
  center: boolean;
  disableLayout: boolean;
  touch: boolean
  embedded: boolean; // Required for multi .reveal div
  keyboardCondition: string;
  mouseWheel: boolean;
  slideNumber: boolean, // Disable number
  keyboard: boolean,
  fragments: boolean,
  controlsBackArrows: string;
  pdfMaxPagesPerSlide: number;
  hideInactiveCursor: boolean;

  [key: string]: any;
}
export declare type RevealEventType = 'slidechanged'|'slidetransitionend'|'resize';
export declare type RevealSlideChangedEvent = Event & {
  currentSlide: HTMLElement;
  previousSlide: HTMLElement;
  indexh: number;
  indexv: number;
}
export declare type IReveal = Reveal & {
  initialize();
  destroy();
  layout();
  sync();
  next();
  navigatePrev();
  navigateNext();
  toggleHelp();
  isPrintingPDF(): boolean;
  configure(options: Partial<IRevealOptions>);
  on(eventType: RevealEventType, listener: (event: any) => void);
}
