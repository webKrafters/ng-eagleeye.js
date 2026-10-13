export type {
    BaseType,
    ClearCommand,
    KeyType,
    MoveCommand,
    PushCommand,
    ReplaceCommand,
    SetCommand,
    SpliceCommand,
    TagCommand,
    TagType,
    UpdateStats,
    UpdatePayload,
    UpdatePayloadArray
} from '@webkrafters/auto-immutable';

export type {
    ArraySelector,
    Changes,
    Channel,
    FullStateSelector,
    IStorage,
    IStore,
    Listener,
    ObjectSelector,
    Prehooks,
    SelectorMap,
    Store,
    StoreInternal,
    StoreRef,
    Stream,
    Text,
    Unsubscribe
} from '@webkrafters/eagleeye';

import { Router } from '@angular/router';

import type {
    ProviderProps as BaseProviderProps,
	RawProviderProps as BaseRawProviderProps,
    State
} from '@webkrafters/eagleeye';

export { BaseProviderProps, BaseRawProviderProps, Router, State };

export interface ProviderProps<T extends State> extends BaseProviderProps<T>{ appRouter? : Router }

export interface RawProviderProps<T extends State> extends BaseRawProviderProps<T>{ appRouter? : Router }

export {
    CLEAR_TAG,
    DELETE_TAG,
    FULL_STATE_SELECTOR,
    MOVE_TAG,
    NULL_SELECTOR,
    PUSH_TAG,
    REPLACE_TAG,
    SET_TAG,
    SPLICE_TAG,
    Tag,
} from '@webkrafters/eagleeye';
