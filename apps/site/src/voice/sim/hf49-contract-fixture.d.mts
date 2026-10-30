import type { PersonAuthoring, RunSpec } from '@adam0white/human-framework';
export const MINUTE: number;
export const DAY: number;
export const START: number;
export function voiceContractSpec(seed?: number): RunSpec;
export function voiceContractPerson(id: string, name: string, sex?: 'male' | 'female'): PersonAuthoring;
