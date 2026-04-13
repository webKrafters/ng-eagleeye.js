import { TestBed } from '@angular/core/testing';

import {
	ContextService,
	provideContextService
} from './context-service';

import {
	provideStreamService,
	StreamService
} from './stream-service';

import createSourceData, {
	SourceData
} from './test-artifacts/data/create-state-obj';
import { InjectionToken } from '@angular/core';

describe( 'StreamService', () => {

	const selectorMap = {
		age: 'age',
		friend2: 'friends[1].name'
	};

	let service: StreamService<
		SourceData,
		typeof selectorMap
	>;

	const eeContextService = new InjectionToken<ContextService<SourceData>>( 'EagleEye_Context_Service_Test' );

	beforeEach(() => {	
		TestBed.configureTestingModule({
			providers: [
				provideContextService({
					attrs: {
						value: createSourceData()
					},
					ref: eeContextService
				}),
				provideStreamService({
					contextRef: eeContextService,
					selectorMap
				}),
			]
		});
		service = TestBed.inject( StreamService );
	});

	it( 'should be created', () => {
		expect( service ).toBeTruthy();
	});
});
