import {
  DestroyRef,
  inject,
  InjectionToken,
  Provider,
  signal,
  WritableSignal
} from '@angular/core';

import { Data } from '@webkrafters/eagleeye';

import {
  Changes,
  Channel,
  SelectorMap,
  State
} from '.';

import {
  __INTERNAL__,
  ChannelPool,
  ContextService
} from './context-service';

import validateRef from './util/vaildate-service-ref';

type StreamData<C> = C extends ContextService<infer U> ? C : never;

type SignalGen<
  T extends State,
  S extends SelectorMap,
  D extends Data<S, T> = Data<S, T>
> = {
  [ K in keyof D ]: WritableSignal<D[K]>
};
export type DataSignals<
  T extends State,
  S extends SelectorMap
> = SignalGen<T, S>;

export interface StreamServiceConfig<
  T extends State,
  S extends SelectorMap
>{
  clientId: string;
  contextRef? : InjectionToken<ContextService<T>>;
  ref? : InjectionToken<StreamService<T,S>>;
  selectorMap? : S;
}

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
export class Stream<
  T extends State = State,
  const S extends SelectorMap = undefined
> {

  private _data = {} as DataSignals<T, S>;

  private _channel : Channel<T, S>;

  constructor( channel : Channel<T, S> ) {
    this._channel = channel;
    this._channel.addListener( 'data-changed', () => this.refreshData() );
    this.refreshData();
  }

  get data() { return this._data }

  set selectorMap( selectorMap : S ) { this._channel.selectorMap = selectorMap };

  /** @param {string[]} [propertyPaths] - Array of object paths to a state slice e.g. [ 'a.b[3]', 'a.e.2.e', 'x.y.z' ] */
  resetState( propertyPaths? : Array<string> ) { this._channel.resetState( propertyPaths ) }

	setState( changes: Changes<T> ) { this._channel.setState( changes ) }

  private refreshData() {
    const tData = this._channel.data;
    if( !Object.keys( tData ).length ) {
      this._data = {} as typeof this._data;
      return;
    }
    for( let k in tData ) {
      try {
        this._data[ k ]() !== tData[ k ] &&
        this._data[ k ].set( tData[ k ] );
      } catch( e ) {
        this._data[ k ] = signal( tData[ k ] );
      }
    }
  }
}

export class BrowserStream<
  T extends State = State,
  const S extends SelectorMap = undefined
> extends Stream<T, S> {
  private _channelPool : ChannelPool<T, S>;
  constructor( channelPool : ChannelPool<T, S> ) {
    super( channelPool.source );
    this._channelPool = channelPool;
  }
}

export abstract class StreamService<
  T extends State,
  const S extends SelectorMap
>{
  private _stream : Stream<T,S>;
  protected destroyRef = inject( DestroyRef );
  constructor( stream : Stream<T, S> ) { this._stream = stream }
  set selectorMap( selectorMap : S ) { this._stream.selectorMap = selectorMap }
  get data() { return this._stream.data }
  get resetState() { return this._stream.resetState.bind( this._stream ) }
  get setState() { return this._stream.setState.bind( this._stream ) }
}

export class BrowserStreamService<
  T extends State = State,
  const S extends SelectorMap = any
> extends StreamService<T, S> {
  private _channel : ChannelPool<T,S>;
  constructor(
    contextSvc : ContextService<T>,
    clientId : string,
    selectorMap? : S
  ) {
    let channel = contextSvc
      .channelRegistry
      .getChannelEntryFor( clientId )
      .at( selectorMap );
    /* istanbul ignore next */
    if( !channel ) {
      channel = contextSvc
        .channelRegistry
        .registerStream( contextSvc.getStream( __INTERNAL__ ) )
        .for( clientId )
        .at( selectorMap );
    }
    const _channel = channel as unknown as ChannelPool<T, S>;
    super( new BrowserStream( _channel ) );
    this._channel = _channel;
    this.destroyRef.onDestroy(() => {
      /* istanbul ignore next */
      if( contextSvc.isNavigating ) { return }
      const pool = _channel.memoDetail.registry;
			pool.unregisterStreamerFrom( this._channel );
      !pool.getChannelEntryFor( clientId ).at( selectorMap )
      && this._channel.source.endStream();
    });
  }

  override set selectorMap( selectorMap : S ) {
    this._channel
      .memoDetail
			.registry
			.recalibrateChannel( this._channel )
			.against( selectorMap );
		super.selectorMap = selectorMap;
  }
}

export class MemoryStreamService<
  T extends State = State,
  const S extends SelectorMap = any
> extends StreamService<T, S>{
  constructor( contextSvc : ContextService<T>, selectorMap? : S ) {
    const channel = contextSvc.getStream( __INTERNAL__ )( selectorMap );
    super( new Stream( channel ) );
    this.destroyRef.onDestroy(() => channel.endStream());
  }
}

function createStreamService<
  T extends State,
  const S extends SelectorMap
>( config : StreamServiceConfig<T, S> ) : StreamService<T, S> {
  const contextSvc = inject( config.contextRef ?? ContextService );
  return !!contextSvc.channelRegistry
    ? new BrowserStreamService( contextSvc, config.clientId, config.selectorMap )
    : new MemoryStreamService( contextSvc, config.selectorMap );
}

export function provideStreamService<
  T extends State,
  const S extends SelectorMap
>(
  config : StreamServiceConfig<T, S>
) : Array<Provider> {
  if( Object.keys( config ).length === 1 && 'clientId' in config ) {
    return [{
      provide: StreamService,
      useFactory: () => createStreamService( config )
    }];
  }
  validateRef( STREAM_DESCRIPTOR, config.ref );
  const STREAM_SVC_CONFIG = new InjectionToken<
    StreamData<ContextService<T>>
  >( `${ config.ref ?? STREAM_DESCRIPTOR }_Config` );
  return [{
    provide: STREAM_SVC_CONFIG,
    useValue: config
  }, {
    deps: [ STREAM_SVC_CONFIG ],
    provide: config.ref ?? StreamService,
    useFactory: () => createStreamService( config )
  }];
}
