/*
 * Public API Surface of ng-eagleeye.js
 */
export * from './lib';
export {
	CONTEXT_DESCRIPTOR,
	type ContextServiceConfig,
	ContextService,
	provideContextService
} from './lib/context-service';
export {
	type DataSignals,
	STREAM_DESCRIPTOR,
	type StreamServiceConfig,
	StreamService,
	provideStreamService
} from './lib/stream-service';
