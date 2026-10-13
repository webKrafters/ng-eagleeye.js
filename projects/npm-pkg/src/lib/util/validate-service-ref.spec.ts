import { InjectionToken } from "@angular/core";

import validateServiceReference from './vaildate-service-ref';
import { CONTEXT_DESCRIPTOR } from '../context-service';
import { STREAM_DESCRIPTOR } from '../stream-service';

describe( 'Service Reference Validator', () => {
	test( 'throws on service reference name non-conformant to its Service Descriptor', () => {
		expect(() => {
			validateServiceReference(
				CONTEXT_DESCRIPTOR,
				new InjectionToken( 'This is non-conformant' )
			)
		}).toThrow();
		expect(() => {
			validateServiceReference(
				STREAM_DESCRIPTOR,
				new InjectionToken( 'This is non-conformant' )
			)
		}).toThrow();
	} );
	test( 'does not throw on service reference name conformant to its Service Descriptor', () => {
		expect(() => {
			validateServiceReference(
				CONTEXT_DESCRIPTOR,
				new InjectionToken( `${ CONTEXT_DESCRIPTOR }_Test` )
			)
		}).not.toThrow();
		expect(() => {
			validateServiceReference(
				STREAM_DESCRIPTOR,
				new InjectionToken( `${ STREAM_DESCRIPTOR }_Test` )
			)
		}).not.toThrow();
	});

} );
