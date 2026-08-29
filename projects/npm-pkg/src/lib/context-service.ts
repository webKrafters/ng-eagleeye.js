import { isPlatformBrowser } from '@angular/common';

import {
  DestroyRef,
  inject,
  InjectionToken,
  PLATFORM_ID,
  Provider
} from '@angular/core';

import {
  NavigationEnd,
  NavigationStart
} from '@angular/router';

import {
  BaseStream,
  Channel,
  createEagleEye,
  EagleEyeContext,
  SelectorMap
} from '@webkrafters/eagleeye';

import {
  IStorage,
  Prehooks,
  ProviderProps,
  RawProviderProps,
  Router,
  State
} from '.';

import validateRef from './util/vaildate-service-ref';

import {
  type Channel as MemoChannel,
  ChannelRegistry,
  MemoDetail
} from '@webkrafters/eagleeye.channels.repository';

export const __INTERNAL__ = Symbol( 'Internal' );

type ContextData<C> = C extends ProviderProps<infer U>|RawProviderProps<infer U> ? C : never;

export const CONTEXT_DESCRIPTOR = 'EagleEye_Context_Service';

export const deps = { isPlatformBrowser }

export interface ContextServiceConfig<T extends State>{
  attrs? : ProviderProps<T>|RawProviderProps<T>;
  ref? : InjectionToken<ContextService<T>>;
}

class Context<T extends State = State> {
  
  private consumer : EagleEyeContext<T>;
  
  constructor( config? : ProviderProps<T> );
  constructor( config? : RawProviderProps<T> );
  constructor( config? : any ) {
    this.consumer = createEagleEye( config );
  }

	get cache(){ return this.consumer.cache }

	get closed(){ return this.consumer.closed }

	get prehooks() { return this.consumer.prehooks }

	get storage() { return this.consumer.storage }

	get store() { return this.consumer.store }

	set prehooks( prehooks : Prehooks<T> ) {
		this.consumer.prehooks = prehooks;
	}

	set storage( storage : IStorage<T> ) {
		this.consumer.storage = storage;
	}

	dispose(){ this.consumer.dispose() }

  getStream( token : Symbol ) {
    if( token !== __INTERNAL__ ) {
      throw new Error( 'Access Denied.' );
    }
    return this.consumer.stream;
  }

}

export class ChannelPool<
  T extends State = State,
  S extends SelectorMap = SelectorMap
> implements MemoChannel<T> {
  private _source : Channel<T, S>;
  private _memoDetail = {
    group: undefined,
    key: undefined,
    owner: undefined,
    registry: undefined
  } as unknown as MemoDetail<T>
  constructor( stream : BaseStream<T>, selectorMap : S ) {
    this._source = stream( selectorMap );
  }
  get source() { return this._source }
  get memoDetail() { return this._memoDetail }
}

export class ContextService<T extends State = State> extends Context<T> {

  private _appRouter = inject( Router, { optional: true } );
  private _channelRegistry = null as unknown as ChannelRegistry<T>;
  private _isNavigating = false;
  private destroyRef = inject( DestroyRef );
  private platformId = inject( PLATFORM_ID );

  constructor( config? : ProviderProps<T> );
  constructor( config? : RawProviderProps<T> );
  constructor( config? : any ) {
    super( config );
    if( !deps.isPlatformBrowser( this.platformId ) ) {
      this.destroyRef.onDestroy(() => this.dispose());
      return;
    }
		this._channelRegistry = new ChannelRegistry<T>(
      ( stream, selectorMap ) => new ChannelPool<T, any>( stream, selectorMap )
    );
    const navSub = this.appRouter?.events.subscribe( e => {
      if( e instanceof NavigationEnd ) {
        this._isNavigating = false;
      } else if( e instanceof NavigationStart ) {
        this._isNavigating = true;
      }
    } );
    this.destroyRef.onDestroy(() => {
      this.dispose();
      navSub?.unsubscribe();
    });
  }

  get appRouter() { return this._appRouter }

  get channelRegistry() { return this._channelRegistry }

  get isNavigating() { return this._isNavigating }
  
}

function createContextService<T extends State>(
  config? : ContextServiceConfig<T>
) {
  return new ContextService( config?.attrs as ProviderProps<T> );
}

export function provideContextService<T extends State>(
  config? : ContextServiceConfig<T>
) : Array<Provider> {
  if( !config ) {
    return [{
      provide: ContextService,
      useFactory: createContextService
    }];
  }
  validateRef( CONTEXT_DESCRIPTOR, config.ref );
  const CTX_SVC_CONFIG = new InjectionToken<
    ContextData<T>
  >( `${ config.ref ?? CONTEXT_DESCRIPTOR }_Config` );
  return [{
    provide: CTX_SVC_CONFIG,
    useValue: config
  }, {
    deps: [ CTX_SVC_CONFIG ],
    provide: config.ref ?? ContextService,
    useFactory: createContextService
  }];
}
