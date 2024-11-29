import { createStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const store = createStore()

export const tokenAtom = atomWithStorage<string | undefined>(
    'token',
    undefined
);
