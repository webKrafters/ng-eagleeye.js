import { TestBed } from '@angular/core/testing';

import * as AutoImmutableModule from '@webkrafters/auto-immutable';

import { InjectionToken, Provider } from '@angular/core';

import {
	Changes,
	FULL_STATE_SELECTOR,
	IStorage,
	Prehooks,
	ProviderProps,
	RawProviderProps,
	type SelectorMap,
	type State,
	type Store
} from './';

import {
	CONTEXT_DESCRIPTOR,
	ContextService,
	ContextServiceConfig,
	createContextService,
	provideContextService
} from './context-service';

import createSourceData, { SourceData } from './test-artifacts/data/create-state-obj';
import { Stream, StreamService } from './stream-service';

type ServiceArgs0<T extends State> = ProviderProps<T> & { ref? : ContextServiceConfig<T>[ "ref" ] };
type ServiceArgs1<T extends State> = RawProviderProps<T> & { ref? : ContextServiceConfig<T>[ "ref" ] };

function getServiceProvider<T extends State>( args? : ServiceArgs0<T> ) : Array<Provider>;
function getServiceProvider<T extends State>( args? : ServiceArgs1<T> ) : Array<Provider>;
function getServiceProvider<T extends State>( args? : any ) : Array<Provider>{
	if( !args ) { return provideContextService() }
	const config = {} as ContextServiceConfig<T>;
	const attrs = {} as ContextServiceConfig<T>[ 'attrs' ];
	if( 'value' in args ) { attrs!.value = args.value }
	if( 'prehooks' in args ) { attrs!.prehooks = args.prehooks }
	if( 'storage' in args ) { attrs!.storage = args.storage }
	if( 'ref' in args ) { config.ref = args.ref }
	if( Object.keys( attrs! ).length ) { config.attrs = attrs }
	return provideContextService( config );
}

function getServiceInstance<T extends State>( args? : ServiceArgs0<T> ) : ContextService<T>;
function getServiceInstance<T extends State>( args? : ServiceArgs1<T> ) : ContextService<T>;
function getServiceInstance<T extends State>( args? : any ) : ContextService<T> {
	TestBed.configureTestingModule({
		providers: [ getServiceProvider( args )]
	});
	return TestBed.inject( ContextService<T> );
}

describe( 'ContextService', () => {
	let getDefState : () => SourceData;
	let getUpdatePayload : () => Changes<SourceData>;
	beforeAll(() => {
		getDefState = createSourceData;
		const defState = getDefState();
		getUpdatePayload = () => ({
			age: defState.age === 37 ? 38 : 37,
			name: { first: defState.name.first === 'Jonathan' ? 'Bennett' : 'Jonathan' },
			friends: {
				1: {
					name: {
						first: defState.friends[ 1 ].name.first === 'Agent 007' ? 'Iron Man' : 'Agent 007'
					}
				}
			}
		} as unknown as Changes<SourceData> );
	}); 
	describe( 'Service Engine', () => {
		test( 'should be created', () => {
			const changes = getUpdatePayload();
			const defState = getDefState();
			const ctx = getServiceInstance({ value: createSourceData() });
			expect( ctx ).toBeTruthy();
			const onChangeMock = jest.fn();
			const unsub = ctx.store.subscribe( 'data-updated', onChangeMock );
			expect( onChangeMock ).not.toHaveBeenCalled();
			ctx.store.setState( changes );
			expect( onChangeMock ).toHaveBeenCalled();
			expect( onChangeMock.mock.calls[ 0 ][ 0 ] ).toEqual( changes );
			expect( onChangeMock.mock.calls[ 0 ][ 1 ] ).toEqual([
				[ 'age' ],
				[ 'name', 'first' ],
				[ 'friends', 1, 'name', 'first' ]
			]);
			expect( onChangeMock.mock.calls[ 0 ][ 2 ] ).toEqual({
				...changes, friends: [
					undefined,  ( changes as SourceData ).friends[ 1 ]
				]
			});
			expect( onChangeMock.mock.calls[ 0 ][ 3 ] ).toEqual( expect.any( Function ) );
			onChangeMock.mockClear();
			ctx.store.setState( changes ); // noop for repeat setState with same payload
			expect( onChangeMock ).not.toHaveBeenCalled();
			ctx.store.resetState([ 'age', 'friends[1].name.first', 'name.first' ]); // triggers resetState
			expect( onChangeMock ).toHaveBeenCalled();
			expect( onChangeMock.mock.calls[ 0 ][ 0 ] ).toEqual({
				age: {
					[ AutoImmutableModule.REPLACE_TAG]: defState.age,
				},
				name: {
					first: {
						[ AutoImmutableModule.REPLACE_TAG]: defState.name.first,
					}
				},
				friends: {
					1: {
						name: {
							first: {
								[ AutoImmutableModule.REPLACE_TAG ]: defState.friends[ 1 ].name.first
							}
						}
					}
				}
			});
			expect( onChangeMock.mock.calls[ 0 ][ 1 ] ).toEqual([
				[ 'age' ],
				[ 'friends', 1, 'name', 'first' ],
				[ 'name', 'first' ]
			]);
			expect( onChangeMock.mock.calls[ 0 ][ 2 ] ).toEqual({
				age: defState.age,
				friends: [ undefined, { name: { first: defState.friends[ 1 ].name.first } } ],
				name: { first: defState.name.first }
			});
			expect( onChangeMock.mock.calls[ 0 ][ 3 ] ).toEqual( expect.any( Function ) );
			onChangeMock.mockClear();
			// upon unsubscribing to changes
			unsub();
			ctx.store.setState( changes );
			let data = ctx.store.getState([
				'age', 'name.first', 'friends[1].name.first'
			]);
			 // changes can be still be made
			expect( data.age ).not.toEqual( defState.age );
			expect( data.name.first ).not.toEqual( defState.name.first );
			expect( data.friends[ 1 ].name.first ).not.toEqual( defState.friends[ 1 ].name.first );
			// but onChange no longer called.
			expect( onChangeMock ).not.toHaveBeenCalled();
			ctx.store.resetState([ FULL_STATE_SELECTOR ]);
			// state reset could still take place.
			data = ctx.store.getState([
				'age', 'name.first', 'friends[1].name.first'
			]);
			expect( data.age ).toEqual( defState.age );
			expect( data.name.first ).toEqual( defState.name.first );
			expect( data.friends[ 1 ].name.first ).toEqual( defState.friends[ 1 ].name.first );
			// but onChange no longer called.
			expect( onChangeMock ).not.toHaveBeenCalled();
		});
		test( 'can create a referenceable service', () => {
			const serviceRef = new InjectionToken( `${ CONTEXT_DESCRIPTOR }_Testing` );
			TestBed.configureTestingModule({
				providers: [
					getServiceProvider({ ref: serviceRef })
				]
			});
			expect( TestBed.inject( serviceRef ) )
				.toBeInstanceOf( ContextService );
		} );
		test( `will throw on attempt to create a referenceable service with a name lacking the "${ CONTEXT_DESCRIPTOR }_" prefix`, () => {
			expect(() => {
				TestBed.configureTestingModule({
					providers: [
						getServiceProvider({
							ref: new InjectionToken( `_Testing` )
						})
					]
				});
			}).toThrow();
		} );
	} );
	describe( 'dispose(...)', () => {
		test( 'manually releases memory before exiting', () => {
			const value = createSourceData();
			const ctx = getServiceInstance({ value });
			expect( ctx.closed ).toBe( false );
			expect( ctx.store.getState() ).toEqual( value );
			ctx.dispose();
			// can no longer obtain new data
			expect( ctx.store.getState() ).toBeUndefined();
		});
	});
	describe( 'getStream(...)', () => {
		describe( 'is inccessible', () => {
			test( 'please use the StreamService instead', () => {
				expect(() => {
					getServiceInstance().getStream( Symbol( 'Internal' ) )
				}).toThrow( 'Access Denied' )
			} );
		} );
	} );
	describe( 'More on prehooks', () => {
		describe( 'resetState prehook', () => {
			describe( 'when `resetState` prehook does not exist on the context', () => {
				test( 'completes `store.resetState` method call', async () => {
					const ctx = getServiceInstance();
					ctx.store.setState( getUpdatePayload() );
					const changeMock = jest.fn();
					ctx.store.subscribe( 'data-updated', changeMock );
					expect( changeMock ).not.toHaveBeenCalled();
					ctx.store.resetState([ FULL_STATE_SELECTOR ]);
					expect( changeMock ).toHaveBeenCalled();
				} );
			} );
			describe( 'when `resetState` prehook exists on the context', () => {
				test( 'is called by the `store.resetState` method', async () => {
					const prehooks = Object.freeze({ resetState: jest.fn().mockReturnValue( false ) });
					const ctx = getServiceInstance({ prehooks });
					const changes = getUpdatePayload();
					ctx.store.setState( changes );
					ctx.store.resetState([ 'age', 'friends[1].name.first', 'name.first' ]);
					expect( prehooks.resetState ).toHaveBeenCalledTimes( 1 );
					expect( prehooks.resetState.mock.calls[ 0 ][ 0 ]).toEqual({
						[ AutoImmutableModule.DELETE_TAG ]: [ 'age', 'friends', 'name' ]
					});
					expect( prehooks.resetState.mock.calls[ 0 ][ 1 ] ).toEqual({
						current: {
							age: ( changes as SourceData ).age,
							name: { first: ( changes as SourceData ).name.first },
							friends: [ undefined, {
								name: {
									first: ( changes as SourceData ).friends[ 1 ].name.first
								}
							} ]
						},
						original: {}
					});
				} );
				test( 'completes `store.setState` method call if `setState` prehook returns TRUTHY', async () => {
					const prehooks = Object.freeze({ resetState: jest.fn().mockReturnValue( true ) });
					const ctx = getServiceInstance({ prehooks });
					ctx.store.setState( getUpdatePayload() );
					const changeMock = jest.fn();
					ctx.store.subscribe( 'data-updated', changeMock );
					expect( changeMock ).not.toHaveBeenCalled();
					ctx.store.resetState([ FULL_STATE_SELECTOR ]);
					expect( changeMock ).toHaveBeenCalled();
				} );
				test( 'aborts `store.setState` method call if `setState` prehook returns FALSY', async () => {
					const prehooks = Object.freeze({ resetState: jest.fn().mockReturnValue( false ) });
					const ctx = getServiceInstance({ prehooks });
					ctx.store.setState( getUpdatePayload() );
					const changeMock = jest.fn();
					ctx.store.subscribe( 'data-updated', changeMock );
					expect( changeMock ).not.toHaveBeenCalled();
					ctx.store.resetState();
					expect( changeMock ).not.toHaveBeenCalled();
				} );
			} );
		} );
		describe( 'setState prehook', () => {
			describe( 'when `setState` prehook does not exist on the context', () => {
				test( 'completes `store.setState` method call', async () => {
					const ctx = getServiceInstance();
					const changeMock = jest.fn();
					ctx.store.subscribe( 'data-updated', changeMock );
					expect( changeMock ).not.toHaveBeenCalled();
					ctx.store.setState( getUpdatePayload() );
					expect( changeMock ).toHaveBeenCalled();
				} );
			} );
			describe( 'when `setState` prehook exists on the context', () => {
				test( 'is called by the `store.setState` method', async () => {
					const prehooks = Object.freeze({ setState: jest.fn().mockReturnValue( false ) });
					const ctx = getServiceInstance({ prehooks });
					ctx.store.setState( getUpdatePayload() );
					expect( prehooks.setState ).toHaveBeenCalledTimes( 1 );
					expect( prehooks.setState ).toHaveBeenCalledWith( getUpdatePayload() );
				} );
				test( 'completes `store.setState` method call if `setState` prehook returns TRUTHY', async () => {
					const prehooks = Object.freeze({ setState: jest.fn().mockReturnValue( true ) });
					const ctx = getServiceInstance({ prehooks });
					const changeMock = jest.fn();
					ctx.store.subscribe( 'data-updated', changeMock );
					expect( changeMock ).not.toHaveBeenCalled();
					ctx.store.setState( getUpdatePayload() );
					expect( changeMock ).toHaveBeenCalled();
				}, 3e4 );
				test( 'aborts `store.setState` method call if `setState` prehook returns FALSY', async () => {
					const prehooks = Object.freeze({ setState: jest.fn().mockReturnValue( false ) });
					const ctx = getServiceInstance({ prehooks });
					const changeMock = jest.fn();
					ctx.store.subscribe( 'data-updated', changeMock );
					expect( changeMock ).not.toHaveBeenCalled();
					ctx.store.setState( getUpdatePayload() );
					expect( changeMock ).not.toHaveBeenCalled();
				} );
			} );
		} );
	} );
	describe( 'properties', () => {
		test( 'receives and furnishes prehooks', () => {
			const ctx = getServiceInstance({ value: createSourceData() })
			const prehooks = {
				resetState: jest.fn(),
				setState: jest.fn()
			} as unknown as Prehooks<SourceData>;
			ctx.prehooks = prehooks;
			expect( ctx.prehooks ).toBe( prehooks );
			ctx.prehooks = undefined as unknown as Prehooks<SourceData>;
		} );
		test( 'receives and furnishes init data storage', () => {
			const ctx = getServiceInstance({ value: createSourceData() })
			const storage = {
				getItem: jest.fn(),
				removeItem: jest.fn(),
				setItem: jest.fn()
			} as unknown as IStorage<SourceData>;
			ctx.storage = storage;
			expect( ctx.storage ).toBe( storage );
			ctx.storage = undefined as unknown as IStorage<SourceData>;
		} );
		describe( 'readonly', () => {
			test( 'furnishes access to underlying cache', () => {
				const ctx = getServiceInstance({ value: createSourceData() });
				expect( ctx.cache ).toBeInstanceOf( AutoImmutableModule.default );
				expect(() => {
					// @ts-expect-error
					ctx.cache = expect.any( AutoImmutableModule.default );
				}).toThrow( 'Cannot set property cache of #<Context> which has only a getter' );
			} );
			test( 'furnishes this context active status', () => {
				const ctx = getServiceInstance();
				expect( ctx.closed ).toBe( false );
				expect(() => {
					// @ts-expect-error
					ctx.closed = true;
				}).toThrow( 'Cannot set property closed of #<Context> which has only a getter' );
				expect( ctx.closed ).toBe( false );
				ctx.dispose();
				expect( ctx.closed ).toBe( true );
			} );
			test( 'furnishes external store reference', () => {
				const ctx = getServiceInstance();
				expect( ctx.store ).toEqual({
					getState: expect.any( Function ),
					resetState: expect.any( Function ),
					setState: expect.any( Function ),
					subscribe: expect.any( Function )
				});
				expect(() => {
					// @ts-expect-error
					ctx.store = expect.any( Object );
				}).toThrow( 'Cannot set property store of #<Context> which has only a getter' );
			} );
		} );
	} );
} );
