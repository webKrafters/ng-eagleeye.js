/*
 * Public API Surface of ng-eagleeye.js
 */
export * from './lib';
export {
	type ContextData,
	CONTEXT_DESCRIPTOR,
	type ContextServiceConfig,
	ContextService,
	createContextService,
	provideContextService
}from './lib/context-service';
export * from './lib/stream-service';
