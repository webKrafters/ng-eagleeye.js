import {
  DestroyRef,
  inject,
  InjectionToken,
  Provider
} from '@angular/core';

import {
  createEagleEye,
  EagleEyeContext
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
import { NavigationStart } from '@angular/router';

export const __INTERNAL__ = Symbol( 'Internal' );

type ContextData<C> = C extends ProviderProps<infer U>|RawProviderProps<infer U> ? C : never;

export const CONTEXT_DESCRIPTOR = 'EagleEye_Context_Service';

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

export class ContextService<T extends State = State> extends Context<T> {

  private _appRouter = inject( Router, { optional: true } );
  private _isNavigating = false;
  private destroyRef = inject( DestroyRef );

  constructor( config? : ProviderProps<T> );
  constructor( config? : RawProviderProps<T> );
  constructor( config? : any ) {
    super( config );
    const navSub = this.appRouter?.events.subscribe( e => {
      this._isNavigating = e instanceof NavigationStart;
    });
    this.destroyRef.onDestroy(() => {
      this.dispose();
      navSub?.unsubscribe();
    });
  }

  get appRouter() { return this._appRouter }

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
