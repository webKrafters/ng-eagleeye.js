import {
  DestroyRef,
  inject,
  InjectionToken,
  Provider,
  signal,
  WritableSignal
} from '@angular/core';

import {
  ArraySelector,
  Changes,
  Channel,
  ObjectSelector,
  SelectorMap,
  State
} from '.';

import {
  __INTERNAL__,
  ContextService
} from './context-service';

import validateRef from './util/vaildate-service-ref';

export type StreamData<C> = C extends ContextService<infer U> ? C : never;

export interface StreamServiceConfig<
  T extends State,
  S extends SelectorMap
>{
  contextRef? : InjectionToken<ContextService<T>>;
  ref? : InjectionToken<StreamService<T,S>>;
  selectorMap? : S;
}

export type Data<S extends SelectorMap> =
  S extends ObjectSelector
  ? { [K in keyof S]: WritableSignal<unknown> }
  : S extends ArraySelector
  ?  Array<WritableSignal<unknown>>
  : never;

export const STREAM_DESCRIPTOR = 'EagleEye_Stream_Service';

/** 
 * Actively monitors the store and updates component if any of the watched keys in the state objects changes
 * 
 * @example
 * const contextStreamService = new StreamService(
 *  contextService : ContextService<T>
 *  selectorMap? : S extends SelectorMap
 * );
 * 
 * A selector map is a Key:value pairs where `key` => arbitrary key given to a Store.data property holding a state slice and `value` => property path to a state slice used by this component: see examples below.
 * 
 * May add a mapping for a certain arbitrary key='state' and value='@@STATE' to indicate a desire to obtain the entire state object and assign to a `state` property of Store.data.
 * 
 * A change in any of the referenced properties results in this component render.
 * 
 * When using '@@STATE', note that any change within the state object will result in this component render.
 * 
 * A valid property path follows the `lodash` object property path convention.
 * for a state = { a: 1, b: 2, c: 3, d: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] } }
 * Any of the following is an applicable selector map.
 * ['d', 'a'] => {
 * 		0: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] },
 * 		1: 1
 * }
 * {myData: 'd', count: 'a'} => {
 * 		myData: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] },
 * 		count: 1
 * }
 * {count: 'a'} => {count: 1} // same applies to {count: 'b'} = {count: 2}; {count: 'c'} = {count: 3}
 * {myData: 'd'} => {mydata: { e: 5, f: [6, { x: 7, y: 8, z: 9 } ] }}
 * {xyz: 'd.e'} => {xyz: 5}
 * {def: 'd.e.f'} => {def: [6, { x: 7, y: 8, z: 9 } ]}
 * {f1: 'd.e.f[0]'} or {f1: 'd.e.f.0'} => {f1: 6}
 * {secondFElement: 'd.e.f[1]'} or {secondFElement: 'd.e.f.1'} => {secondFElement: { x: 7, y: 8, z: 9 }}
 * {myX: 'd.e.f[1].x'} or {myX: 'd.e.f.1.x'} => {myX: 7} // same applies to {myY: 'd.e.f[1].y'} = {myY: 8}; {myZ: 'd.e.f[1].z'} = {myZ: 9}
 * {myData: '@@STATE'} => {myData: state}
 */
export class StreamService<
  T extends State,
  S extends SelectorMap
> {

  private _data = {} as Data<S>;

  private channel : Channel<T, S>;

  private destroyRef = inject( DestroyRef );
  
  constructor(
    contextSvc : ContextService<T>,
    selectorMap? : S
  ) {
    this.channel = contextSvc.getStream( __INTERNAL__ )( selectorMap );
    this.destroyRef.onDestroy(() => this.channel.endStream());
    const tData = this.channel.data as Record<number, unknown>;
    for( let k in tData ) { this._data[ k ] = signal( tData[ k ] ) }
    this.channel.addListener( 'data-changed', () => this.refreshData() );
  }

  get data() { return this._data }

  /** @param {string[]} [propertyPaths] - Array of object paths to a state slice e.g. [ 'a.b[3]', 'a.e.2.e', 'x.y.z' ] */
  resetState( propertyPaths? : Array<string> ) { this.channel.resetState( propertyPaths ) }

	setState( changes: Changes<T> ) { this.channel.setState( changes ) }

  private refreshData() {
    const tData = this.channel.data as Record<number, any>;
    for( let k in tData ) {
      this._data[ k ]() !== tData[ k ] &&
      this._data[ k ].set( tData[ k ] );
    }
  }
}

export function createStreamService<
  T extends State,
  S extends SelectorMap
>( config : StreamServiceConfig<T, S> ) {
  return new StreamService(
    inject( config.contextRef ?? ContextService ),
    config.selectorMap
  );
}

export function provideStreamService<
  T extends State, S extends SelectorMap
>(
  config : StreamServiceConfig<T, S>
) : Array<Provider> {
  validateRef( STREAM_DESCRIPTOR, config.ref );
  const STREAM_SVC_CONFIG = new InjectionToken<
    StreamData<
      ContextService<T>
    >
  >( `${ config.ref ?? STREAM_DESCRIPTOR }_Config` );
  return [{
    provide: STREAM_SVC_CONFIG,
    useValue: config
  }, {
    deps: [ STREAM_SVC_CONFIG ],
    provide: config.ref ?? StreamService,
    useFactory: createStreamService
  }];
}

