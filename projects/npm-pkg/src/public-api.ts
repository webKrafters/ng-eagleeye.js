/*
 * Public API Surface of ng-eagleeye.js
 */
export * from './lib';
export {
  ChannelPool,
	CONTEXT_DESCRIPTOR,
  type ContextData,
	type ContextServiceConfig,
	ContextService,
	provideContextService
} from './lib/context-service';
export {
  BrowserStreamService,
	type DataSignals,
  MemoryStreamService,
	STREAM_DESCRIPTOR,
	StreamService,
	type StreamServiceConfig,
	provideStreamService
} from './lib/stream-service';
