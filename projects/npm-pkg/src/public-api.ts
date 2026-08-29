/*
 * Public API Surface of ng-eagleeye.js
 */
export * from './lib';
export {
	ChannelPool,
	CONTEXT_DESCRIPTOR,
	type ContextServiceConfig,
	ContextService,
	provideContextService
} from './lib/context-service';
export {
	BrowserStreamService,
	type DataSignals,
	MemoryStreamService,
	STREAM_DESCRIPTOR,
	Stream,
	type StreamServiceConfig,
	StreamService,
	provideStreamService
} from './lib/stream-service';
