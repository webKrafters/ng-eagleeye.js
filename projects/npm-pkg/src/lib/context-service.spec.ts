import { TestBed } from '@angular/core/testing';

import { ContextService, provideContextService } from './context-service';

import createSourceData, { SourceData } from './test-artifacts/data/create-state-obj';

describe( 'ContextService', () => {

	let service : ContextService<SourceData>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideContextService({
					attrs: {
						value: createSourceData()
					}
				})
			]
		});
		service = TestBed.inject( ContextService<SourceData> );
	});

	test( 'should be created', () => {
		expect( service ).toBeTruthy();
	});
});
