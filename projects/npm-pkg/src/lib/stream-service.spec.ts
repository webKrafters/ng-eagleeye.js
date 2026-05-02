import { TestBed } from '@angular/core/testing';

import {
	CONTEXT_DESCRIPTOR,
	ContextService,
	provideContextService
} from './context-service';

import {
	provideStreamService,
	STREAM_DESCRIPTOR,
	StreamService
} from './stream-service';

import createSourceData, {
	SourceData
} from './test-artifacts/data/create-state-obj';
import { Changes, DELETE_TAG, FULL_STATE_SELECTOR, MOVE_TAG, SelectorMap, State } from '@webkrafters/eagleeye';
import { InjectionToken } from '@angular/core';

function getServiceInstance<
	T extends State,
	const S extends SelectorMap
>( value? : T, selectorMap? : S ) {
	TestBed.configureTestingModule({
		providers: [
			typeof value !== 'undefined'
			? provideContextService({ attrs: { value } })
			: provideContextService(),
			typeof selectorMap !== 'undefined'
			? provideStreamService({ selectorMap })
			: provideStreamService()
		]
	});
	return {
		contextService: TestBed.inject( ContextService<T> ) as ContextService<T>,
		streamService: TestBed.inject( StreamService ) as StreamService<T, S>
	};
}

describe( 'StreamService', () => {
	test( 'should be created', () => {
		expect( getServiceInstance().streamService ).toBeTruthy();
	});
	test( 'can be a referenceable service', () => {
		const value =  { age: 22 };
		const selectorMap = { myAge: 'age' } as const;
		const ctxRef = new InjectionToken( `${ CONTEXT_DESCRIPTOR }_Testing` );
		const strRef = new InjectionToken( `${ STREAM_DESCRIPTOR}_Testing` );
		TestBed.configureTestingModule({
			providers: [
				provideContextService({
					attrs: { value },
					ref: ctxRef
				}),
				provideStreamService({
					contextRef: ctxRef,
					ref: strRef,
					selectorMap
				})
			]
		});
		const ctxService = TestBed.inject( ctxRef ) as ContextService<typeof value>;
		const strService = TestBed.inject( strRef ) as StreamService<typeof value, typeof selectorMap>;
		expect( ctxService ).toBeInstanceOf( ContextService );
		expect( strService ).toBeInstanceOf( StreamService );
		expect( ctxService.store.getState().age )
			.toBe( strService.data.myAge() )
	} );
	test( `will throw on attempt to be made referenceable using a name lacking the "${ STREAM_DESCRIPTOR }_" prefix`, () => {
		const ctxRef = new InjectionToken( `${ CONTEXT_DESCRIPTOR }_Testing` );
		expect(() => {
			TestBed.configureTestingModule({
				providers: [
					provideContextService({
						attrs: {
							value: { age: 22 }
						},
						ref: new InjectionToken( `${ CONTEXT_DESCRIPTOR }_Testing` )
					}),
					provideStreamService({
						contextRef: ctxRef,
						ref: ctxRef, // requires an injection token with a stream service descriptor prefix
						selectorMap: { myAge: 'age' }
					})
				]
			});
		}).toThrow();
	} );
	describe( 'using the stream(...)', () => {
		const selectorMap = {
			year3: 'history.places[2].year',
			isActive: 'isActive',
			tag6: 'tags[5]',
			all: FULL_STATE_SELECTOR
		} as const;
		const sourceData = createSourceData();
		test( 'accepts object based selectorMap', () => {
			const { streamService } = getServiceInstance( sourceData, selectorMap );
			expect( streamService.data ).toEqual({
				all: expect.any( Function ),
				isActive: expect.any( Function ),
				tag6: expect.any( Function ),
				year3: expect.any( Function )
			});
			expect( streamService.data.all() ).toEqual( sourceData );
			expect( streamService.data.isActive() ).toEqual( sourceData.isActive );
			expect( streamService.data.tag6() ).toEqual( sourceData.tags[ 5 ] );
			expect( streamService.data.year3() ).toEqual( sourceData.history.places[ 2 ].year );
		} );
		test( 'accepts an array of propeerty paths and produces indexed-based data property', () => {
			const { streamService } = getServiceInstance( sourceData, [
				'history.places[2].year',
				'isActive',
				'tags[5]',
				FULL_STATE_SELECTOR, 
				'tags',
				'history.places[2].country'
			] );
			expect( streamService.data ).toEqual({
				0: expect.any( Function ),
				1: expect.any( Function ),
				2: expect.any( Function ),
				3: expect.any( Function ),
				4: expect.any( Function ),
				5: expect.any( Function )
			});
			expect( streamService.data[ 0 ]() ).toEqual( sourceData.history.places[ 2 ].year );
			expect( streamService.data[ 1 ]() ).toEqual( sourceData.isActive );
			expect( streamService.data[ 2 ]() ).toEqual( sourceData.tags[ 5 ] );
			expect( streamService.data[ 3 ]() ).toEqual( sourceData );
			expect( streamService.data[ 4 ]() ).toEqual( sourceData.tags );
			expect( streamService.data[ 5 ]() ).toEqual( sourceData.history.places[ 2 ].country );
		} );
		test( 'omitting selectorMap produces empty data property', () => {
			expect( getServiceInstance( sourceData ).streamService.data ).toEqual({});
		} );
		describe( 'stream.data', () => {
			const defaultState = createSourceData();
			test( 'properties are Angular writable signals', () => {
				const {
					contextService,
					streamService
				} = getServiceInstance( createSourceData(), {
					country3: 'history.places[2].country',
					isActive: 'isActive',
					myAge: 'age'
				} as const );
				expect( streamService.data.country3() ).toBe( defaultState.history.places[ 2 ].country );
				expect( streamService.data.isActive() ).toBe( defaultState.isActive );
				expect( streamService.data.myAge() ).toBe( defaultState.age );
				// while writeable, signal changes do not affect application state
				streamService.data.myAge.set( 51 );
				expect( streamService.data.myAge() ).toBe( 51 );
				expect( contextService.store.getState().age ).toBe( defaultState.age );
				expect( streamService.data.myAge() ).not.toEqual( defaultState.age );
				// must use `streamService.setState` or `contextService.store.setState` to update application state
				streamService.setState({ age: streamService.data.myAge() } as Changes<SourceData> );
				expect( streamService.data.myAge() ).toBe( 51 );
				expect( contextService.store.getState().age ).toBe( 51 );
			} );
			test( 'carries the latest state data as referenced by the selectorMap', async () => {
				const service = getServiceInstance( createSourceData(), {
					city3: 'history.places[2].city',
					country3: 'history.places[2].country',
					friends: 'friends',
					year3: 'history.places[2].year',
					isActive: 'isActive',
					tag6: 'tags[5]',
					tag7: 'tags[6]',
					tags: 'tags'
				} as const ).streamService;
				const expectedValue = {
					city3: defaultState.history.places[ 2 ].city,
					country3: defaultState.history.places[ 2 ].country,
					friends: defaultState.friends,
					year3: defaultState.history.places[ 2 ].year,
					isActive: defaultState.isActive,
					tag6: defaultState.tags[ 5 ],
					tag7: defaultState.tags[ 6 ],
					tags: defaultState.tags
				};
				const expectedStreamData = {} as Record<string, any>;
				for( const k in expectedValue ) { expectedStreamData[ k ] = expect.any( Function ) }
				expect( service.data ).toEqual( expectedStreamData );
				expect( service.data.city3() ).toEqual( defaultState.history.places[ 2 ].city );
				expect( service.data.country3() ).toEqual( defaultState.history.places[ 2 ].country );
				expect( service.data.friends() ).toEqual( defaultState.friends );
				expect( service.data.year3() ).toEqual( defaultState.history.places[ 2 ].year );
				expect( service.data.isActive() ).toEqual( defaultState.isActive );
				expect( service.data.tag6() ).toEqual( defaultState.tags[ 5 ] );
				expect( service.data.tag7() ).toEqual( defaultState.tags[ 6 ] );
				expect( service.data.tags() ).toEqual( defaultState.tags );
				service.setState({
					friends: { [ MOVE_TAG ]: [ -1, 1 ] },
					isActive: true,
					history: {
						places: {
							2: {
								city: 'Marakesh',
								country: 'Morocco'
							}
						}
					},
					tags: { [ DELETE_TAG ]: [ 3, 5 ] }
				} as unknown as SourceData );
				expect( service.data ).toEqual({
					...expectedStreamData,
					city3: expect.any( Function ),
					country3: expect.any( Function ),
					friends: expect.any( Function ),
					isActive: expect.any( Function ),
					tag6: expect.any( Function ),
					tag7: expect.any( Function ),
					tags: expect.any( Function )
				});
				expect( service.data.city3() ).toEqual( 'Marakesh' );
				expect( service.data.country3() ).toEqual( 'Morocco' );
				expect( service.data.friends() ).toEqual( [ 0, 2, 1 ].map( i => defaultState.friends[ i ] ) );
				expect( service.data.isActive() ).toEqual( true );
				expect( service.data.tag6() ).toEqual( undefined );
				expect( service.data.tag7() ).toEqual( undefined );
				expect( service.data.tags() ).toEqual( [ 0, 1, 2, 4, 6 ].map( i => defaultState.tags[ i ] ) );
			}, 3e4 );
			test( 'holds the complete current state object whenever `' + FULL_STATE_SELECTOR + '` entry appears in the selectorMap', async () => {
				const service = getServiceInstance( createSourceData(), {
					city3: 'history.places[2].city',
					country3: 'history.places[2].country',
					year3: 'history.places[2].year',
					isActive: 'isActive',
					tag6: 'tags[5]',
					tag7: 'tags[6]',
					state: FULL_STATE_SELECTOR
				} as const ).streamService;
				const expectedValue = {
					city3: defaultState.history.places[ 2 ].city,
					country3: defaultState.history.places[ 2 ].country,
					year3: defaultState.history.places[ 2 ].year,
					isActive: defaultState.isActive,
					tag6: defaultState.tags[ 5 ],
					tag7: defaultState.tags[ 6 ],
					state: defaultState
				};
				const expectedStreamData = {} as Record<string, any>;
				for( const k in expectedValue ) { expectedStreamData[ k ] = expect.any( Function ) }
				expect( service.data ).toEqual( expectedStreamData );
				expect( service.data.city3() ).toEqual( defaultState.history.places[ 2 ].city );
				expect( service.data.country3() ).toEqual( defaultState.history.places[ 2 ].country );
				expect( service.data.year3() ).toEqual( defaultState.history.places[ 2 ].year );
				expect( service.data.isActive() ).toEqual( defaultState.isActive );
				expect( service.data.tag6() ).toEqual( defaultState.tags[ 5 ] );
				expect( service.data.tag7() ).toEqual( defaultState.tags[ 6 ] );
				expect( service.data.state() ).toEqual( defaultState );
				service.setState({
					isActive: true,
					history: {
						places: {
							2: {
								city: 'Marakesh',
								country: 'Morocco'
							}
						}
					}
				} as unknown as SourceData );
				const updatedDataEquiv = createSourceData();
				updatedDataEquiv.history.places[ 2 ].city = 'Marakesh';
				updatedDataEquiv.history.places[ 2 ].country = 'Morocco';
				updatedDataEquiv.isActive = true;
				expect( service.data ).toEqual({
					...expectedStreamData,
					city3: expect.any( Function ),
					country3: expect.any( Function ),
					isActive: expect.any( Function ),
					state: expect.any( Function )
				});
				expect( service.data.city3() ).toEqual( updatedDataEquiv.history.places[ 2 ].city );
				expect( service.data.country3() ).toEqual( updatedDataEquiv.history.places[ 2 ].country );
				expect( service.data.isActive() ).toEqual( updatedDataEquiv.isActive );
				expect( service.data.state() ).toEqual( updatedDataEquiv );
			} );
			test( 'holds an empty object when no renderKeys provided ', async () => {
				const service = getServiceInstance( createSourceData() ).streamService;
				expect( service.data ).toEqual({});
				service.setState({ // can still update state
					isActive: true,
					history: {
						places: {
							2: {
								city: 'Marakesh',
								country: 'Morocco'
							}
						}
					}
				} as unknown as SourceData );
				expect( service.data ).toEqual({});
			} );
		} );
		describe( 'stream.resetState', () => {
			describe( 'when selectorMap is present in the consumer', () => {
				describe( 'and called with own property paths arguments to reset', () => {
					test( 'resets with original slices and removes non-original slices for entries found in property paths', async () => {
						const args = [ 'blatant', 'tags[5]', 'company', 'history.places[2].year', 'xylophone', 'yodellers', 'zenith' ];
						const {
							contextService,
							streamService
						} = getServiceInstance( createSourceData(), {
							year3: 'history.places[2].year',
							isActive: 'isActive',
							tag6: 'tags[5]'
						} as const );
						const isActive2 = !sourceData.isActive;
						contextService.store.setState({
							history: { places: { 2: { year: '3035' } } },
							isActive: isActive2,
							tags: { 5: 'JUST-TESTING' }
						} as unknown as SourceData );
						expect( streamService.data ).toEqual({
							year3: expect.any( Function ),
							isActive: expect.any( Function ),
							tag6: expect.any( Function )
						});
						expect( streamService.data.year3() ).toBe( '3035' );
						expect( streamService.data.isActive() ).toBe( isActive2 );
						expect( streamService.data.tag6() ).toBe( 'JUST-TESTING' );
						expect( contextService.store.getState() ).toEqual({
							...sourceData,
							history: (() => {
								const places = [ ...sourceData.history.places ];
								places[ 2 ] = { ...places[ 2 ], year: '3035' };
								return { ...sourceData.history, places };
							})(),
							isActive: isActive2,
							tags: (() => {
								const tags = [ ...sourceData.tags ];
								tags[ 5 ] = 'JUST-TESTING';
								return tags;
							})()
						});
						streamService.resetState( args );
						expect( streamService.data ).toEqual({
							year3: expect.any( Function ),
							isActive: expect.any( Function ),
							tag6: expect.any( Function )
						});
						expect( streamService.data.year3() ).toBe( sourceData.history.places[2].year );
						expect( streamService.data.isActive() ).toBe( isActive2 );
						expect( streamService.data.tag6() ).toBe( sourceData.tags[ 5 ] );
						expect( contextService.store.getState() ).toEqual({
							...sourceData, isActive: isActive2
						});
					} );
				} );
			} );
			describe( 'when selectorMap is NOT present in the consumer', () => {
				describe( 'and called with own property paths arguments to reset', () => {
					test( 'resets with original slices and removes non-original slices for entries found in property paths', async () => {
						const args = [ 'blatant', 'company', 'xylophone', 'yodellers', 'zenith' ];
						const {
							contextService,
							streamService
						} = getServiceInstance( createSourceData() );
						expect( streamService.data ).toEqual({});
						contextService.store.setState({
							blatant: true,
							company: 'SOME NEW TEST INC.',
							xylophone: 'Ruggedly melodic', 
							yodellers: 'Cartoonishly joyful'
						} as unknown as SourceData );
						expect( streamService.data ).toEqual({});
						expect( contextService.store.getState() ).toEqual({
							...sourceData,
							blatant: true,
							company: 'SOME NEW TEST INC.',
							xylophone: 'Ruggedly melodic', 
							yodellers: 'Cartoonishly joyful'
						});
						streamService.resetState( args );
						expect( streamService.data ).toEqual({});
						expect( contextService.store.getState() ).toEqual( sourceData );
					} );
				} );
				describe( 'and called with NO own property paths arguments to reset', () => {
					test( 'results in no-op', async () => {
						const {
							contextService,
							streamService
						} = getServiceInstance( createSourceData() );
						expect( streamService.data ).toEqual({});
						contextService.store.setState({
							blatant: true,
							company: 'SOME NEW TEST INC.',
							xylophone: 'Ruggedly melodic', 
							yodellers: 'Cartoonishly joyful'
						} as unknown as SourceData );
						expect( streamService.data ).toEqual({});
						const alteredState = contextService.store.getState();
						expect( alteredState ).toEqual({
							...sourceData,
							blatant: true,
							company: 'SOME NEW TEST INC.',
							xylophone: 'Ruggedly melodic', 
							yodellers: 'Cartoonishly joyful'
						});
						streamService.resetState();
						expect( streamService.data ).toEqual({});
						expect( contextService.store.getState() ).toBe( alteredState );						} );
				} );
			} );
		} );
	} );
} );
